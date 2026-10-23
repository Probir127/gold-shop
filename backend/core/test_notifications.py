from unittest.mock import patch
from django.test import SimpleTestCase, override_settings
from core.utils.notifications import notify_store_owner


class OwnerNotificationTests(SimpleTestCase):
    @override_settings(ADMIN_NOTIFICATION_EMAIL='saharagold19@gmail.com', STORE_EMAIL='public@example.com')
    @patch('core.utils.notifications.send_email_resilient', return_value=(True, 'Accepted'))
    def test_owner_recipient_is_independent_of_public_contact(self, send):
        attachment = [(b'%PDF-test', 'invoice.pdf')]
        self.assertTrue(notify_store_owner('Store invoice', 'Order details', attachment)[0])
        self.assertEqual(send.call_args.kwargs['to_emails'], ['saharagold19@gmail.com'])
        self.assertEqual(send.call_args.kwargs['attachments'], attachment)

    @patch('core.utils.notifications.send_email_resilient', return_value=(False, 'Provider unavailable'))
    def test_failed_delivery_is_reported(self, send):
        with self.assertLogs('core.utils.notifications', level='ERROR'):
            self.assertEqual(notify_store_owner('New order', 'Order details'), (False, 'Provider unavailable'))
