// One private invalidation channel; values always come from guarded report reads.
const groups=new Set(['accounts','listings','enquiries','messages','images','traffic','tracking','engagement','capacity','locations','journey','presence','activity','site_feed','visitor_feed','access']);
export async function subscribeAdminUpdates(backend,{onChange,onStatus,isActive}){
 let stopped=false,client,channel,timer,checking=null,joined=false;
 const valid=()=>!stopped&&isActive()&&backend.session()?.user?.id===backend.actor&&backend.assuranceLevel()==='aal2';
 const status=value=>{if(!stopped)onStatus(value)};
 function stop(){if(stopped)return;stopped=true;clearTimeout(timer);window.removeEventListener('storage',checkIdentity);window.removeEventListener('hashchange',checkIdentity);if(client){void client.removeAllChannels();client.disconnect()}}
 function denied(){status('denied');stop()}
 function checkIdentity(){if(!valid())denied()}
 async function token(){if(!valid())return null;const headers=await backend.authHeaders();if(!valid())return null;return headers.Authorization?.replace(/^Bearer /,'')||null}
 async function check(){
  if(checking)return checking;
  checking=(async()=>{if(!valid()){denied();return false}if(await backend.access()!==true){denied();return false}if(!valid()){denied();return false}return true})();
  try{return await checking}finally{checking=null}
 }
 async function maintain(){
  clearTimeout(timer);if(!valid()){denied();return}
  let delay=30000;
  try{if(!await check())return;await client.setAuth();if(!valid())return;
   if(!joined){joined=true;channel.subscribe(state=>{if(!valid())return;if(state==='SUBSCRIBED'){status('connected');onChange(['all'])}else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'||state==='CLOSED')status('reconnecting')})}
  }catch{status('reconnecting');delay=5000}
  if(valid())timer=setTimeout(maintain,delay);
 }
 try{
  status('connecting');await import('../vendor/admin-realtime.js?v=20261027-live-updates');if(!valid()){stop();return {stop,check}}
  client=new window.VACANCY_REALTIME_CLIENT(backend.url+'/realtime/v1',{params:{apikey:backend.key},accessToken:token});
  channel=client.channel('vacancy-admin-overview-v1',{config:{private:true}}).on('broadcast',{event:'changed'},message=>{
   if(!valid())return;const payload=message?.payload;
   if(payload?.schemaVersion!==1||!Array.isArray(payload.groups)||!payload.groups.length||payload.groups.length>16||payload.groups.some(g=>!groups.has(g)))return;
   onChange([...new Set(payload.groups)]);
  });
  window.addEventListener('storage',checkIdentity);window.addEventListener('hashchange',checkIdentity);void maintain();
 }catch{status('unavailable')}
 return {stop,check};
}
