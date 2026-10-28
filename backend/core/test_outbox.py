from datetime import timedelta
from unittest.mock import patch
from django.db import transaction
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from core.models import DeliveryJob
from core.mail_outbox import submit_email, deliver, drain, queue_order


class DeliveryQueueTests(TransactionTestCase):
    @override_settings(RESEND_API_KEY='test-only')
    @patch('core.utils.mailer.send_email_resilient')
    def test_failed_send_survives_and_retries_with_same_idempotency_key(self, send):
        send.side_effect = [(False, 'Temporary failure'), (True, 'Accepted')]
        self.assertFalse(submit_email(subject='TEST', body='Body', to_emails=['owner@example.com'], attachments=[(b'%PDF', 'test.pdf')])[0])
        job = DeliveryJob.objects.get()
        self.assertEqual(job.status, 'pending')
        self.assertEqual(job.attempts, 1)
        first_key = send.call_args.kwargs['idempotency_key']
        DeliveryJob.objects.filter(pk=job.pk).update(next_attempt_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(drain(), 1)
        self.assertEqual(send.call_args.kwargs['idempotency_key'], first_key)
        self.assertEqual(send.call_args.kwargs['attachments'], [(b'%PDF', 'test.pdf')])
        job.refresh_from_db()
        self.assertEqual(job.status, 'done')
        self.assertEqual(job.payload, {})
        self.assertTrue(deliver(job.pk)[0])
        self.assertEqual(send.call_count, 2)

    @patch('core.utils.mailer.send_email_resilient')
    def test_rollback_never_sends_and_discards_queued_work(self, send):
        with self.assertRaises(ValueError), transaction.atomic():
            submit_email(subject='TEST', body='Body', to_emails=['owner@example.com'])
            raise ValueError('rollback')
        send.assert_not_called()
        self.assertFalse(DeliveryJob.objects.exists())

    @override_settings(RESEND_API_KEY='')
    @patch('core.utils.mailer.send_email_resilient', return_value=(False, 'SMTP acceptance could not be confirmed.'))
    def test_ambiguous_smtp_requires_review(self, send):
        submit_email(subject='TEST', body='Body', to_emails=['owner@example.com'])
        self.assertEqual(DeliveryJob.objects.get().status, 'review')
        self.assertEqual(drain(), 0)

    def test_order_trigger_is_deduplicated_per_payment_state(self):
        self.assertEqual(queue_order('TEST-1', 'pending'), queue_order('TEST-1', 'pending'))
        self.assertNotEqual(queue_order('TEST-1', 'pending'), queue_order('TEST-1', 'paid'))

    @patch('orders.emails._send_order_confirmation_now', side_effect=RuntimeError('temporary failure'))
    def test_order_preparation_failure_remains_pending(self, prepare):
        job_id = queue_order('TEST-1', 'pending')
        self.assertFalse(deliver(job_id)[0])
        self.assertEqual(DeliveryJob.objects.get(pk=job_id).status, 'pending')

    @patch('core.utils.mailer.send_email_resilient')
    def test_expired_delivery_requires_review_without_sending(self, send):
        job = DeliveryJob.objects.create(payload={})
        DeliveryJob.objects.filter(pk=job.pk).update(created_at=timezone.now()-timedelta(hours=24))
        self.assertFalse(deliver(job.pk)[0])
        job.refresh_from_db()
        self.assertEqual(job.status, 'review')
        send.assert_not_called()

    @patch('orders.emails._send_order_confirmation_now')
    @patch('core.utils.mailer.send_email_resilient')
    def test_partial_preparation_rolls_back_children(self, send, prepare):
        def partial(order_id):
            submit_email(subject='TEST', body='Body', to_emails=['owner@example.com'])
            raise RuntimeError('preparation interrupted')
        prepare.side_effect = partial
        job_id = queue_order('TEST-1', 'pending')
        self.assertFalse(deliver(job_id)[0])
        self.assertEqual(DeliveryJob.objects.count(), 1)
        send.assert_not_called()
