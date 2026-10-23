"""Exercise the isolated running API; never point this at production."""
import json
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
mail_config=ROOT/'.local-testing/mail-config.json'
if mail_config.exists() and json.loads(mail_config.read_text()).get('delivery_enabled'):
    raise SystemExit('Refusing automated dispatch checks while real email delivery is enabled. Use the mocked Django test suite instead.')
creds=json.loads((ROOT/'.local-testing/credentials.json').read_text())
BASE='http://127.0.0.1:8001/api'
http=requests.Session()
results=[]
def call(method,path,expected=200,**kwargs):
    response=http.request(method,BASE+path,timeout=30,**kwargs)
    assert response.headers.get('X-Sahara-Environment')=='local-testing', 'Not the isolated backend'
    assert response.status_code==expected, (path,response.status_code,response.text[:400])
    return response
r=call('POST','/auth/login/',json={'username':creds['admin_username'],'password':creds['admin_password']}).json()
http.headers['Authorization']='Bearer '+r['access']
http.headers['X-Tenant-Slug']='sahara-gold'
call('GET','/auth/me/');results.append('Admin login and workspace')
for _ in range(2):
    old=r['refresh'];r=call('POST','/auth/token/refresh/',json={'refresh':old}).json()
    call('POST','/auth/token/refresh/',expected=401,json={'refresh':old})
    http.headers['Authorization']='Bearer '+r['access']
results.append('Refresh rotates twice and rejects reused tokens')
original=call('GET','/storefront/content/').json()
call('PATCH','/storefront/content/',json={'hero_title':'LOCAL TEST — saved from backend'})
assert call('GET','/storefront/content/').json()['hero_title']=='LOCAL TEST — saved from backend'
call('PATCH','/storefront/content/',json={'hero_title':original['hero_title']})
call('PATCH','/storefront/content/',expected=400,json={'hero_image':'javascript:alert(1)'})
results.append('Admin content persists; script image URLs rejected')
call('PATCH','/rates/control/',json={'mode':'manual'})
rates=call('GET','/rates/latest/').json();assert rates['pricing_mode']=='manual'
products=call('GET','/products/').json();product=(products.get('results') if isinstance(products,dict) else products)[0]
call('PATCH',f"/products/{product['id']}/",json={'description':'LOCAL TEST persisted description'})
assert call('GET',f"/products/{product['id']}/").json()['description']=='LOCAL TEST persisted description'
call('PATCH',f"/products/{product['id']}/",json={'description':product['description']})
results.append('Product editing and manual rate control')
invoices=call('GET','/invoices/').json();invoices=invoices.get('results',[]) if isinstance(invoices,dict) else invoices
inv=next(x for x in invoices if x['invoice_number']=='TEST-NO-PAYMENT-DUE')
call('POST',f"/invoices/{inv['id']}/pdf/",json={})
call('POST',f"/invoices/{inv['id']}/send/",json={'email':'customer@example.com'})
assert list((ROOT/'.local-testing/emails').glob('*'))
results.append('Invoice PDF generation and captured dispatch')
http.headers.pop('Authorization');http.headers.pop('X-Tenant-Slug')
call('PATCH','/storefront/content/',expected=401,json={'hero_title':'Unauthorized'})
call('GET','/invoices/',expected=401)
customer=call('POST','/customer/auth/login/',json={'email':creds['customer_email'],'password':creds['customer_password']}).json()
http.headers['Authorization']='Bearer '+customer['access']
call('PATCH','/storefront/content/',expected=403,json={'hero_title':'Unauthorized'})
call('GET','/invoices/',expected=403)
results.append('Anonymous/customer cannot edit site or read admin invoices')
order=call('POST','/orders/',expected=201,json={'customer_name':'LOCAL TEST Customer','customer_phone':'01700000000','customer_email':creds['customer_email'],'shipping_address':'LOCAL TEST address, not for delivery','city':'Dhaka','payment_method':'cod','total':'1','items':[{'product_id':product['id'],'quantity':2}]}).json()
assert float(order['total'])>1
call('POST','/orders/',expected=400,json={'items':[{'product_id':product['id'],'quantity':-1}]})
results.append('Customer COD order; server rejects bad quantity and ignores forged total')
(ROOT/'.local-testing/check-results.json').write_text(json.dumps({'passed':results,'test_order':order['order_id']},indent=2))
print('\n'.join('PASS '+x for x in results))
