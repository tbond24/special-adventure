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
