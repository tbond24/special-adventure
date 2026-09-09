const LISTING_DRAFT_VERSION=1;
const listingDraftTimers=new WeakMap();
function listingDraftKey(form){return `vacancy-listing-draft-v${LISTING_DRAFT_VERSION}:${currentUser?.id||'anonymous'}:${form.dataset.draftScope||'new-property'}`}
function listingDraftData(form){
  const skip=new Set(['address','publicLatitude','publicLongitude']);
  const read=controls=>Object.fromEntries([...controls].filter(control=>control.name&&control.type!=='file'&&!skip.has(control.name)).map(control=>[control.dataset.baseName||control.name,control.value]));
  const shared=read(form.querySelectorAll(':scope > label [name], :scope > input[name], .property-identity [name]'));
  const units=[...form.querySelectorAll('.unit-editor')].map(unit=>read(unit.querySelectorAll('[data-base-name]')));
  return{version:LISTING_DRAFT_VERSION,scope:form.dataset.draftScope||'new-property',savedAt:new Date().toISOString(),shared,units};
}
function saveListingDraft(form,data=listingDraftData(form)){
  if(!currentUser||!form?.dataset.draftScope)return;
  const hasContent=Object.values(data.shared||{}).some(Boolean)||(data.units||[]).some(unit=>Object.values(unit).some(Boolean));
  if(hasContent)localStorage.setItem(listingDraftKey(form),JSON.stringify(data));
  const status=form.querySelector('.listing-draft-status small');if(status)status.textContent='Draft saved on this device';
}
function clearListingDraft(form,key=listingDraftKey(form)){localStorage.removeItem(key);const status=form.querySelector('.listing-draft-status small');if(status)status.textContent=''}
function renumberUnitEditors(form){[...form.querySelectorAll('.unit-editor')].forEach((unit,index)=>{unit.dataset.unitIndex=String(index);unit.querySelector('legend').textContent=`Unit ${index+1}`;unit.querySelectorAll('[data-base-name]').forEach(control=>control.name=index?`unit${index}_${control.dataset.baseName}`:control.dataset.baseName)})}
function restoreListingDraft(form){
  let draft;try{draft=JSON.parse(localStorage.getItem(listingDraftKey(form))||'null')}catch{return}
  if(!draft||draft.version!==LISTING_DRAFT_VERSION)return;
  while(form.querySelectorAll('.unit-editor').length<(draft.units?.length||1))form.querySelector('.add-unit')?.click();
  for(const [name,value] of Object.entries(draft.shared||{})){const control=form.querySelector(`[name="${CSS.escape(name)}"]`);if(control)control.value=value}
  [...form.querySelectorAll('.unit-editor')].forEach((unit,index)=>{for(const [name,value] of Object.entries(draft.units?.[index]||{})){const control=unit.querySelector(`[data-base-name="${CSS.escape(name)}"]`);if(control)control.value=value}});
  const status=form.querySelector('.listing-draft-status small');if(status)status.textContent='Draft restored · exact address, map pin and photos are not stored';
}
function setupListingDraft(form,scope){
  form.dataset.draftScope=scope;
  if(!form.querySelector('.listing-draft-status')){
    const status=document.createElement('div');status.className='listing-draft-status notice wide';status.innerHTML='<span><strong>Unfinished listing</strong><small></small></span><button type="button" class="ghost">Discard draft</button>';
    form.querySelector('.listing-preview-action')?.before(status);
    status.querySelector('button').onclick=()=>{clearListingDraft(form);status.querySelector('small').textContent='Draft discarded'};
    const schedule=event=>{if(event.target.matches('input[type=file]'))return;clearTimeout(listingDraftTimers.get(form));listingDraftTimers.set(form,setTimeout(()=>saveListingDraft(form),250))};
    form.addEventListener('input',schedule);form.addEventListener('change',schedule);
  }
  restoreListingDraft(form);
}

function enhanceListingComposer(form){
  if(!form||form.dataset.composerReady)return;form.dataset.composerReady='true';
  const map=form.querySelector('#newPropertyMap');if(map){const heading=[...form.querySelectorAll('h2')].find(x=>x.textContent==='Location'),block=map.closest('.wide');if(heading&&block){heading.after(block);const fields=document.createElement('div');fields.className='wide form-grid property-identity';fields.innerHTML='<label>Property name<input name="propertyTitle" required placeholder="e.g. Sunrise Apartments"></label><label>Private manager nickname<input name="propertyNickname" maxlength="80" placeholder="e.g. Mum’s flats"><span class="muted">Only you see this.</span></label>';block.after(fields)}}
  const chooser=form.querySelector('#propertyChoice');if(chooser){const grid=document.createElement('div');grid.className='property-card-picker wide';[...chooser.options].forEach(option=>{const property=(window.__listingProperties||[]).find(item=>item.id===option.value),card=document.createElement('button');card.type='button';card.className='property-select-card';card.innerHTML=`<strong>${escapeHtml(property?.managerNickname||option.textContent.split(' — ')[0])}</strong><span>${escapeHtml(option.textContent.split(' — ')[1]||'')}</span><b>＋ Unit</b>`;card.onclick=()=>{chooser.value=option.value;chooser.dispatchEvent(new Event('change'));form.hidden=false;grid.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===card))};grid.appendChild(card)});const create=document.createElement('button');create.type='button';create.className='property-select-card property-create-card';create.innerHTML='<strong>＋ New property</strong><span>Add its location and shared details</span>';create.onclick=()=>document.querySelector('#createProperty')?.click();grid.appendChild(create);form.before(grid);form.hidden=true}const publish=form.querySelector('button.primary.wide');if(!publish)return;const button=document.createElement('button');button.type='button';button.className='ghost wide listing-preview-action';button.textContent='Preview listing';const output=document.createElement('section');output.className='listing-draft-preview wide';output.hidden=true;button.onclick=()=>{const data=new FormData(form),unit=form.querySelector('.unit-editor'),read=name=>unit?.querySelector(`[data-base-name="${name}"]`)?.value||data.get(name)||'';output.innerHTML=`<div class="muted">Preview</div><h3>${escapeHtml(read('roomName')||'Untitled unit')}</h3><strong class="listing-price">${escapeHtml(read('rentCurrency'))} ${Number(read('rentAmount')||0).toLocaleString()} / ${escapeHtml(read('rentPeriod')||'month')}</strong><p>${escapeHtml(read('unitType')||'Unit')} · ${escapeHtml(String(data.get('locality')||''))}, ${escapeHtml(String(data.get('city')||''))}</p><p class="muted">${escapeHtml(read('description')||'Add a description to complete this preview.')}</p>`;output.hidden=false;output.scrollIntoView({behavior:'smooth',block:'nearest'})};publish.before(button,output)
}
