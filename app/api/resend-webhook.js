const crypto=require('crypto');
const ALLOWED=new Set(['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed']);

function verify(raw,headers,secret){
  if(!secret||!secret.startsWith('whsec_'))return false;
  const id=headers['svix-id'],timestamp=headers['svix-timestamp'],signature=headers['svix-signature'];
  if(!id||!timestamp||!signature||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
  const key=Buffer.from(secret.slice(6),'base64'),expected=crypto.createHmac('sha256',key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return String(signature).split(' ').some(part=>{const value=part.startsWith('v1,')?part.slice(3):'';if(!value)return false;const a=Buffer.from(value),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)});
}
function rawBody(req){if(typeof req.body==='string')return req.body;if(Buffer.isBuffer(req.body))return req.body.toString('utf8');return new Promise((resolve,reject)=>{let body='';req.setEncoding('utf8');req.on('data',chunk=>{body+=chunk;if(body.length>1_000_000)reject(new Error('Payload too large'))});req.on('end',()=>resolve(body));req.on('error',reject)})}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const raw=await rawBody(req);if(!verify(raw,req.headers,process.env.RESEND_WEBHOOK_SECRET))return res.status(400).json({error:'Invalid signature'});
    const event=JSON.parse(raw);if(!ALLOWED.has(event.type))return res.status(200).json({accepted:false});
    const recipient=Array.isArray(event.data?.to)?event.data.to[0]:event.data?.to,domain=String(recipient||'').split('@')[1]?.toLowerCase()||null;
    const payload={event_id:req.headers['svix-id'],event_type:event.type,provider_email_id:event.data?.email_id||null,recipient_domain:domain,category:event.data?.tags?.category||null,occurred_at:event.created_at||new Date().toISOString()};
    const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/email_delivery_events`,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error('Event storage failed');return res.status(200).json({accepted:true});
  }catch(error){return res.status(500).json({error:'Webhook processing failed'})}
};
module.exports.verify=verify;
