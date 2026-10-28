"""Durable delivery with bounded retries and Resend idempotency."""
import base64
import logging
import threading
from datetime import timedelta
from django.conf import settings
from django.db import transaction, close_old_connections, connection
from django.utils import timezone
from core.models import DeliveryJob

logger = logging.getLogger(__name__)


def submit_email(**kwargs):
    from core.utils.mailer import _attachments
    try:
        attachments = _attachments(kwargs.pop('attachments', None))
        kwargs['attachments'] = [[base64.b64encode(data).decode(), name] for data, name in attachments]
    except (OSError, ValueError, TypeError):
        return False, 'Invalid email attachment. Delivery was not queued.'
    defer = connection.in_atomic_block
    job = DeliveryJob.objects.create(payload=kwargs)
    # An immediate attempt preserves existing admin acceptance feedback. The
    # persistent job remains available to workers if this process is interrupted.
    if defer:
        return False, 'Email queued for delivery after commit.'
    ok, detail = deliver(job.pk)
    job.refresh_from_db(fields=['status'])
    if not ok and job.status == 'pending':
        return False, 'Email queued for automatic retry. Provider acceptance is not yet confirmed.'
    return ok, detail


def queue_order(order_id, payment_status):
    job, _ = DeliveryJob.objects.get_or_create(
        dedupe_key=f'order:{order_id}:{payment_status}',
        defaults={'kind': 'order', 'payload': {'order_id': order_id}},
    )
    return job.pk


@transaction.atomic
def deliver(job_id):
    job = DeliveryJob.objects.select_for_update().get(pk=job_id)
    if job.status == 'done':
        return True, 'Delivery already completed.'
    if job.status != 'pending' or job.next_attempt_at > timezone.now():
        return False, 'Delivery awaits retry or review.'
    if job.kind == 'email' and job.created_at < timezone.now() - timedelta(hours=23):
        job.status = 'review'
        job.last_error = 'Retry window expired; check provider history before resending.'
        job.save(update_fields=['status', 'last_error'])
        return False, job.last_error
    job.attempts += 1
    try:
        if job.kind == 'order':
            from orders.emails import _send_order_confirmation_now
            # Roll back all child jobs if preparation fails partway through.
            with transaction.atomic():
                _send_order_confirmation_now(job.payload['order_id'])
            ok, detail = True, 'Order notifications prepared.'
        else:
            from core.utils.mailer import send_email_resilient
            payload = dict(job.payload)
            payload['attachments'] = [(base64.b64decode(data), name) for data, name in payload['attachments']]
            ok, detail = send_email_resilient(**payload, idempotency_key=f'delivery-{job.pk}')
    except Exception as error:
        logger.error('Delivery job %s failed (%s).', job.pk, type(error).__name__)
        ok, detail = False, 'Delivery failed before acceptance could be verified.'
    if ok:
        job.status = 'done'
        job.completed_at = timezone.now()
        job.payload = {}  # Retain status, not customer message/PDF contents.
        job.last_error = ''
    else:
        job.last_error = detail[:500]
        # SMTP has no provider idempotency key: do not retry an uncertain send.
        ambiguous_smtp = job.kind == 'email' and not getattr(settings, 'RESEND_API_KEY', '') and 'could not be confirmed' in detail
        job.status = 'review' if ambiguous_smtp else ('failed' if job.attempts >= 8 else 'pending')
        job.next_attempt_at = timezone.now() + timedelta(seconds=min(3600, 30 * 2 ** job.attempts))
    job.save()
    return ok, detail


def drain(limit=20):
    processed = 0
    for _ in range(limit):
        # Hold a row lock while sending; another worker skips the same job.
        with transaction.atomic():
            query = DeliveryJob.objects.filter(status='pending', next_attempt_at__lte=timezone.now()).order_by('created_at')
            query = query.select_for_update(skip_locked=True) if connection.features.has_select_for_update_skip_locked else query.select_for_update()
            job = query.first()
            if job is None:
                break
            deliver(job.pk)
            processed += 1
    return processed


def start_delivery_worker():
    def run():
        while True:
            try:
                close_old_connections()
                drain()
            except Exception as error:
                logger.error('Delivery worker failed (%s).', type(error).__name__)
            finally:
                close_old_connections()
            threading.Event().wait(5)
    threading.Thread(target=run, name='delivery-outbox', daemon=True).start()
