import urllib.request,json,os
url=os.environ.get('MURSHID_TEST_URL','http://terminal.local:4173')+'/api/workspace'
# LOCAL DEVELOPMENT ONLY: synthetic identity headers do not authenticate through hosted dispatch.
def call(method='GET',payload=None,email=None):
 h={'Content-Type':'application/json'}
 if email:h.update({'oai-authenticated-user-id':'test-'+email,'oai-authenticated-user-email':email})
 req=urllib.request.Request(url,data=json.dumps(payload).encode() if payload else None,headers=h,method=method)
 try:
  with urllib.request.urlopen(req,timeout=20) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
assert call()[0]==401
admin='buyyourtrips@gmail.com';a='qa-a@example.com';b='qa-b@example.com'
t={'name':'QA only trip','destination':'Muscat','start':'2026-11-01','end':'2026-11-03','timezone':'Asia/Muscat','status':'confirmed','staff':'QA','contact':'','travellers':[{'name':'QA Traveller','type':'Adult'}],'services':[],'places':[],'published':False,'revision':0}
s,j=call('POST',{'action':'create','data':t},admin);assert s==200,(s,j)
id=j['id'];assert call('POST',{'action':'grant','id':id,'email':a},admin)[0]==200
assert call(email=a)[1]['bookings']==[]
assert call('POST',{'action':'save','id':id,'data':t},a)[0]==403
t['published']=True;assert call('POST',{'action':'save','id':id,'data':t},admin)[0]==200
assert len(call(email=a)[1]['bookings'])==1
assert call('POST',{'action':'support','id':id,'subject':'Help','message':'Test request'},b)[0]==403
assert call('POST',{'action':'support','id':id,'subject':'Help','message':'Test request'},a)[0]==200
j=call(email=admin)[1]['bookings'][0];assert len(j['support'])==1
assert call('POST',{'action':'resolve','id':id,'requestId':j['support'][0]['id']},admin)[0]==200
assert call('POST',{'action':'revoke','id':id,'accessId':j['access'][0]['id']},admin)[0]==200
assert call(email=a)[1]['bookings']==[]
t['end']='2026-10-01';assert call('POST',{'action':'save','id':id,'data':t},admin)[0]==400
print('PASS: anonymous denial, booking create/save, draft isolation, customer write denial, published customer access, cross-booking denial, support create/resolve, revocation, date validation')
