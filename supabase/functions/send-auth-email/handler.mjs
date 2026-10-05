const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notifications = {
 password_changed_notification: 'Your Vacancy password was changed',
 email_changed_notification: 'Your Vacancy email address was changed',
 phone_changed_notification: 'Your Vacancy phone number was changed',
 identity_linked_notification: 'A sign-in method was linked to your Vacancy account',
 identity_unlinked_notification: 'A sign-in method was unlinked from your Vacancy account',
 mfa_factor_enrolled_notification: 'An authenticator was added to your Vacancy account',
 mfa_factor_unenrolled_notification: 'An authenticator was removed from your Vacancy account'
};
export function buildMessages(payload, supabaseUrl) {
 const user=payload?.user, data=payload?.email_data, type=data?.email_action_type;
 if(!user || !data || (type!=='email_change' && (typeof user.email!=='string' || !user.email.includes('@')))) throw Error('Invalid email payload');
 const name=escapeHtml(String(user.user_metadata?.display_name || 'there').slice(0,80));
 const urlFor = hash => {
  if(typeof hash!=='string' || !hash) throw Error('Missing verification token');
  const url=new URL('/auth/v1/verify',supabaseUrl);
  url.searchParams.set('token',hash); url.searchParams.set('type',type);
  url.searchParams.set('redirect_to',data.redirect_to || data.site_url || 'https://getvacancy.site');
  return url.href;
 };
 const plain = (to,subject,text) => ({to:[to],from:'Vacancy <auth@getvacancy.site>',subject,text,html:'<p>'+escapeHtml(text).replace(/\n/g,'<br>')+'</p>'});
 if(type==='signup' || type==='recovery') return [{
  to:[user.email],
  template:{id:type==='signup'?'vacancy-confirm-email':'vacancy-reset-password',variables:{ACTION_URL:urlFor(data.token_hash),DISPLAY_NAME:name}}
 }];
 if(type==='email_change') {
  if(typeof user.new_email!=='string' || !user.new_email.includes('@')) throw Error('Missing new email');
  const messages=[];
  if(data.token_hash_new) {
   if(typeof user.email!=='string' || !user.email.includes('@')) throw Error('Missing current email');
   messages.push(plain(user.email,'Confirm email address change','Confirm your email address change: '+urlFor(data.token_hash_new)));
  }
  messages.push(plain(user.new_email,'Confirm email address change','Confirm your email address: '+urlFor(data.token_hash)));
  return messages;
 }
 if(type==='magiclink' || type==='invite') return [plain(user.email,type==='invite'?'You are invited to Vacancy':'Sign in to Vacancy','Continue to Vacancy: '+urlFor(data.token_hash))];
 if(type==='reauthentication') {
  if(typeof data.token!=='string' || !data.token) throw Error('Missing verification code');
  return [plain(user.email,'Confirm your Vacancy account','Your verification code is '+data.token+'. Never share this code.')];
 }
 if(notifications[type]) return [plain(user.email,notifications[type],notifications[type]+'. If you did not make this change, secure your account and contact support.')];
 throw Error('Unsupported email action');
}
export function createHandler({verify,apiKey,supabaseUrl,send=fetch}) {
 return async req => {
  if(req.method!=='POST') return new Response('Method not allowed',{status:405});
  const text=await req.text();
  if(text.length>65536) return new Response('Payload too large',{status:413});
  let payload;
  try {payload=await verify(text,Object.fromEntries(req.headers));}
  catch {return new Response('Invalid signature',{status:401});}
  let messages;
  try {messages=buildMessages(payload,supabaseUrl);}
  catch {return new Response('Invalid email action',{status:400});}
  if(!apiKey) return new Response('Email unavailable',{status:503});
  try {
   for(let i=0;i<messages.length;i++) {
    const id=req.headers.get('webhook-id');
    if(!id || id.length>180) return new Response('Invalid event ID',{status:400});
    const response=await send('https://api.resend.com/emails',{
     method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'vacancy-auth/'+id+'/'+i},
     body:JSON.stringify(messages[i]),signal:AbortSignal.timeout(4000)
    });
    if(!response.ok) return new Response('Email delivery failed',{status:502});
   }
   return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
  } catch {return new Response('Email delivery unavailable',{status:503});}
 };
}
