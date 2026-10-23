import json
from pathlib import Path
import requests
root=Path(__file__).resolve().parents[1]
c=json.loads((root/'.local-testing/credentials.json').read_text())
s=requests.Session();base='http://127.0.0.1:8001/api'
r=s.post(base+'/auth/login/',json={'username':c['admin_username'],'password':c['admin_password']},timeout=10);r.raise_for_status()
s.headers.update(Authorization='Bearer '+r.json()['access'],**{'X-Tenant-Slug':'sahara-gold'})
r=s.get(base+'/rates/latest/',timeout=10);assert r.headers['X-Sahara-Environment']=='local-testing';original=r.json()
fields=['rate_22k','rate_21k','rate_18k','rate_traditional']
try:
 data={k:int(original[k])+123 for k in fields}
 r=s.post(base+'/rates/',json=data,timeout=10);r.raise_for_status()
 for path in ['/public/chat/sahara-gold/','/bot-test/']:
  r=s.post(base+path,json={'message':"What are today's gold rates?"},timeout=40);r.raise_for_status();d=r.json()
  assert d.get('rates',{}).get('rate_22k')==data['rate_22k'],(path,str(d)[:300])
  print('PASS updated manual rate reaches '+path)
 r=s.patch(base+'/rates/control/',json={'mode':'auto'},timeout=30);r.raise_for_status()
 d=s.get(base+'/rates/latest/',timeout=10).json()
 print('Automatic feed status:', 'fresh' if not d.get('is_stale') else 'saved fallback; provider unavailable')
finally:
 r=s.post(base+'/rates/',json={k:original[k] for k in fields},timeout=10);r.raise_for_status()
 print('Restored local manual rates')
