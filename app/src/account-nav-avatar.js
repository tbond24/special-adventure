// The existing You button stays the navigation target; its photo is decorative.
(() => {
  let cachedOwner=null,cachedUrl='',pending=null,generation=0;
  const buttons=()=>document.querySelectorAll('[data-nav="account"]');
  const owner=()=>{if(!currentUser||currentUser.is_anonymous)return null;try{const active=VACANCY_BACKEND.session();const id=JSON.parse(atob(active.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub;return id===currentUser.id?id:null}catch{return null}};
  function paint(url){
    for(const button of buttons()){
      const icon=button.querySelector('svg.nav-icon');let image=button.querySelector('.account-nav-avatar');
      if(!url){image?.remove();if(icon)icon.style.removeProperty('display');continue;}
      if(image?.getAttribute('src')===url)continue;
      image?.remove();if(icon)icon.style.removeProperty('display');
      image=document.createElement('img');image.className='account-nav-avatar';image.alt='';image.setAttribute('aria-hidden','true');
      image.style.cssText='width:24px;height:24px;border-radius:50%;object-fit:cover;display:none;flex:none';
      const imageGeneration=generation;image.onload=()=>{if(image.isConnected&&imageGeneration===generation&&owner()===cachedOwner){image.style.display='block';if(icon)icon.style.display='none'}};
      image.onerror=()=>{image.remove();if(icon)icon.style.removeProperty('display')};
      button.prepend(image);image.src=url;
    }
  }
  async function refresh(){
    const id=owner();if(!id){generation++;cachedOwner=null;cachedUrl='';pending=null;paint('');return;}
    if(cachedOwner===id){paint(cachedUrl);return;}
    paint('');if(pending?.id===id)return pending.promise;
    const version=++generation;
    const promise=VACANCY_BACKEND.profile().then(profile=>{
      if(version!==generation||owner()!==id)return;
      cachedOwner=id;cachedUrl=profile?.id===id?VACANCY_BACKEND.profileAvatarUrl(profile.avatar_path):'';paint(cachedUrl);
    }).catch(()=>{if(version===generation)paint('')}).finally(()=>{if(pending?.promise===promise)pending=null});
    pending={id,promise};return promise;
  }
  const bind=bindHeader;bindHeader=function(...args){const result=bind.apply(this,args);void refresh();return result;};
  const profile=VACANCY_BACKEND.profile;
  VACANCY_BACKEND.profile=async function(...args){const id=owner(),version=generation,result=await profile.apply(this,args);if(id&&version===generation&&owner()===id&&result?.id===id){cachedOwner=id;cachedUrl=VACANCY_BACKEND.profileAvatarUrl(result.avatar_path);paint(cachedUrl)}return result;};
  const signOut=VACANCY_BACKEND.signOut;
  VACANCY_BACKEND.signOut=async function(...args){generation++;cachedOwner=null;cachedUrl='';pending=null;paint('');return signOut.apply(this,args);};
  window.addEventListener('storage',event=>{if(event.key==='vacancy-session-v01'){generation++;cachedOwner=null;cachedUrl='';pending=null;paint('');}});
  window.VACANCY_NAV_AVATAR={refresh};
  void refresh();
})();
