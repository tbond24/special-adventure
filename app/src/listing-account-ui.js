// Draft persistence around the existing Location / Listing details / Review UI.
(() => {
  const queues=new WeakMap(),timers=new WeakMap(),changes=new WeakMap(),localQueues=new WeakMap(),localPending=new Set();let listGeneration=0;
  const api=()=>window.VACANCY_ACCOUNT_DRAFT;
  const owner=form=>form.dataset.draftOwnerId;
  function assertOwner(id){if(!id||currentUser?.id!==id||currentUser.is_anonymous)throw new Error('The account changed. Your unfinished work is still saved for its original account.');}
  function metadata(form){try{return JSON.parse(form.dataset.accountDraft||'null')}catch{return null}}
  function remember(form,result,synced=true){
    const value={id:result.draftId,ownerId:result.ownerId,sourceId:result.sourceGuestId,revision:result.revision,state:result.state||'editing',publishToken:result.publishToken||null,synced};
    form.dataset.accountDraft=JSON.stringify(value);return value;
  }
  function status(form,message,error){
    const host=form.querySelector('[data-account-draft-status]');if(!host)return;
    host.querySelector('span').textContent=message;host.querySelector('[data-account-draft-retry]').hidden=!error;
    const conflict=error&&(error.code==='40001'||error.code==='DRAFT_CONFLICT'||error.status===409||/revision|conflict|newer/i.test(error.message));
    host.querySelector('[data-load-account-version]').hidden=!conflict;host.querySelector('[data-save-draft-copy]').hidden=!conflict||Boolean(form.dataset.editVacancy);
  }
  function rows(form){return [...form.querySelectorAll('.unit-editor')].map(unit=>({id:unit.dataset.requestId,files:selectedPhotoFiles(unit.querySelector('input[type=file]')).slice()}));}
  function meaningful(data,media){return Boolean(data.shared?.address||data.shared?.propertyTitle||data.units?.some(unit=>unit.rentAmount||unit.description||unit._privateName)||media.some(row=>row.files.length));}
  function snapshot(form){const data=listingDraftData(form);data.savedMedia=true;data.locationLabel=form.dataset.locationLabel||'';return data;}
  function content(data){const copy={...data};for(const key of ['savedAt','savedMedia','_accountDraft','_accountSourceId','_draftMediaKey','_draftMediaPreviousKeys','_legacySourceKey','_legacySourceSnapshot'])delete copy[key];return JSON.stringify(copy);}
  function active(form){return form.isConnected&&!form.dataset.draftDiscarded&&!form.dataset.accountChanged&&!form.dataset.draftExited;}
  async function localCheckpoint(form,data,media){
    assertOwner(owner(form));if(!active(form))throw new Error('This draft is no longer active.');
    data._accountDraft={...(metadata(form)||{}),ownerId:owner(form),synced:false};
    return writeListingCheckpoint(form,data,media);
  }
  function persistLocal(form,data=snapshot(form),media=rows(form)){
    assertOwner(owner(form));let state=localQueues.get(form);
    if(state){state.pending={data,media};return state.promise}
    state={pending:{data,media},promise:null};localQueues.set(form,state);
    state.promise=Promise.resolve().then(async()=>{let key;while(state.pending){const next=state.pending;state.pending=null;key=await localCheckpoint(form,next.data,next.media)}return key}).finally(()=>{if(localQueues.get(form)===state)localQueues.delete(form);localPending.delete(state.promise)});
    localPending.add(state.promise);return state.promise;
  }
  async function runSync(form,state){
    const id=owner(form);assertOwner(id);if(!active(form))throw new Error('This draft is no longer active.');
    await waitForDraftRestore(form);assertOwner(id);
    const data=snapshot(form),media=rows(form);if(!state.force&&!meaningful(data,media))return {result:null,data,media};
    const meta=metadata(form);if(meta?.state==='publishing')throw new Error('An interrupted publication needs to be resumed from your account drafts.');
    const sourceId=meta?.sourceId||form.dataset.accountSourceId||data._guestDraft?.id||data.units?.[0]?._requestId;
    if(!sourceId)throw new Error('Draft identity is unavailable. Keep this page open.');form.dataset.accountSourceId=sourceId;
    try{await persistLocal(form,data,media)}catch(error){error.localCheckpointFailed=true;throw error}
    assertOwner(id);if(!active(form))throw new Error('The editor changed while saving. Your local draft is retained.');status(form,'Saving to your account…');
    const result=await api().save({ownerId:id,draftId:meta?.id,sourceGuestId:sourceId,expectedRevision:meta?.revision||0,data,media});assertOwner(id);
    if(!active(form))throw new Error('The editor changed while saving. Your local draft is retained.');
    const unchanged=content(snapshot(form))===content(data)&&sameDraftMedia(media,rows(form));
    const saved=remember(form,result,unchanged);
    // A different tab may have checkpointed new photos without changing fields.
    // Only acknowledge this exact field AND immutable-media snapshot; never
    // relabel another/newer local pointer as synced or replace its metadata.
    const key=listingDraftKey(form);let latest;try{latest=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(latest&&data._draftMediaKey&&latest._draftMediaKey===data._draftMediaKey&&content(latest)===content(data)){latest._accountDraft=saved;const encoded=JSON.stringify(latest);localStorage.setItem(key,encoded);if(localStorage.getItem(key)!==encoded)throw new Error('The account saved your draft, but its local acknowledgement could not be stored. Retry before leaving.');}
    status(form,unchanged?'Saved to account':'New changes saved on this device. Syncing…');renderLocalDraftRows();return {result,data,media};
  }
  function sync(form,options={}){
    clearTimeout(timers.get(form));let state=queues.get(form);
    if(state){state.force=state.force||Boolean(options.force);return state.promise}
    state={force:Boolean(options.force),promise:null};queues.set(form,state);
    state.promise=Promise.resolve().then(async()=>{
      while(true){
        const saved=await runSync(form,state);
        clearTimeout(timers.get(form));
        if(!active(form))throw new Error('The editor changed while saving. Your local draft is retained.');
        if(content(snapshot(form))===content(saved.data)&&sameDraftMedia(saved.media,rows(form)))return saved.result;
      }
    }).catch(error=>{status(form,(error.localCheckpointFailed?'Could not save on this device. Keep this page open. ':'Not synced to your account. Your last successful local save is retained. ')+error.message,error);throw error}).finally(()=>{clearTimeout(timers.get(form));if(queues.get(form)===state)queues.delete(form)});
    return state.promise;
  }
  function schedule(form){
    changes.set(form,(changes.get(form)||0)+1);
    if(form.dataset.guestDraftId||!owner(form)||!active(form)||form.dataset.accountRestoring||form.dataset.publishing==='true'||form.dataset.draftExiting)return;
    void persistLocal(form).catch(error=>status(form,'Could not save on this device. Keep this page open. '+error.message,error));
    clearTimeout(timers.get(form));
    if(!queues.has(form))timers.set(form,setTimeout(()=>{if(active(form)&&!form.dataset.draftExiting)void sync(form).catch(()=>{});},700));
  }
  async function cache(result,key){
    assertOwner(result.ownerId);VACANCY_LISTING_STORAGE.assertCurrent(key,result.ownerId);const data={...result.data,savedMedia:true,_accountDraft:{id:result.draftId,ownerId:result.ownerId,sourceId:result.sourceGuestId,revision:result.revision,state:result.state,publishToken:result.publishToken||null,synced:true}};
    await draftMediaStore('put',key,result.media);assertOwner(result.ownerId);localStorage.setItem(key,JSON.stringify(data));return data;
  }
  async function open(id,{review=false,recover=false}={}){
    const userId=currentUser?.id;assertOwner(userId);let result=await api().load(userId,id);assertOwner(userId);
    if(result.state==='publishing'){
      if(!recover&&!confirm('Resume this interrupted publication? Successfully published units will be kept; unfinished units will reopen for review.'))return;
      result=await api().finishPublish({ownerId:userId,draftId:id,expectedRevision:result.revision,publishToken:result.publishToken});
      if(result.state==='published'){toast('This draft was already published.');await renderList();return;}
    }
    const key=VACANCY_LISTING_STORAGE.key(userId,`account-${id}:revision-${result.revision}:${crypto.randomUUID()}`);
    await cache(result,key);sessionStorage.setItem('vacancy-opening-draft',key);if(review)sessionStorage.setItem('vacancy-guest-review',key);
    if(result.data.editVacancy)nav('edit',result.data.editVacancy);else nav('list','new');
  }
  async function transferGuest(result){
    assertOwner(result.ownerId);VACANCY_LISTING_STORAGE.assertCurrent(result.draftKey,result.ownerId);
    const cloud=await api().save({ownerId:result.ownerId,sourceGuestId:result.draftId,expectedRevision:0,data:result.data,media:result.media});assertOwner(result.ownerId);
    cloud.data={...cloud.data,_guestDraft:{...result.data._guestDraft,id:result.draftId,ownerId:result.ownerId}};await cache(cloud,result.draftKey);
    // The source Files remain durable until the complete cloud acknowledgment.
    await VACANCY_GUEST_DRAFT.completeOwned(result.draftId,result.ownerId);cloud.draftKey=result.draftKey;return cloud;
  }
  function mount(form,journey){
    form._oldListingJourney=journey;if(form.dataset.accountUiMounted)return;form.dataset.accountUiMounted='true';
    const note=document.createElement('div');note.className='wide muted';note.dataset.accountDraftStatus='true';note.setAttribute('role','status');
    note.innerHTML='<span></span> <button type="button" class="ghost" data-account-draft-retry hidden>Retry save</button><button type="button" class="ghost" data-load-account-version hidden>Open account version</button><button type="button" class="ghost" data-save-draft-copy hidden>Keep as separate draft</button>';
    form.querySelector('.journey-stage-heading')?.after(note);if(!note.isConnected)form.prepend(note);
    if(form.dataset.guestDraftId){note.querySelector('span').textContent='An account is required to publish. Until then, your draft and photos stay on this device.';const discard=document.createElement('button');discard.type='button';discard.className='ghost';discard.textContent='Discard device draft';discard.onclick=async()=>{if(!confirm('Discard this device draft and its photos?'))return;form.dataset.draftDiscarded='true';clearTimeout(listingDraftTimers.get(form));await VACANCY_GUEST_DRAFT.discard(form);nav('home')};note.append(discard);}
    else{const account=document.createElement('p');account.className='listing-publish-account wide muted';account.textContent='Publishing as '+(currentUser?.email||'your account')+'.';note.before(account);}
    note.querySelector('[data-account-draft-retry]').onclick=()=>void sync(form,{force:true}).catch(()=>{});
    note.querySelector('[data-load-account-version]').onclick=()=>{const id=metadata(form)?.id;if(id)void open(id).catch(error=>toast(error.message));};
    note.querySelector('[data-save-draft-copy]').onclick=()=>{if(form.dataset.editVacancy)return;const source=crypto.randomUUID();form.dataset.accountSourceId=source;form.dataset.draftStorageKey=VACANCY_LISTING_STORAGE.key(owner(form),'separate-'+source);delete form.dataset.accountDraft;delete form.dataset.guestOrigin;for(const unit of form.querySelectorAll('.unit-editor'))unit.dataset.requestId=crypto.randomUUID();changes.set(form,(changes.get(form)||0)+1);void sync(form,{force:true}).catch(()=>{});};
    const pending=form._draftMediaRestore;
    form._draftMediaRestore=Promise.resolve(pending).then(async()=>{
      if(!form.isConnected||form.dataset.editInitializing||parseHash().name==='edit'&&!form.dataset.editVacancy)return;form.dataset.accountRestoring='true';
      try{
        if(form.dataset.guestDraftId){form.dataset.guestRestoring='true';form.inert=true;const bundle=await VACANCY_GUEST_DRAFT.load(form);if(bundle?.data&&form.isConnected){applyListingDraft(form,bundle.data);for(const unit of form.querySelectorAll('.unit-editor')){const input=unit.querySelector('input[type=file]'),row=bundle.media.find(row=>row.id===unit.dataset.requestId);if(input&&row){photoSelections.set(input,row.files);renderPhotoSelection(input)}}}}
        else{let data;try{data=JSON.parse(localStorage.getItem(listingDraftKey(form))||'null')}catch{}if(data?._accountDraft?.ownerId===owner(form))form.dataset.accountDraft=JSON.stringify(data._accountDraft);if(data){applyListingDraft(form,data);await form._draftMediaRestore;}if(data?._accountDraft?.synced)status(form,'Saved to account');}
      }finally{delete form.dataset.accountRestoring;delete form.dataset.guestRestoring;form.inert=false;}
      if(!form.dataset.guestDraftId&&sessionStorage.getItem('vacancy-guest-review')===listingDraftKey(form)){if(await journey.validate(0)&&await journey.validate(1)){journey.show(2);sessionStorage.removeItem('vacancy-guest-review');}}
    });form._draftMediaRestore.catch(error=>toast(error.message));
  }
  async function renderRows(){
    const host=document.querySelector('#mine');if(!host||host.hidden||!currentUser||currentUser.is_anonymous)return;
    const generation=++listGeneration,id=currentUser.id;
    try{const drafts=await api().list(id);if(generation!==listGeneration||!host.isConnected||currentUser?.id!==id)return;
      host.querySelectorAll('.account-draft-row,[data-account-drafts-error]').forEach(row=>row.remove());
      for(const draft of drafts){const row=document.createElement('article');row.className='room-manage account-draft-row';const title=draft.data?.shared?.propertyTitle||draft.data?.units?.[0]?.roomName||'Unfinished listing';
        row.innerHTML='<div class="room-manage-copy"><strong>'+escapeHtml(title)+'</strong><div class="muted">Draft saved to account'+(draft.state==='publishing'?' · publication interrupted':'')+'</div></div><div class="room-manage-actions"><button type="button" class="ghost" data-open-account-draft="'+escapeHtml(draft.draftId)+'">'+(draft.state==='publishing'?'Resume':'Edit draft')+'</button></div>';
        row.querySelector('[data-open-account-draft]').onclick=()=>void open(draft.draftId).catch(error=>toast(error.message));
        host.prepend(row);
      }
    }catch(error){if(host.isConnected){let note=host.querySelector('[data-account-drafts-error]');if(!note){note=document.createElement('p');note.dataset.accountDraftsError='true';host.prepend(note);}note.textContent='Account drafts could not load. '+error.message;}}
  }
  async function beginPublish(form){
    const saved=await sync(form,{force:true});assertOwner(owner(form));
    const head=await api().beginPublish({ownerId:owner(form),draftId:saved.draftId,expectedRevision:saved.revision});remember(form,head);
    const context={ownerId:owner(form),head,editing:Boolean(form.dataset.editVacancy),requestId:form.querySelector('.unit-editor')?.dataset.requestId};
    context.action=async(action,args)=>{assertOwner(context.ownerId);const answer=await api().publishAction({ownerId:context.ownerId,draftId:context.head.draftId,expectedRevision:context.head.revision,publishToken:context.head.publishToken,requestId:context.requestId,action,args});context.head=answer.head;remember(form,answer.head);return answer.result;};
    return context;
  }
  async function finishPublish(form,context){
    assertOwner(context.ownerId);
    const result=await api().finishPublish({ownerId:context.ownerId,draftId:context.head.draftId,expectedRevision:context.head.revision,publishToken:context.head.publishToken});
    context.head=result;remember(form,result);if(result.state==='editing'&&result.data?.scope)form.dataset.draftScope=result.data.scope;return result;
  }
  const originalSignOut=VACANCY_BACKEND.signOut;
  VACANCY_BACKEND.signOut=async function(...args){const id=currentUser?.id;try{const signingOut=originalSignOut.apply(this,args);await Promise.allSettled([...localPending]);return await signingOut}finally{if(id)clearSyncedCache(id)}};
  function clearSyncedCache(id){for(const key of Object.keys(localStorage)){if(!VACANCY_LISTING_STORAGE.isCurrent(key,id))continue;let data;try{data=JSON.parse(localStorage.getItem(key))}catch{}if(data?._accountDraft?.synced){localStorage.removeItem(key);void deleteDraftMedia(key,data).catch(()=>{});}}}
  window.addEventListener('storage',event=>{if(event.key!=='vacancy-session-v01')return;let oldId,nextId;try{const old=JSON.parse(event.oldValue||'null'),next=JSON.parse(event.newValue||'null');oldId=old?.user?.id||JSON.parse(atob(old.access_token.split('.')[1])).sub;nextId=next?.user?.id||JSON.parse(atob(next.access_token.split('.')[1])).sub}catch{}if(oldId&&oldId!==nextId)clearSyncedCache(oldId);});
  const originalRender=renderList;renderList=async function(...args){const result=await originalRender.apply(this,args);void renderRows();return result;};
  window.VACANCY_ACCOUNT_DRAFT_UI={mount,schedule,sync,open,renderRows,transferGuest,beginPublish,finishPublish,metadata};
})();
