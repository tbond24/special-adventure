// List opens the chooser until a draft/listing has actually been saved.
// History is owner-scoped; visiting an editor never establishes history.
(() => {
  const memory=new Set(),beforeList=renderList;let generation=0;
  const owner=()=>currentUser&&!currentUser.is_anonymous?currentUser.id:null;
  const key=id=>id?'vacancy-list-entry-account-v1:'+id:'vacancy-list-entry-guest-v1';
  function known(id){try{return memory.has(key(id))||localStorage.getItem(key(id))==='1';}catch{return memory.has(key(id));}}
  function remember(id){if(owner()!==id)return;memory.add(key(id));try{localStorage.setItem(key(id),'1');}catch{/* The durable draft remains authoritative if preferences cannot be stored. */}}
  function meaningful(data,media){return Boolean(data?.shared?.address?.trim()||data?.shared?.propertyTitle?.trim()||data?.shared?.city?.trim()||data?.shared?.locality?.trim()||data?.units?.some(unit=>unit.rentAmount||unit.description?.trim()||unit._privateName?.trim())||media?.some(row=>row.files?.length));}
  window.VACANCY_LIST_ENTRY={
    meaningful,
    guestSaved(data,media,{explicit=false}={}){if(!owner()&&(explicit||meaningful(data,media)))remember(null);},
    accountSaved(id){if(id&&owner()===id)remember(id);}
  };
  renderList=async function(...args){
    const route=parseHash();if(route.name!=='list'||route.id==='new')return beforeList.apply(this,args);
    // A completed create form must not keep the landing/dashboard navigation
    // hidden while history loads or the guest renderer takes over.
    document.querySelector('#app')?.classList.remove('listing-composing');
    const id=owner(),anonymousId=currentUser?.is_anonymous?currentUser.id:null,token=++generation;
    const current=()=>token===generation&&parseHash().name==='list'&&parseHash().id!=='new'&&owner()===id&&(currentUser?.is_anonymous?currentUser.id:null)===anonymousId;
    if(known(id))return beforeList.apply(this,args);
    layout('<section><div class="empty" role="status">Loading your listings…</div></section>');
    try{
      let created;
      if(id){
        created=await VACANCY_ACCOUNT_DRAFT.hasHistory(id);if(!current())return;
        if(!created){const listings=await VACANCY_BACKEND.myVacancies();if(!current())return;if(!Array.isArray(listings))throw new Error('Listing history could not be verified.');created=listings.length>0;}
      }else{const draft=await VACANCY_GUEST_DRAFT.dashboardDraft();if(!current())return;created=Boolean(draft?.qualifies);}
      if(!current())return;
      if(created){remember(id);return beforeList.apply(this,args);}
      nav('list','new');
    }catch(error){
      if(!current())return;
      layout('<section><div class="empty" role="alert">'+escapeHtml('Saved listings could not be checked. '+error.message)+'</div><button type="button" class="ghost" id="retryListEntry">Try again</button></section>');
      document.querySelector('#retryListEntry').onclick=()=>renderList();
    }
  };
})();
