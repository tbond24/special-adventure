// Explicit Save and exit: device-local files, never uploaded before publishing.
function draftMediaStore(mode,key,value){return new Promise((resolve,reject)=>{
 const opening=indexedDB.open('vacancy-listing-drafts',1);
 opening.onupgradeneeded=()=>opening.result.createObjectStore('media');
 opening.onerror=()=>reject(opening.error);
 opening.onsuccess=()=>{const db=opening.result,tx=db.transaction('media',mode==='get'?'readonly':'readwrite'),store=tx.objectStore('media');let result;
 const request=mode==='get'?store.get(key):mode==='delete'?store.delete(key):store.put(value,key);
 request.onsuccess=()=>{result=request.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('Draft storage unavailable'))};};
});}
async function restoreDraftMedia(form,draft){
 if(!draft.savedMedia)return;
 const key=listingDraftKey(form),rows=await draftMediaStore('get',key);
 if(!form.isConnected||listingDraftKey(form)!==key)return;
 if(!Array.isArray(rows))throw new Error('Saved photo storage is missing');
 for(const unit of form.querySelectorAll('.unit-editor')){const input=unit.querySelector('input[type=file]'),row=rows?.find(item=>item.id===unit.dataset.requestId);if(!input||!row)continue;
 const added=selectedPhotoFiles(input);photoSelections.set(input,row.files);if(added.length)appendPhotoFiles(input,added);else renderPhotoSelection(input);}
}
async function saveAndExitListing(form,button){
 if(button.disabled)return;button.disabled=true;button.textContent='Saving…';clearTimeout(listingDraftTimers.get(form));
 try{await form._draftMediaRestore;const map=form.querySelector('#newPropertyMap');await map?._vacancyAddressLookup;await map?._vacancyForwardLookup;
 if(!currentUser)throw new Error('Sign in to save your draft');
 const key=listingDraftKey(form),data=listingDraftData(form);data.savedMedia=true;data.editVacancy=form.dataset.editVacancy||null;data.locationLabel=form.dataset.locationLabel||'';
 const rows=[...form.querySelectorAll('.unit-editor')].map(unit=>({id:unit.dataset.requestId,files:selectedPhotoFiles(unit.querySelector('input[type=file]'))}));
 await draftMediaStore('put',key,rows);if(!form.isConnected||listingDraftKey(form)!==key)throw new Error('The editor or account changed while saving');saveListingDraft(form,data);nav('list');
 }catch(error){toast('Draft could not be saved. Stay on this page and try again. '+error.message)}finally{button.disabled=false;button.textContent='Save and exit'}
}
