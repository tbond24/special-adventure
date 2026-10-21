// Bounded best-effort telemetry. Product actions never await this queue.
(() => {
 const route=value=>{value=String(value||'');return ['find','listing','list','create','auth','other'].includes(value)?value:/^(\/listings\/|#detail)/.test(value)?'listing':/^#list\/new/.test(value)?'create':/^#list/.test(value)?'list':/^#auth/.test(value)?'auth':/^(\/?|#home|#find)$/.test(value)?'find':'other'};
 const actor=()=>typeof currentUser==='undefined'?null:currentUser?.id||null;
 const excluded=()=>window.VACANCY_ANALYTICS_PREFERENCES?.disabled===true||/^#admin(?:$|\/)/.test(location.hash)||/(bot|spider|crawler|slurp)/i.test(navigator.userAgent||'');
 // Identity belongs to this browser/session, never to its current account.
 const read=(kind,key)=>{try{return JSON.parse(window[kind].getItem(key)||'null')}catch{return null}};
 const write=(kind,key,value)=>{try{window[kind].setItem(key,JSON.stringify(value))}catch{}};
 const validId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
 let browserMemory=null,sessionMemory=null;
 function visitor(){
  if(excluded())return null;
  const now=Date.now();let browser=read('localStorage','vacancy-connected-visitor')||browserMemory;
  if(!validId(browser?.id)||!Number.isFinite(browser.at)||now-browser.at>=90*864e5)browser={id:crypto.randomUUID(),at:now};
  browserMemory=browser;write('localStorage','vacancy-connected-visitor',browser);return browser.id;
 }
 function identity(acquisition={},announce=false){
  const browser=visitor();if(!browser)return null;
  const now=Date.now();
  let session=read('sessionStorage','vacancy-connected-session')||sessionMemory;
  if(!validId(session?.id)||!Number.isFinite(session.lastSeen)||now-session.lastSeen>=1800000)session={id:crypto.randomUUID(),acquisition,lastSeen:now,announced:false};
  if(!session.acquisition||!Object.keys(session.acquisition).length)session.acquisition=acquisition;
  const newSession=session.announced===false;
  if(announce)session.announced=true;
  session.lastSeen=now;sessionMemory=session;write('sessionStorage','vacancy-connected-session',session);
  return {visitor_id:browser,session_id:session.id,acquisition:session.acquisition,newSession};
 }
 function queue(send,{bindActor=true}={}){
  const owner=()=>bindActor?actor():null;
  let items=[],timer=null,job=null,failures=0,dropped=0;
  const bytes=e=>new TextEncoder().encode(JSON.stringify(e)).length;
  function push(event){
   try{if(excluded()||items.length>=100||bytes(event)>29000){dropped++;return null;}items.push({event,actor:owner()});if(!timer)timer=setTimeout(flush,600);return event.event_id;}catch{dropped++;return null;}
  }
  function flush(){
   clearTimeout(timer);timer=null;if(job)return job;
   const current=owner(),before=items.length;items=items.filter(x=>x.actor===current);dropped+=before-items.length;
   if(excluded()){dropped+=items.length;items=[];return Promise.resolve();}
   const batch=[];let size=2;
   for(const item of items.slice(0,20)){const n=bytes(item.event)+1;if(size+n>30000)break;batch.push(item);size+=n;}
   if(!batch.length)return Promise.resolve();
   const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),15000);
   const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('Telemetry timed out')),{once:true}));
   job=(async()=>{try{await Promise.race([send(batch.map(x=>x.event),{signal:controller.signal}),aborted]);items=items.filter(x=>!batch.includes(x));failures=0;}
    catch{failures++;if(failures>=3){items=items.filter(x=>!batch.includes(x));dropped+=batch.length;failures=0;}}
    finally{clearTimeout(deadline);job=null;if(items.length)timer=setTimeout(flush,failures?5000:600);}
   })();return job;
  }
  return {push,flush,stats:()=>({queued:items.length,dropped,pending:!!job})};
 }
 window.VACANCY_ANALYTICS=Object.freeze({queue,route,excluded,identity,visitor});
})();
