"""Offline regressions for email acceptance and tenant-scoped invoice dispatch."""
import io
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from django.test import TestCase, SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import Client, Invoice, Tenant
from core.utils.mailer import send_email_resilient
from core.views.invoice_views import GeneratePDFView, SendInvoiceView
from core.views.smtp_views import SMTPDiagnosticView


@override_settings(DEFAULT_FROM_EMAIL='Sahara <invoices@example.com>', RESEND_FROM_EMAIL='Sahara <invoices@example.com>',
                   RESEND_API_KEY='', EMAIL_HOST='smtp.example.com', EMAIL_HOST_USER='sender',
                   EMAIL_HOST_PASSWORD='test-password', EMAIL_PORT=465, EMAIL_USE_SSL=True, EMAIL_USE_TLS=False)
class MailTransportTests(SimpleTestCase):
    def test_smtp_honors_configured_ssl_port_and_checks_acceptance(self):
        with patch('core.utils.mailer.EmailBackend') as backend, patch('core.utils.mailer.EmailMultiAlternatives') as message:
            message.return_value.send.return_value = 1
            ok, detail = send_email_resilient('Invoice', 'Body', 'customer@example.com')
            self.assertTrue(ok)
            self.assertIn('Accepted', detail)
            self.assertEqual(backend.call_args.kwargs['port'], 465)
            self.assertTrue(backend.call_args.kwargs['use_ssl'])
            self.assertFalse(backend.call_args.kwargs['use_tls'])
            message.return_value.send.return_value = 0
            self.assertFalse(send_email_resilient('Invoice', 'Body', 'customer@example.com')[0])

    def test_invalid_recipient_and_header_never_reach_network(self):
        with patch('core.utils.mailer.EmailBackend') as backend:
            for subject, recipient in [('Invoice', 'invalid'), ('Invoice\r\nBcc: bad@example.com', 'customer@example.com')]:
                self.assertFalse(send_email_resilient(subject, 'Body', recipient)[0])
            backend.assert_not_called()

    def test_missing_attachment_does_not_silently_send(self):
        with patch('core.utils.mailer.EmailBackend') as backend:
            self.assertFalse(send_email_resilient('Invoice', 'Body', 'customer@example.com', attachments=['/missing-invoice.pdf'])[0])
            backend.assert_not_called()

    @override_settings(RESEND_API_KEY='test-only')
    def test_resend_success_validates_id_and_encodes_attachment(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"id":"message-123"}'
        with patch('core.utils.mailer.urllib.request.urlopen', return_value=response) as network:
            self.assertTrue(send_email_resilient('Invoice', 'Body', 'customer@example.com', attachments=[(b'%PDF', 'invoice.pdf')], timeout=7)[0])
            payload = json.loads(network.call_args.args[0].data)
            self.assertEqual(payload['attachments'][0]['content'], 'JVBERg==')
            self.assertEqual(network.call_args.kwargs['timeout'], 7)

    @override_settings(RESEND_API_KEY='test-only')
    def test_resend_timeout_does_not_duplicate_via_smtp_or_expose_error(self):
        with patch('core.utils.mailer.urllib.request.urlopen', side_effect=TimeoutError('private provider detail')), patch('core.utils.mailer.EmailBackend') as smtp:
            ok, detail = send_email_resilient('Invoice', 'Body', 'customer@example.com')
            self.assertFalse(ok)
            self.assertNotIn('private provider detail', detail)
            smtp.assert_not_called()


class InvoiceDispatchTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='owner')
        self.tenant = Tenant.objects.create(name='Store', slug='store', owner=self.user)
        self.other = Tenant.objects.create(name='Other', slug='other', owner=self.user)
        self.client_record = Client.objects.create(tenant=self.tenant, name='Customer', phone='01700000000', email='customer@example.com')
        self.invoice = Invoice.objects.create(tenant=self.tenant, client=self.client_record,
                                              invoice_number='INV-REGRESSION', items=[], subtotal=100, total_amount=100, status='paid')
        self.factory = APIRequestFactory()

    def request(self, view, tenant=None, data=None):
        request = self.factory.post('/', data or {}, format='json')
        request.tenant = tenant or self.tenant
        force_authenticate(request, self.user)
        return view.as_view()(request, pk=self.invoice.pk)

    def test_other_tenant_cannot_generate_or_dispatch(self):
        with patch('core.views.invoice_views.generate_invoice_pdf') as pdf:
            for view in [GeneratePDFView, SendInvoiceView]:
                self.assertEqual(self.request(view, self.other).status_code, 404)
            pdf.assert_not_called()

    def test_failed_pdf_never_sends_invoice(self):
        with patch('core.views.invoice_views.generate_invoice_pdf', side_effect=OSError('private path')), patch('core.utils.mailer.send_email_resilient') as mail:
            response = self.request(SendInvoiceView)
            self.assertEqual(response.status_code, 503)
            self.assertNotIn('private path', str(response.data))
            mail.assert_not_called()

    def test_resending_paid_invoice_preserves_payment_state(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, 'invoice.pdf').write_bytes(b'%PDF')
            with override_settings(MEDIA_ROOT=directory), patch('core.views.invoice_views.generate_invoice_pdf', return_value='invoice.pdf'), patch('core.utils.mailer.send_email_resilient', return_value=(True, 'Accepted')), patch('core.views.invoice_views.send_document', return_value={}):
                response = self.request(SendInvoiceView)
        self.assertEqual(response.status_code, 200)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'paid')

    def test_invalid_override_email_is_rejected_before_pdf(self):
        with patch('core.views.invoice_views.generate_invoice_pdf') as pdf:
            self.assertEqual(self.request(SendInvoiceView, data={'email': 'not-email'}).status_code, 400)
            pdf.assert_not_called()


class LocalCaptureTests(SimpleTestCase):
    def test_capture_keeps_pdf_and_never_calls_provider(self):
        with tempfile.TemporaryDirectory() as folder, override_settings(LOCAL_EMAIL_CAPTURE_DIR=folder,DEFAULT_FROM_EMAIL='test@example.com',RESEND_API_KEY='must-not-be-used'), patch('core.utils.mailer.urllib.request.urlopen') as network:
            ok,detail=send_email_resilient('TEST','No payment due','customer@example.com',attachments=[(b'%PDF-test','test.pdf')])
            self.assertTrue(ok)
            self.assertIn('no email was sent',detail)
            self.assertEqual(len(list(Path(folder).glob('*'))),1)
            self.assertIn('test.pdf',next(Path(folder).glob('*')).read_text())
            network.assert_not_called()
