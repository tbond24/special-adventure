import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertExternalEnvironment,assertRecoveryMessage,createExternalDelivery,testSender,getExternalResetDelivery} from './external-reset-email.mjs';
const env={CI:'true',VACANCY_DISPOSABLE_STACK:'1',VACANCY_EXTERNAL_RESET_EMAIL:'1',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:'tbond24/special-adventure',GITHUB_REF:'refs/heads/codex/vacancy-branch-reconciliation-20261016'};
const link='http://127.0.0.1:54321/auth/v1/verify?token='+'a'.repeat(64)+'&type=recovery&redirect_to=http%3A%2F%2F127.0.0.1%3A8778%2F';
const html='<a href="'+link.replaceAll('&','&amp;')+'">Reset</a>';
const base={env,platform:'linux',key:'re_synthetic_unit_credential',recipient:'synthetic-unit@gmail.com'};
test('ordinary CI has no external transport',()=>assert.equal(getExternalResetDelivery(new Set()),null));
test('external sending denies wrong execution boundary and remote Docker',()=>{
  assertExternalEnvironment(env,'linux');
  for(const key of Object.keys(env))assert.throws(()=>assertExternalEnvironment({...env,[key]:'incorrect'},'linux'));
  assert.throws(()=>assertExternalEnvironment(env,'win32'));
  for(const [key,value] of [['DOCKER_HOST','tcp://example.invalid'],['DOCKER_CONTEXT','remote']])assert.throws(()=>assertExternalEnvironment({...env,[key]:value},'linux'));
});
test('only exact local recovery email is accepted',()=>{
  assertRecoveryMessage(link,html);
  for(const bad of [link.replace('127.0.0.1','example.invalid'),link.replace('recovery','signup'),link.replace('8778','9999'),link+'&extra=x',link+'&token=duplicate',link+'#x',link.replace('/verify','/other')])assert.throws(()=>assertRecoveryMessage(bad,html));
  assert.throws(()=>assertRecoveryMessage(link,'no captured message'));
});
test('one recipient, genuine HTML, fixed API and one attempt; safe digest evidence',async()=>{
  let calls=0;
  const d=createExternalDelivery({...base,send:async(url,options)=>{
    calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');
    const body=JSON.parse(options.body);assert.equal(body.from,testSender);assert.deepEqual(body.to,[base.recipient]);assert(body.html.endsWith(html));assert(!body.cc&&!body.bcc);return {ok:true};
  },pause:async ms=>assert.equal(ms,90000)});
  const sensitive=new Set();d.protect(sensitive);assert(sensitive.has(base.key)&&sensitive.has(base.recipient));
  const info=await d.submit({link,html});assert.equal(info.linkSha256,createHash('sha256').update(link).digest('hex'));
  assert(!JSON.stringify(info).includes(base.key)&&!JSON.stringify(info).includes(base.recipient)&&!JSON.stringify(info).includes(link));
  await assert.rejects(d.submit({link,html}),/Only one/);assert.equal(calls,1);
});
test('transport failure is sanitized and never retried',async()=>{
  for(const send of [async()=>{throw Error('private data');},async()=>({ok:false,status:403})]){
    const d=createExternalDelivery({...base,send});
    await assert.rejects(d.submit({link,html}),e=>/transport/.test(e.message)&&!e.message.includes('private data'));
    await assert.rejects(d.submit({link,html}),/Only one/);
  }
  for(const recipient of ['a@gmail.com,b@gmail.com','a@example.invalid','a@gmail.com\nb@gmail.com'])assert.throws(()=>createExternalDelivery({...base,recipient}));
});
