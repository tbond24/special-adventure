// Optional transport for one genuine locally captured recovery email. No hosted Auth.
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
export const testSender='Vacancy test <qa-reset@getvacancy.site>';
export function assertExternalEnvironment(env=process.env,platform=process.platform){
  assert(platform==='linux'&&env.CI==='true'&&env.VACANCY_DISPOSABLE_STACK==='1'&&env.VACANCY_EXTERNAL_RESET_EMAIL==='1'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REPOSITORY==='tbond24/special-adventure'&&env.GITHUB_REF==='refs/heads/codex/vacancy-branch-reconciliation-20261016'&&!env.DOCKER_HOST&&(!env.DOCKER_CONTEXT||env.DOCKER_CONTEXT==='default'),'External delivery requires the exact isolated manual Linux workflow; remote Docker forbidden');
}
export function assertRecoveryMessage(link,html){
  let u;try{u=new URL(link);}catch{throw Error('Invalid isolated recovery URL');}
  assert(u.origin==='http://127.0.0.1:54321'&&u.pathname==='/auth/v1/verify'&&!u.username&&!u.password&&!u.hash&&u.searchParams.get('type')==='recovery'&&u.searchParams.get('redirect_to')==='http://127.0.0.1:8778/'&&/^[a-zA-Z0-9_-]{20,256}$/.test(u.searchParams.get('token')||''),'Only the genuine isolated recovery URL is allowed');
  assert([...u.searchParams.keys()].every(k=>['token','type','redirect_to'].includes(k))&&[...u.searchParams.keys()].length===3,'Unexpected recovery URL fields');
  assert(typeof html==='string'&&html.length>0&&html.length<100000&&html.replace(/&amp;/g,'&').includes(link),'The actual captured recovery email must contain the exact verification URL');
}
export function createExternalDelivery({key,recipient,env=process.env,platform=process.platform,send=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms))}){
  assertExternalEnvironment(env,platform);
  assert(typeof key==='string'&&/^re_[a-zA-Z0-9_\-]{10,200}$/.test(key),'Test sending credential missing');
  assert(typeof recipient==='string'&&/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(recipient)&&recipient.length<254,'One protected test recipient required');
  let used=false;
  return {recipient,protect(sensitive){sensitive.add(key);sensitive.add(recipient);},async submit({link,html}){
    assertRecoveryMessage(link,html);assert(!used,'Only one external email is allowed per run');used=true;
    const nonce=randomBytes(12).toString('hex'),submittedAt=new Date().toISOString();
    let response;
    try{response=await send('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'vacancy-reset-'+nonce},body:JSON.stringify({from:testSender,to:[recipient],subject:'Vacancy isolated reset test '+nonce,html:'<p>TEST ONLY: This reset applies only to a disposable CI account. Its loopback link is exercised inside the isolated test runner. No action is needed.</p>'+html}),signal:AbortSignal.timeout(20000)});}catch{throw Error('Test email transport failed; response details withheld');}
    // Never parse/log the response: failures may echo private addresses or content.
    if(!response.ok)throw Error('Test email transport rejected; HTTP '+response.status);
    await response.body?.cancel();
    const info={nonce,submittedAt,linkSha256:createHash('sha256').update(link).digest('hex'),transport:'genuine GoTrue SMTP capture forwarded through Resend API',providerAccepted:true,gmailReceiptVerified:false,deliveryAllowanceMs:90000};
    await pause(info.deliveryAllowanceMs);return info;
  }};
}
// Consume encrypted step secrets before the runner starts any child commands.
let delivery=null;
if(process.env.VACANCY_EXTERNAL_RESET_EMAIL==='1'){
  const key=process.env.VACANCY_TEST_RESEND_KEY,recipient=process.env.VACANCY_TEST_RESET_RECIPIENT;
  delete process.env.VACANCY_TEST_RESEND_KEY;delete process.env.VACANCY_TEST_RESET_RECIPIENT;
  delivery=createExternalDelivery({key,recipient});
}
export function getExternalResetDelivery(sensitive){delivery?.protect(sensitive);return delivery;}
