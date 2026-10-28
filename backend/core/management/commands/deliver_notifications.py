from django.core.management.base import BaseCommand
from core.mail_outbox import drain


class Command(BaseCommand):
    help = 'Process up to 20 due notification jobs; safe alongside Gunicorn workers.'

    def handle(self, *args, **options):
        self.stdout.write(f'Processed {drain()} due delivery jobs.')
