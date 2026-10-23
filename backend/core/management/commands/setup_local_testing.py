"""Create repeatable local-only accounts and clearly labelled test records."""
import json
import secrets
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import Tenant, TenantMembership, Client, Invoice
from products.models import Category, Product
from rates.models import GoldRate, RateControl
class Command(BaseCommand):
    help = 'Prepare isolated local testing without touching production.'
    def handle(self, *args, **options):
        if settings.SETTINGS_MODULE != 'sahara_gold.local_testing':
            raise CommandError('Use --settings=sahara_gold.local_testing only.')
        credentials_file = settings.LOCAL_STATE / 'credentials.json'
        if credentials_file.exists():
            credentials = json.loads(credentials_file.read_text())
        else:
            credentials = {'admin_username':'local-owner','admin_password':secrets.token_urlsafe(20),'customer_email':'customer@example.com','customer_password':secrets.token_urlsafe(20)}
            credentials_file.write_text(json.dumps(credentials,indent=2))
            credentials_file.chmod(0o600)
        owner, created = User.objects.get_or_create(username=credentials['admin_username'],defaults={'email':'owner@example.com','is_staff':True,'is_superuser':True})
        if created:
            owner.set_password(credentials['admin_password']); owner.save()
        customer, created = User.objects.get_or_create(username='01700000000',defaults={'email':credentials['customer_email'],'first_name':'Local Test Customer'})
        if created:
            customer.set_password(credentials['customer_password']);customer.save()
        tenant,_ = Tenant.objects.get_or_create(slug='sahara-gold',defaults={'name':'Sahara Local Test','business_name':'Sahara TEST — no payment due','owner':owner,'contact_email':'owner@example.com','address':'LOCAL TEST — no real sale'})
        TenantMembership.objects.get_or_create(tenant=tenant,user=owner,defaults={'role':'admin'})
        cat,_ = Category.objects.get_or_create(slug='local-test',defaults={'name':'LOCAL TEST','tenant':tenant})
        Product.objects.get_or_create(name='LOCAL TEST — practice piece',tenant=tenant,defaults={'category':cat,'weight':'2.00','purity':'22K','description':'Local test record. Edit this description, weight, photograph and making charge in admin. Not offered for sale.','making_charge_per_gram':500})
        if not GoldRate.objects.exists():
            GoldRate.objects.create(date=timezone.localdate(),rate_22k=15000,rate_21k=14000,rate_18k=12000,rate_traditional=10000)
        RateControl.objects.get_or_create(pk=1,defaults={'mode':'manual'})
        client,_ = Client.objects.get_or_create(tenant=tenant,email='customer@example.com',defaults={'name':'LOCAL TEST Customer','phone':''})
        Invoice.objects.get_or_create(invoice_number='TEST-NO-PAYMENT-DUE',defaults={'tenant':tenant,'client':client,'items':[{'name':'TEST — no payment due','quantity':1,'price':0,'item_total':0}],'subtotal':0,'total_amount':0,'notes':'TEST ONLY. No sale occurred. No payment is due.'})
        login = settings.LOCAL_STATE / 'LOGIN.md'
        login.write_text('# Local testing only\n\nAdmin: http://127.0.0.1:5175/admin/login\n\nUsername: '+credentials['admin_username']+'\n\nPassword: '+credentials['admin_password']+'\n\nCustomer: http://127.0.0.1:5175/account\n\nEmail: '+credentials['customer_email']+'\n\nPassword: '+credentials['customer_password']+'\n\nCaptured email: .local-testing/emails/\nThese are local-only credentials, not your production account.\n')
        login.chmod(0o600)
        self.stdout.write(self.style.SUCCESS('Local accounts ready. Credentials saved privately in .local-testing/LOGIN.md'))
