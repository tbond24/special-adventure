// Durable device cache, also used before private account synchronization.
// Every operation settles, including blocked opens and synchronous exceptions.
function draftMediaStore(mode,key,value){return new Promise((resolve,reject)=>{
 let opening,db,tx,result,settled=false;
 const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){try{tx?.abort()}catch{}try{opening?.transaction?.abort()}catch{}}try{db?.close()}catch{}error?reject(error):resolve(result)};
 const timer=setTimeout(()=>finish(new Error('Draft photo storage timed out. Close other listing tabs and retry.')),10000);
 try{opening=indexedDB.open('vacancy-listing-drafts',1)}catch(error){finish(error);return}
 opening.onupgradeneeded=()=>{try{db=opening.result;if(settled){try{opening.transaction?.abort()}catch{}db.close();return}if(!db.objectStoreNames.contains('media'))db.createObjectStore('media')}catch(error){finish(error)}};
 opening.onerror=()=>finish(opening.error||new Error('Draft storage unavailable'));
 opening.onblocked=()=>finish(new Error('Another tab is blocking draft photo storage. Close it and retry.'));
 opening.onsuccess=()=>{
  db=opening.result;if(settled){db.close();return}
  try{tx=db.transaction('media',mode==='get'?'readonly':'readwrite');const store=tx.objectStore('media');
   tx.oncomplete=()=>finish();tx.onerror=tx.onabort=()=>finish(tx.error||new Error('Draft storage unavailable'));
   const request=mode==='get'?store.get(key):mode==='delete'?store.delete(key):store.put(value,key);
   request.onsuccess=()=>{result=request.result};request.onerror=()=>finish(request.error||new Error('Draft storage unavailable'));
  }catch(error){finish(error)}
 };
});}
const listingMediaCheckpoints=new WeakMap();
function draftCheckpointIdentity(key,data){if(!data)return null;const copy={...data,_draftMediaKey:data._draftMediaKey||key};for(const name of ['savedAt','savedMedia','_accountDraft','_accountSourceId','_draftMediaPreviousKeys'])delete copy[name];return JSON.stringify(copy)}
function sameDraftMedia(a,b){return a?.length===b.length&&b.every((row,i)=>row.id===a[i].id&&row.files.length===a[i].files.length&&row.files.every((file,j)=>file===a[i].files[j]))}
function draftMediaKeys(key,data){return [...new Set([key,data?._draftMediaKey,...(data?._draftMediaPreviousKeys||[])].filter(value=>typeof value==='string'&&(value===key||value.startsWith(key+':media:'))))]}
async function deleteDraftMedia(key,data){await Promise.all(draftMediaKeys(key,data).map(mediaKey=>draftMediaStore('delete',mediaKey)))}
async function writeListingCheckpoint(form,data,media){
 const key=listingDraftKey(form),id=form.dataset.draftOwnerId,previous=listingMediaCheckpoints.get(form);VACANCY_LISTING_STORAGE.assertCurrent(key,id);
 let old;try{old=JSON.parse(localStorage.getItem(key)||'null')}catch{}
 const identity=draftCheckpointIdentity(key,old);
 const assertSnapshot=()=>{let current;try{current=JSON.parse(localStorage.getItem(key)||'null')}catch{}if(draftCheckpointIdentity(key,current)!==identity||previous?.key===key&&previous.identity!==identity){const error=new Error('A newer device draft was saved in another tab. Reopen that device draft before saving here.');error.code='LOCAL_DRAFT_CONFLICT';throw error}};
 const same=previous?.key===key&&sameDraftMedia(previous.rows,media),mediaKey=same?previous.mediaKey:key+':media:'+crypto.randomUUID();let metadataWritten=false;
 try{
  // A stale blur/change event must not overwrite another tab's durable copy.
  assertSnapshot();
  // Write immutable media first; recheck the local snapshot after the IDB wait.
  if(!same)await draftMediaStore('put',mediaKey,media);
  if(!form.isConnected||listingDraftKey(form)!==key||form.dataset.accountChanged||id!==currentUser?.id)throw new Error('The editor or account changed while saving.');
  assertSnapshot();
  for(const name of ['_legacySourceKey','_legacySourceSnapshot'])if(old?.[name]!==undefined)data[name]=old[name];
  data.savedMedia=true;data._draftMediaKey=mediaKey;
  data._draftMediaPreviousKeys=draftMediaKeys(key,old).filter(value=>value!==mediaKey);
  const encoded=JSON.stringify(data);localStorage.setItem(key,encoded);metadataWritten=true;if(localStorage.getItem(key)!==encoded)throw new Error('Draft storage could not be verified. Keep this page open.');
 }catch(error){
  // Only this call knows the new random key. A throwing setItem is atomic;
  // never prune a previously reachable snapshot or a concurrent tab's pointer.
  if(!same&&!metadataWritten)try{const current=JSON.parse(localStorage.getItem(key)||'null');if(!draftMediaKeys(key,current).includes(mediaKey))await draftMediaStore('delete',mediaKey)}catch{}
  throw error;
 }
 listingMediaCheckpoints.set(form,{key,mediaKey,identity:draftCheckpointIdentity(key,data),rows:media.map(row=>({id:row.id,files:row.files.slice()}))});return key;
}
function waitForDraftRestore(form){
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Saved photos are still loading. Keep this page open and retry.')),12000);Promise.resolve(form._draftMediaRestore).then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)})});
}
// Address lookup enriches a draft; it must never hold a local save indefinitely.
async function settleDraftLocation(form){
 const map=form.querySelector('#newPropertyMap');let timer;
 try{await Promise.race([Promise.allSettled([map?._vacancyAddressLookup,map?._vacancyForwardLookup]),new Promise(resolve=>{timer=setTimeout(resolve,1500)})])}finally{clearTimeout(timer)}
}
async function restoreDraftMedia(form,draft){
 if(!draft.savedMedia)return;
 const key=listingDraftKey(form),mediaKey=draft._draftMediaKey||key;VACANCY_LISTING_STORAGE.assertCurrent(key,form.dataset.draftOwnerId||currentUser?.id);
 if(typeof mediaKey!=='string'||mediaKey!==key&&!mediaKey.startsWith(key+':media:'))throw new Error('Saved photo storage does not match this draft.');
 const rows=await draftMediaStore('get',mediaKey);
 if(!form.isConnected||listingDraftKey(form)!==key)return;
 if(!Array.isArray(rows))throw new Error('Saved photo storage is missing');
 const units=[...form.querySelectorAll('.unit-editor')];
 if(new Set(rows.map(row=>row.id)).size!==rows.length||units.some(unit=>{const row=rows.find(item=>item.id===unit.dataset.requestId);return !row||!Array.isArray(row.files)||row.files.length>8||row.files.some(file=>!(file instanceof File))}))throw new Error('Saved photo mapping is incomplete. Retry before saving this draft.');
 listingMediaCheckpoints.set(form,{key,mediaKey,identity:draftCheckpointIdentity(key,draft),rows:rows.map(row=>({id:row.id,files:row.files.slice()}))});
 form.dataset.restoringMedia='true';try{for(const unit of form.querySelectorAll('.unit-editor')){const input=unit.querySelector('input[type=file]'),row=rows?.find(item=>item.id===unit.dataset.requestId);if(!input||!row)continue;
 const added=selectedPhotoFiles(input);photoSelections.set(input,row.files);if(added.length)appendPhotoFiles(input,added);else renderPhotoSelection(input);}}finally{delete form.dataset.restoringMedia}
}
async function saveAndExitListing(form,button,onSaved=()=>nav(form.dataset.guestDraftId?'home':'list')){
 if(button.disabled||form.dataset.draftExiting)return;button.disabled=true;button.textContent='Saving…';clearTimeout(listingDraftTimers.get(form));
 const wasInert=form.inert;form.inert=true;form.dataset.draftExiting='true';let exited=false;
 try{
  await waitForDraftRestore(form);await settleDraftLocation(form);form.dataset.draftLocationFrozen='true';
  if(form.dataset.guestDraftId){await VACANCY_GUEST_DRAFT.checkpoint(form,{forAuth:false,skipLocationWait:true});}
  else{if(!currentUser||currentUser.is_anonymous||form.dataset.draftOwnerId!==currentUser.id)throw new Error('Sign in to the account that owns this draft');await VACANCY_ACCOUNT_DRAFT_UI.sync(form,{force:true,exiting:true});}
  if(!form.isConnected)throw new Error('The editor changed while saving. Your draft was retained.');
  form.dataset.draftExited='true';exited=true;onSaved();
 }catch(error){if(form.isConnected)toast('Draft could not be saved. Stay on this page and try again. '+error.message)}finally{delete form.dataset.draftExiting;if(!exited){form.inert=wasInert;delete form.dataset.draftLocationFrozen;}button.disabled=false;button.textContent='Save and exit'}
}

// Used before changing a partial-publication draft's key. The old snapshot is
// retained unless both the replacement photo transaction and metadata succeed.
async function checkpointOwnedListingDraft(form){
 if(!currentUser||currentUser.is_anonymous||form.dataset.accountChanged==='true'||form.dataset.draftOwnerId!==currentUser.id)throw new Error('The account changed; the previous saved draft is still available.');
 const data=listingDraftData(form);data.locationLabel=form.dataset.locationLabel||'';
 const rows=[...form.querySelectorAll('.unit-editor')].map(unit=>({id:unit.dataset.requestId,files:selectedPhotoFiles(unit.querySelector('input[type=file]')).slice()}));
 return writeListingCheckpoint(form,data,rows);
}
