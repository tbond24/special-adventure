// Only app navigation controls leaving an active create editor are guarded.
// Publish, authentication, edit, Save and exit, and browser history keep their
// existing flows. Save shares the existing Save and exit durability contract.
(() => {
  const states=new WeakMap(),activeSaves=new WeakSet();let decision=null;
  function canonical(data){
    const copy={...data,locationLabel:data.locationLabel||''};
    for(const key of ['savedAt','savedMedia','_accountDraft','_accountSourceId','_draftMediaKey','_draftMediaPreviousKeys','_legacySourceKey','_legacySourceSnapshot'])delete copy[key];
    return JSON.stringify(copy);
  }
  function capture(form){
    const data=listingDraftData(form);data.locationLabel=form.dataset.locationLabel||'';
    return {data:canonical(data),media:[...form.querySelectorAll('.unit-editor')].map(unit=>({id:unit.dataset.requestId,files:selectedPhotoFiles(unit.querySelector('input[type=file]')).slice()}))};
  }
  function saved(form,data,media){
    const state=states.get(form);if(!state)return;
    state.saved={data:canonical(data),media:media.map(row=>({id:row.id,files:row.files.slice()}))};
  }
  function accountSaved(form,data,media){
    const state=states.get(form);if(!state)return;
    state.accountSaved={key:listingDraftKey(form),data:canonical(data),media:media.map(row=>({id:row.id,files:row.files.slice()}))};
    state.accountUnconfirmed=false;
  }
  function accountConfirmed(form,data,media){
    const saved=states.get(form)?.accountSaved;
    return Boolean(saved&&saved.key===listingDraftKey(form)&&saved.data===canonical(data)&&sameDraftMedia(saved.media,media));
  }
  function unconfirmed(form){
    if(form.dataset.guestDraftId)return false;
    try{const local=JSON.parse(localStorage.getItem(listingDraftKey(form))||'null');return Boolean(local&&local._accountDraft?.synced!==true);}catch{return true;}
  }
  function mount(form){
    if(form.dataset.editVacancy||form.dataset.editInitializing||parseHash().name==='edit'||form.closest('#listingHost')?.dataset.mode!=='create'||states.has(form))return;
    const state={initial:capture(form),saved:null,accountSaved:null,accountUnconfirmed:unconfirmed(form),touched:false};states.set(form,state);
    const touch=()=>{if(!form.dataset.accountRestoring&&!form.dataset.guestRestoring&&!form.dataset.restoringMedia)state.touched=true;};
    for(const type of ['input','change','vacancy:photos-changed'])form.addEventListener(type,touch,true);
    Promise.resolve(form._draftMediaRestore).then(()=>{
      // Restored fields/Files are already durable. Never call a user's edit
      // clean merely because a slower restoration finished afterwards.
      if(!state.touched&&!state.saved)state.initial=capture(form);
      if(!form.dataset.guestDraftId&&!state.accountSaved){
        state.accountUnconfirmed=unconfirmed(form);
        if(!state.accountUnconfirmed&&VACANCY_ACCOUNT_DRAFT_UI.metadata(form)?.synced===true)state.accountSaved={key:listingDraftKey(form),...capture(form)};
      }
    }).catch(()=>{});
  }
  function editor(){
    const host=document.querySelector('#listingHost[data-mode="create"]');
    if(!host||host.hidden||host.querySelector('.listing-start:not(.complete)'))return null;
    return [...host.querySelectorAll('#listingForm,#existingListingForm')].find(form=>!form.closest('[hidden]')&&form.getClientRects().length&&!form.dataset.editVacancy&&(!form.dataset.draftExiting||activeSaves.has(form))&&!form.dataset.draftExited&&!form.dataset.draftDiscarded&&!form.dataset.accountChanged&&form.dataset.publishing!=='true')||null;
  }
  function pending(form){return form.dataset.guestDraftId?VACANCY_GUEST_DRAFT.localPending(form):VACANCY_ACCOUNT_DRAFT_UI.localPending(form);}
  function dirty(form){
    mount(form);const state=states.get(form),now=capture(form),guest=Boolean(form.dataset.guestDraftId),before=(guest?state.saved:state.accountSaved)||state.initial;
    return pending(form)||!guest&&state.accountUnconfirmed||now.data!==before.data||!sameDraftMedia(before.media,now.media);
  }
  const identity=()=>JSON.stringify([currentUser?.id||null,Boolean(currentUser?.is_anonymous)]);
  const routeKey=()=>location.pathname+location.search+location.hash;
  function current(item){return decision===item&&item.form.isConnected&&editor()===item.form&&routeKey()===item.route&&identity()===item.identity;}
  function cancelQueued(form){
    form.dataset.draftNavigationLeft='true';clearTimeout(listingDraftTimers.get(form));
    if(form.dataset.guestDraftId)VACANCY_GUEST_DRAFT.cancelLocalNavigation(form);
    else VACANCY_ACCOUNT_DRAFT_UI.cancelLocalNavigation(form);
  }
  function thaw(item){
    if(!item.helperStarted)return;
    item.form.inert=item.wasInert;
    if(!item.wasFrozen)delete item.form.dataset.draftLocationFrozen;
  }
  function close(item,{focus=false}={}){
    if(decision!==item)return;
    decision=null;item.attempt++;clearInterval(item.watcher);item.observer.disconnect();
    thaw(item);item.dialog.close();item.dialog.remove();
    if(focus&&item.control.isConnected)item.control.focus();
  }
  function invalidate(item){if(!current(item)){cancelQueued(item.form);close(item);return true}return false;}
  async function saveAndLeave(item){
    if(item.saving||invalidate(item))return;
    const attempt=++item.attempt;item.saving=true;item.save.disabled=true;item.error.hidden=true;
    item.status.textContent=item.form.dataset.guestDraftId?'Saving on this device…':'Saving to your account…';
    const valid=()=>current(item)&&attempt===item.attempt;
    try{
      // Finish restore before recording the helper's prior inert state. The
      // modal already prevents editing; Stay may dismiss this decision anytime.
      await waitForDraftRestore(item.form);if(!valid())return;
      if(activeSaves.has(item.form))throw new Error('A save is already in progress. Please retry once it finishes.');
      item.wasInert=item.form.inert;item.wasFrozen=Boolean(item.form.dataset.draftLocationFrozen);item.helperStarted=true;item.save.disabled=false;
      let result;activeSaves.add(item.form);
      try{result=await saveAndExitListing(item.form,item.save,()=>{
        close(item);
        nav('list');
      },valid)}finally{activeSaves.delete(item.form)}
      if(!valid())return;
      if(!result?.saved)throw result?.error||new Error('The listing could not be saved. Please retry.');
    }catch(error){
      if(!valid())return;
      item.status.textContent='';item.error.textContent='Could not save your draft. Stay here and select Save to retry. '+error.message;item.error.hidden=false;
      item.save.focus();
    }finally{
      if(decision===item&&attempt===item.attempt){item.saving=false;item.save.disabled=false;item.save.textContent='Save';thaw(item);}
    }
  }
  function ask(form,control){
    if(decision)return;
    const dialog=document.createElement('dialog');dialog.className='create-leave-dialog';dialog.setAttribute('aria-labelledby','createLeaveTitle');dialog.setAttribute('aria-describedby','createLeaveDescription');
    dialog.innerHTML='<h2 id="createLeaveTitle">Leave this listing?</h2><p id="createLeaveDescription">Save your changes before leaving this listing. Saving keeps it as a draft and does not publish it.</p><p role="status" aria-live="polite"></p><p role="alert" hidden></p><div class="create-leave-actions"><button type="button" class="ghost" data-create-leave-stay autofocus>Stay</button><button type="button" class="primary" data-create-leave-save>Save</button></div>';
    const item={form,control,dialog,route:routeKey(),identity:identity(),attempt:0,saving:false,wasInert:form.inert,wasFrozen:Boolean(form.dataset.draftLocationFrozen),save:dialog.querySelector('[data-create-leave-save]'),error:dialog.querySelector('[role=alert]'),status:dialog.querySelector('[role=status]')};decision=item;
    item.save.onclick=()=>void saveAndLeave(item);
    dialog.querySelector('[data-create-leave-stay]').onclick=()=>close(item,{focus:true});
    dialog.addEventListener('cancel',event=>{event.preventDefault();close(item,{focus:true});});
    item.observer=new MutationObserver(()=>invalidate(item));item.observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
    // Same-tab identity refresh has no storage event. Watch only while this
    // decision is open; no auth method or global route is wrapped.
    item.watcher=setInterval(()=>invalidate(item),100);
    document.body.append(dialog);dialog.showModal();
  }
  document.addEventListener('click',event=>{
    const control=event.target.closest?.('.topbar [data-nav],.mobile-nav [data-nav],.topbar .brand[href],.topbar #authButton');
    if(!control||control.disabled||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const form=editor();if(!form||!dirty(form))return;
    event.preventDefault();event.stopImmediatePropagation();ask(form,control);
  },true);
  addEventListener('hashchange',()=>{if(decision)invalidate(decision)});
  addEventListener('storage',()=>{if(decision)invalidate(decision)});
  window.VACANCY_CREATE_NAVIGATION={mount,saved,accountSaved,accountConfirmed};
})();
