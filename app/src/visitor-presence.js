// One small best-effort update per 30 seconds; no history, URLs or coordinates.
(() => {
 if(window.VACANCY_ANALYTICS_PREFERENCES?.disabled)return;
 let lastInput=Date.now(),timer,pending=false,node=null,stopped=false;
 const tab=crypto.randomUUID();
 const excluded=()=>window.VACANCY_ANALYTICS_PREFERENCES?.disabled||window.VACANCY_ANALYTICS?.excluded();
 const currentNode=()=>{if(location.hash.startsWith('#list/new')){const step=document.querySelector('#listingForm[data-journey-step],#existingListingForm[data-journey-step]')?.dataset.journeyStep;if(step!=null)node='step:'+step;}if(!node||!location.hash.startsWith('#list/new'))return VACANCY_ANALYTICS.route(location.pathname.startsWith('/listings/')?location.pathname:location.hash);return node};
 async function send(active=true){if(stopped||pending||excluded())return;const visitor=VACANCY_ANALYTICS.visitor();if(!visitor)return;
  pending=true;const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),5000);
  try{await VACANCY_BACKEND.recordVisitorPresence({p_visitor:visitor,p_tab:tab,p_node:currentNode(),p_active:active,p_device:/iPad|Tablet/i.test(navigator.userAgent)?'tablet':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop'},{signal:controller.signal})}catch{}finally{clearTimeout(deadline);pending=false}
 }
 const active=()=>!document.hidden&&Date.now()-lastInput<60000;
 function tick(){if(stopped)return;if(excluded()){clearTimeout(timer);return}void send(active());timer=setTimeout(tick,30000)}
 function input(){lastInput=Date.now()}
 for(const event of ['pointerdown','keydown','scroll'])window.addEventListener(event,input,{passive:true});
 window.addEventListener('vacancy:journey-step',e=>{node='step:'+e.detail;input();void send(active())});
 window.addEventListener('vacancy:page-rendered',()=>{node=null;input();void send(active())});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)input();void send(active())});
 window.addEventListener('pagehide',()=>{void send(false);stopped=true;clearTimeout(timer)});
 // Defer until the initial renderer and browser identity are ready.
 timer=setTimeout(tick,1500);
})();
