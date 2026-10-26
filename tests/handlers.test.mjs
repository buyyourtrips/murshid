// Exercise actual API handlers with in-memory D1/R2 adapters, never production data.
import { registerHooks } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import assert from 'node:assert/strict';
let currentUser=null;
globalThis.__murshidHeaders=()=>new Headers(currentUser?{'oai-authenticated-user-id':currentUser,'oai-authenticated-user-email':currentUser}:{});
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
const bucket=new Map();
globalThis.__murshidEnv={DB:{prepare(query){let args=[];return {bind(...values){args=values;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){sql.prepare(query).run(...args);return {success:true}}}}},BUCKET:{async put(k,v){bucket.set(k,new Uint8Array(v))},async get(k){return bucket.has(k)?{body:bucket.get(k)}:null},async delete(k){bucket.delete(k)}}};
registerHooks({resolve(specifier,context,next){if(['cloudflare:workers','next/headers','next/navigation'].includes(specifier))return {url:'mock:'+specifier,shortCircuit:true};try{return next(specifier,context)}catch(e){if(specifier.startsWith('.')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);throw e}},load(url,context,next){if(url==='mock:cloudflare:workers')return {format:'module',source:'export const env=globalThis.__murshidEnv;',shortCircuit:true};if(url==='mock:next/headers')return {format:'module',source:'export const headers=async()=>globalThis.__murshidHeaders();',shortCircuit:true};if(url==='mock:next/navigation')return {format:'module',source:'export const redirect=()=>{throw new Error("REDIRECT")};',shortCircuit:true};if(url.endsWith('.ts'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context)}});
const api=await import('../app/api/workspace/route.ts');
const download=await import('../app/api/documents/[id]/route.ts');
const admin='buyyourtrips@gmail.com',alice='alice@example.test',bob='bob@example.test';
async function get(user){currentUser=user;const r=await api.GET();return [r.status,await r.json()]}
async function post(user,payload){currentUser=user;const r=await api.POST(new Request('https://murshid.test/api/workspace',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://murshid.test'},body:JSON.stringify(payload)}));return [r.status,await r.json()]}
const trip={name:'Synthetic QA journey',destination:'Muscat',start:'2026-11-01',end:'2026-11-03',timezone:'Asia/Muscat',status:'confirmed',staff:'QA coordinator',contact:'',travellers:[{name:'QA Guest',type:'Adult'}],services:[],places:[],published:false,revision:0};
assert.equal((await get(null))[0],401);
assert.equal((await post(alice,{action:'create',data:trip}))[0],403);
const [created,booking]=await post(admin,{action:'create',data:trip});assert.equal(created,200);const id=booking.id;
assert.equal((await post(admin,{action:'grant',id,email:alice}))[0],200);
assert.equal((await get(alice))[1].bookings.length,0,'draft must be hidden');
assert.equal((await post(alice,{action:'support',id,subject:'Help',message:'Draft request'}))[0],403);
assert.equal((await post(admin,{action:'save',id,data:{...trip,published:true}}))[0],200);
assert.equal((await get(alice))[1].bookings.length,1);
assert.equal((await get(bob))[1].bookings.length,0);
assert.equal((await post(alice,{action:'save',id,data:trip}))[0],403);
assert.equal((await post(bob,{action:'support',id,subject:'Help',message:'Unauthorized'}))[0],403);
assert.equal((await post(alice,{action:'support',id,subject:'Pickup',message:'Please confirm meeting point.'}))[0],200);
let b=(await get(admin))[1].bookings[0];assert.equal(b.support.length,1);
assert.equal((await post(bob,{action:'reply',id,requestId:b.support[0].id,message:'Wrong user'}))[0],403);
assert.equal((await post(admin,{action:'reply',id,requestId:b.support[0].id,message:'Your driver will meet you at arrivals.'}))[0],200);
assert.equal((await post(alice,{action:'reply',id,requestId:b.support[0].id,message:'Thank you.'}))[0],200);
assert.equal((await get(alice))[1].bookings[0].support[0].messages.length,2);
assert.equal((await post(alice,{action:'resolve',id,requestId:b.support[0].id}))[0],403);
assert.equal((await post(admin,{action:'resolve',id,requestId:b.support[0].id}))[0],200);
async function upload(visibility,type='application/pdf',bytes='%PDF-1.4\nQA'){currentUser=admin;const f=new FormData();f.set('bookingId',id);f.set('visibility',visibility);f.set('file',new File([bytes],'qa.pdf',{type}));return api.POST(new Request('https://murshid.test/api/workspace',{method:'POST',body:f}))}
assert.equal((await upload('staff')).status,200);assert.equal((await upload('customer')).status,200);
b=(await get(admin))[1].bookings[0];assert.equal(b.documents.length,2);assert.equal((await get(alice))[1].bookings[0].documents.length,1);
const staffDoc=b.documents.find(d=>d.visibility==='staff'),customerDoc=b.documents.find(d=>d.visibility==='customer');
async function file(user,doc){currentUser=user;return download.GET(new Request('https://murshid.test/api/documents/'+doc),{params:Promise.resolve({id:doc})})}
assert.equal((await file(alice,staffDoc.id)).status,403);assert.equal((await file(bob,customerDoc.id)).status,403);assert.equal((await file(alice,customerDoc.id)).status,200);
assert.equal((await upload('staff','text/html','<html>bad</html>')).status,400);
assert.equal((await upload('staff','application/pdf','Not really a PDF')).status,400);
assert.equal((await post(admin,{action:'grant',id,email:alice}))[0],200);
assert.equal((await get(admin))[1].bookings[0].access.length,1,'repeat grants must not create duplicate active access');
assert.equal((await post(admin,{action:'save',id,data:{...trip,start:'2026-02-30'}}))[0],400);
assert.equal((await post(admin,{action:'save',id,data:{...trip,end:'2026-10-01'}}))[0],400);
assert.equal((await post(admin,{action:'save',id,data:{...trip,timezone:'Invalid/Zone'}}))[0],400);
assert.equal((await post(admin,{action:'revoke',id,accessId:b.access[0].id}))[0],200);
assert.equal((await get(alice))[1].bookings.length,0);assert.equal((await file(alice,customerDoc.id)).status,403);
assert.equal((await post(admin,{action:'deleteDocument',id,documentId:customerDoc.id}))[0],200);assert.equal(bucket.has(customerDoc.id),false);
currentUser=admin;assert.equal((await api.POST(new Request('https://murshid.test/api/workspace',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:JSON.stringify({action:'create',data:trip})}))).status,403);
console.log('PASS: API booking lifecycle, draft isolation, role denial, cross-booking access, support resolution, private file upload/download, visibility filtering, revocation, invalid inputs, cross-origin write denial.');
