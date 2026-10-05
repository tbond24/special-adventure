// Synthetic, explicitly allowlisted hosted target only. Never accepts a production URL.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.resolve(__dirname,'../../../marketing-checkpoint-artifacts/hosted');
const config=JSON.parse(fs.readFileSync(path.join(out,'public-config.json')));
const credentials=JSON.parse(fs.readFileSync(path.join(out,'test-credentials.json')));
if(config.url!=='https://raauicmfyjpcuhfzknak.supabase.co'||credentials.project!=='raauicmfyjpcuhfzknak')throw Error('Unapproved test target');
const results=[];
function check(ok,label,detail={}){results.push({label,status:ok?'PASS':'FAIL',...detail});console.log((ok?'PASS ':'FAIL ')+label);if(!ok)throw Error(label);}
async function request(endpoint,body,token,method='POST'){
  const response=await fetch(config.url+endpoint,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{data={message:text}}return{status:response.status,data};
}
const connected=process.argv.includes('--connected');
const report=token=>request('/rest/v1/rpc/'+(connected?'admin_connected_journeys':'admin_lister_marketing'),{p_from:'2026-10-01T00:00:00Z',p_to:'2026-10-06T00:00:00Z'},token);
function code(secret,at=Date.now()){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secret.replace(/=+$/,''))bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');
 const key=Buffer.from((bits.match(/.{8}/g)||[]).map(b=>parseInt(b,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(at/30000)));
 const digest=crypto.createHmac('sha1',key).update(counter).digest(),offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
async function main(){
 const anonymous=await report();check([401,403].includes(anonymous.status),'Anonymous report denied',{http:anonymous.status});
 const invalid=await report('invalid.jwt.value');check(invalid.status===401,'Invalid token rejected',{http:invalid.status});
 for(const user of credentials.users){
  const login=await request('/auth/v1/token?grant_type=password',{email:user.email,password:credentials.password});
  check(login.status===200&&!!login.data.access_token,(user.admin?'Admin':'Member')+' real password login',{http:login.status});
  let token=login.data.access_token;
  const low=await report(token);check(low.status===403,(user.admin?'Admin':'Member')+' AAL1 report denied',{http:low.status});
  const enrolled=await request('/auth/v1/factors',{factor_type:'totp',friendly_name:'Synthetic verification '+Date.now()},token);
  check(enrolled.status===200&&!!enrolled.data.totp?.secret,'TOTP enrollment for '+(user.admin?'admin':'member'),{http:enrolled.status});
  const factor=enrolled.data.id,secret=enrolled.data.totp.secret;
  const challenge=await request('/auth/v1/factors/'+factor+'/challenge',{},token);
  check(challenge.status===200,'MFA challenge issued');
  const verified=await request('/auth/v1/factors/'+factor+'/verify',{challenge_id:challenge.data.id,code:code(secret)},token);
  check(verified.status===200&&!!verified.data.access_token,'Correct TOTP verified',{http:verified.status});
  token=verified.data.access_token;
  const claim=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
  check(claim.aal==='aal2','Hosted token contains AAL2');
  const result=await report(token);
  if(user.admin){
    check(result.status===200&&(connected?result.data.schemaVersion===2:Array.isArray(result.data.events)&&Array.isArray(result.data.publications)),'Admin AAL2 report allowed',{http:result.status});
    const key=connected?'generatedAt':'generated_at';
    check(!!result.data[key]&&Math.abs(Date.now()-Date.parse(result.data[key]))<60000,'Server-generated timestamp is current');
    const second=await report(token);check(second.data[key]!==result.data[key],'Server timestamp changes on next request');
    check(connected?result.data.total===0&&result.data.listings===0:result.data.events.length===0&&result.data.publications.length===0,'Empty synthetic database returns genuine zero counts');
  }else check(result.status===403,'Authenticated non-admin AAL2 denied',{http:result.status});
  const refresh=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:verified.data.refresh_token});
  check(refresh.status===200&&!!refresh.data.access_token,'Hosted session refresh');
  token=refresh.data.access_token;
  const removed=await request('/auth/v1/factors/'+factor,undefined,token,'DELETE');check(removed.status===200,'Remove synthetic MFA factor');
  const logout=await request('/auth/v1/logout',{},token);check(logout.status===204,'Hosted logout accepted');
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>fs.writeFileSync(path.join(out,connected?'connected-auth-results.json':'auth-results.json'),JSON.stringify({at:new Date().toISOString(),project:credentials.project,results,limitations:['Preconfirmed synthetic identities: email delivery not tested.','HTTP Auth/MFA/RPC exercised; full browser login flow still requires verification.','No production configuration or customer data tested.']},null,2)));
