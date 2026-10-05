const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const id='00000000-0000-4000-8000-000000000099';
const code=fs.readFileSync(path.resolve('app/api/listing-page.js'),'utf8');
async function invoke(rows,{bad=false,key=id}={}){
 let calls=0;const box={module:{exports:{}},require,__dirname:path.resolve('app/api'),URLSearchParams,Date,AbortSignal,console:{error(){}},fetch:async()=>{calls++;return {ok:!bad,status:503,json:async()=>rows}}};vm.runInNewContext(code,box);
 const out={headers:{}};await box.module.exports({query:{id:key}},{setHeader(k,v){out.headers[k]=v},status(n){out.status=n;return this},end(s){out.html=s}});return {...out,calls};
}
test('invalid ID returns branded 404 without querying database',async()=>{const r=await invoke([],{key:'<script>'});assert.equal(r.status,404);assert.equal(r.calls,0);assert.match(r.html,/Back to Find/);assert.doesNotMatch(r.html,/<script>/)});
test('missing and expired listings return 404 and recovery link',async()=>{for(const rows of [[],[{expires_at:'2000-01-01'}]]){const r=await invoke(rows);assert.equal(r.status,404);assert.match(r.html,/href="\/#home"/);assert.equal(r.headers['Cache-Control'],'no-store');assert.doesNotMatch(r.html,/>Retry</)}});
test('temporary upstream failure returns 502 with safe retry and find links',async()=>{const r=await invoke([],{bad:true});assert.equal(r.status,502);assert.match(r.html,new RegExp('href="/listings/'+id+'"'));assert.match(r.html,/>Retry</);assert.match(r.html,/Back to Find/)});
test('valid listing still returns HTML and canonical metadata',async()=>{const r=await invoke([{rent_amount:15000,rent_currency:'KES',rent_period:'month',rooms:{unit_type:'Studio',description:'Test <description>',media:[],properties:{suburb:'South C',city:'Nairobi',country:'Kenya'}}}]);assert.equal(r.status,200);assert.match(r.html,/rel="canonical"/);assert.match(r.html,/Test &lt;description&gt;/);assert.match(r.html,/KES 15,000/)});
