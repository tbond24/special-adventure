// Commit requested pages to the screen only after their current renderers finish.
// Data-driven refreshes stay in place; obsolete loading layouts are not exposed.
(() => {
 let generation=0,active=null;
 for(const name of ['renderHome','renderAccount','renderMessages']){
  const original=window[name];
  window[name]=function(...args){
   const key=location.pathname+location.hash;
   if(active?.key===key&&active.name===name)return active.promise;
   const token=++generation,first=window.__vacancyPaintedPage!==key,main=document.querySelector('#app');
   let loading;
   if(first){main?.setAttribute('data-page-pending','');loading=document.createElement('section');loading.className='loading-screen current-page-loading';loading.setAttribute('role','status');loading.setAttribute('aria-label','Loading page');loading.innerHTML='<span class="loading-logo-stack" role="img" aria-label="Vacancy"><img class="loading-logo" src="assets/vacancy-logo.png" alt=""></span><div class="loading-line"><i></i></div>';document.body.append(loading);}
   const promise=(async()=>{
    try{
     if(name==='renderHome'&&typeof visitorCountryPromise!=='undefined')await visitorCountryPromise;
     if(location.pathname+location.hash!==key)return;
     const result=await original.apply(this,args);
     await new Promise(resolve=>requestAnimationFrame(resolve));
     if(location.pathname+location.hash===key)window.__vacancyPaintedPage=key;
     return result;
    }finally{loading?.remove();if(token===generation){main?.removeAttribute('data-page-pending');active=null;}}
   })();active={key,name,promise};return promise;
  };
 }
 addEventListener('hashchange',()=>{if(active&&active.key!==location.pathname+location.hash){generation++;active=null;document.querySelector('#app')?.removeAttribute('data-page-pending');document.querySelectorAll('.current-page-loading').forEach(node=>node.remove());}});
})();

// Scroll belongs to a history entry, not to an individual layout/data refresh.
// Native restoration runs before our async pages finish, so restore only once
// their final renderer settles. New entries start at the top; Back/Forward keep
// their own position, including repeated visits to the same route.
(() => {
 const stateKey='vacancyPageScroll',positions=new Map();
 const url=()=>location.pathname+location.search+location.hash;
 const replace=history.replaceState.bind(history),push=history.pushState.bind(history);
 let current=null,pending=null,renderedId=null,renderedUrl=null,saveTimer;
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 const metadata=()=>history.state?.[stateKey];
 const withState=(state,entry)=>({...state,[stateKey]:{...entry}});
 function remember(){
  if(!current||pending||current.url!==url())return;
  current.x=window.scrollX;current.y=window.scrollY;
  positions.set(current.id,{...current});
 }
 function save(){
  clearTimeout(saveTimer);remember();
  if(current&&current.url===url())replace(withState(history.state,current),'');
 }
 function entryForRoute(){
  const saved=metadata();
  if(saved?.url===url()&&saved.id)return {...(positions.get(saved.id)||saved)};
  return {id:crypto.randomUUID(),url:url(),x:0,y:0};
 }
 addEventListener('scroll',()=>{
  remember();clearTimeout(saveTimer);saveTimer=setTimeout(save,150);
 },{passive:true});
 // Capture before the URL changes, including keyboard-activated hash links.
 document.addEventListener('click',save,true);
 addEventListener('pagehide',save);
 const beforeNav=nav;
 nav=function(...args){save();return beforeNav.apply(this,args)};
 history.pushState=function(state,title,target){
  save();
  const destination=new URL(target||location.href,location.href);
  const next={id:crypto.randomUUID(),url:destination.pathname+destination.search+destination.hash,x:0,y:0};
  const result=push(withState(state,next),title,target);
  current=next;positions.set(current.id,{...current});pending=null;
  return result;
 };
 // Do not pull the user away after they have started interacting with the new
 // page. Listing step controls, field validation and in-page anchors own their
 // focus and scroll; no mutation observer or periodic reset is involved.
 function cancel(){if(pending){pending=null;remember()}}
 for(const event of ['wheel','touchstart','pointerdown','keydown'])addEventListener(event,cancel,{passive:true});
 const beforeRender=render;
 render=function(...args){
  const next=entryForRoute(),changed=renderedId!==next.id||renderedUrl!==next.url;
  if(!changed)return beforeRender.apply(this,args);
  renderedId=next.id;renderedUrl=next.url;
  current=next;positions.set(current.id,{...current});
  replace(withState(history.state,current),'');
  const request={id:current.id,url:current.url,x:current.x,y:current.y};pending=request;
  let result;
  try{result=beforeRender.apply(this,args)}catch(error){if(pending===request)pending=null;throw error}
  return Promise.resolve(result).then(value=>new Promise(resolve=>{
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(pending===request&&url()===request.url&&metadata()?.id===request.id){
     pending=null;
     const focused=document.activeElement;
     if(!focused?.matches('input,textarea,select,[contenteditable="true"]'))window.scrollTo({left:request.x,top:request.y,behavior:'instant'});
     save();
    }
    resolve(value);
   }));
  }),error=>{if(pending===request)pending=null;throw error});
 };
})();
