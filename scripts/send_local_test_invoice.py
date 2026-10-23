"""One explicitly authorized real delivery; all invoice data remains local."""
import os,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
os.environ['DJANGO_SETTINGS_MODULE']='sahara_gold.local_testing'
import django
django.setup()
from django.conf import settings
from django.test import override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from core.models import Invoice
from core.views.invoice_views import SendInvoiceView
receipt=ROOT/'.local-testing/real-mail-result.json'
if receipt.exists():
    raise SystemExit('A real-send attempt is already recorded. Check its result before any retry.')
config=json.loads((ROOT/'.local-testing/mail-config.json').read_text())
invoice=Invoice.objects.get(invoice_number='TEST-NO-PAYMENT-DUE')
assert invoice.total_amount == 0 and 'no payment' in invoice.notes.lower()
assert not invoice.client.phone
request=APIRequestFactory().post('/',{'email':'sohom5102@gmail.com'},format='json')
request.tenant=invoice.tenant
force_authenticate(request,User.objects.get(username='local-owner'))
receipt.write_text(json.dumps({'status':'attempting','recipient':'sohom5102@gmail.com'}))
with override_settings(LOCAL_EMAIL_CAPTURE_DIR=None,**config):
    response=SendInvoiceView.as_view()(request,pk=invoice.pk)
result={'http_status':response.status_code,'recipient':'sohom5102@gmail.com','result':response.data}
receipt.write_text(json.dumps(result,indent=2,default=str))
print(json.dumps(result,default=str))
