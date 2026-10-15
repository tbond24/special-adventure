import {createHmac} from 'node:crypto';
export const ROOT='https://raauicmfyjpcuhfzknak.supabase.co';
export const ELEMENT='listing-detail/save-button';
export const check=(ok,label)=>{if(!ok)throw Error(label);};
export const claims=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
export function totp(secret,when=Date.now(),digits=6){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0;const bytes=[];
  for(const ch of secret.replace(/=+$/,'').toUpperCase()){
    const digit=alphabet.indexOf(ch);check(digit>=0,'Invalid base32 secret');
    value=(value<<5)|digit;bits+=5;
    if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}
  }
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(when/30000)));
  const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();
  return String((digest.readUInt32BE(digest.at(-1)&15)&0x7fffffff)%10**digits).padStart(digits,'0');
}
export function api(key){
  check(typeof key==='string'&&key.length>20,'Test API key unavailable');
  return async(path,{token,body,method='POST'}={})=>{
    check(/^(auth|rest)\/v1\//.test(path)&&!path.includes('..'),'Unexpected API path');
    const started=performance.now();
    let response;
    try{response=await fetch(ROOT+'/'+path,{method,headers:{apikey:key,
      'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});}
    catch{throw Error('Transport failed: '+method+' '+path.split('?')[0]);}
    let data;try{data=await response.json()}catch{data=null}
    return {ok:response.ok,status:response.status,data,elapsedMs:Math.round(performance.now()-started)};
  };
}
export async function realMfa(request,actor){
  const enrolled=await request('auth/v1/factors',{token:actor.session.access_token,
    body:{factor_type:'totp',friendly_name:'Isolated Vacancy QA'}});
  check(enrolled.ok&&enrolled.data?.totp?.secret,'TOTP enrollment '+actor.role);
  const factor=enrolled.data;
  const challenged=await request(`auth/v1/factors/${factor.id}/challenge`,{
    token:actor.session.access_token,body:{}});
  check(challenged.ok&&challenged.data?.id,'TOTP challenge '+actor.role);
  // One current code, no speculative previous/next-window failures.
  const verified=await request(`auth/v1/factors/${factor.id}/verify`,{
    token:actor.session.access_token,body:{challenge_id:challenged.data.id,code:totp(factor.totp.secret)}});
  check(verified.ok&&claims(verified.data.access_token).aal==='aal2','Real AAL2 '+actor.role);
  actor.session=verified.data;
  const authenticated=await request('auth/v1/user',{token:actor.session.access_token,method:'GET'});
  check(authenticated.ok&&authenticated.data.id===actor.id,'Auth validates AAL2 '+actor.role);
}
