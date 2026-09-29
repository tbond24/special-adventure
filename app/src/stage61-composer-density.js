(() => {
  const icon=name=>`<svg class="service-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const filePools=new WeakMap();
  const unitPoolSelections=new WeakMap();
  const unitExtraFiles=new WeakMap();
  const cardBefore61=card;
  card=function(v){const html=cardBefore61(v),features=(v.room?.unitDetails?.amenities||v.property?.customFeatures||[]).slice(0,2).map(item=>`<span class="service-card-pill custom-card-feature" title="${escapeHtml(item.label)}">${icon(String(item.icon||'house').toLowerCase().replace(/[^a-z-]/g,'))}<span class="sr-only">${escapeHtml(item.label)}</span></span>`).join('');return features?html.replace(/<\/div><\/div><\/article>$/,`${features}</div></div></article>`):html};

  function restoreDiscoveryControls(){
    document.querySelector('.sort-control')?.remove();
    const toolbar=document.querySelector('.listing-toolbar'),filter=toolbar?.querySelector('.results-filter-action'),view=toolbar?.querySelector('.view-switch');
    if(filter&&view){toolbar.append(filter,view)}
  }
  const homeBefore61=renderHome;
  renderHome=function(){homeBefore61();restoreDiscoveryControls()};

  function selectedSummary(details,names){
    const summary=details.querySelector('.group-selected');
    const values=names.map(([name,symbol])=>{const select=details.querySelector(`[name="${name}"], [data-base-name="${name}"]`);return select?.value==='true'?`<span title="${name}">${icon(symbol)}</span>`:''}).join('');
    summary.innerHTML=values||'<span>None selected</span>';
  }

  function groupRows(body,title,className,names){
    const rows=names.map(([name])=>body.querySelector(`[name="${name}"], [data-base-name="${name}"]`)?.closest('.service-choice')).filter(Boolean);
    if(!rows.length||body.querySelector(`.${className}`))return null;
    const details=document.createElement('details');details.className=`listing-choice-group wide ${className}`;details.innerHTML=`<summary><span>${title}</span><span class="group-selected"></span><small>Tap to open</small></summary><div></div>`;
    rows[0].before(details);rows.forEach(row=>details.lastElementChild.append(row));
    details.querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>selectedSummary(details,names)));
    details.addEventListener('toggle',()=>details.querySelector('small').textContent=details.open?'Tap to close':'Tap to open');selectedSummary(details,names);return details;
  }

  function setupCustomFeatures(form,propertyBody){
    if(!propertyBody||propertyBody.querySelector('.property-features'))return;
    const details=document.createElement('details');details.className='listing-choice-group property-features wide';
    details.innerHTML='<summary><span>Features</span><span class="feature-summary">None added</span><small>Tap to open</small></summary><div class="feature-presets" role="group" aria-label="Common features"></div><div class="feature-list"></div><button type="button" class="add-feature-action">+ Add your own feature</button><input type="hidden" name="customFeatures" value="[]">';
    const advanced=[...propertyBody.querySelectorAll('.advanced-unit-settings')].find(item=>item.textContent.includes('Advanced property')),continueButton=propertyBody.querySelector('.section-continue');
    propertyBody.insertBefore(details,advanced||continueButton);
    const list=details.querySelector('.feature-list'),hidden=details.querySelector('[name="customFeatures"]'),summary=details.querySelector('.feature-summary');
    const presets=[['Balcony','balcony'],['BBQ','bbq'],['Swimming pool access','pool'],['Card access','key-card']];
    const presetHost=details.querySelector('.feature-presets');
    presetHost.innerHTML=presets.map(([label,name])=>'<button type="button" data-feature="'+name+'" aria-pressed="false">'+icon(name)+'<span>'+label+'</span></button>').join('');
    const parking=form.querySelector('[name="parkingSpaces"]')?.closest('label');
    if(parking){parking.classList.add('feature-parking');presetHost.after(parking)}
    const read=()=>[...presetHost.querySelectorAll('[data-feature][aria-pressed="true"]')].map(button=>({label:button.querySelector('span').textContent,icon:button.dataset.feature})).concat([...list.querySelectorAll('.custom-feature')].map(row=>({label:row.querySelector('input').value.trim(),icon:row.querySelector('select').value})).filter(item=>item.label));
    const sync=()=>{const values=read(),count=values.length+(Number(parking?.querySelector('input')?.value||0)>0?1:0);hidden.value=JSON.stringify(values);summary.textContent=count?count+' selected':'None added';hidden.dispatchEvent(new Event('change',{bubbles:true}))};
    parking?.querySelector('input')?.addEventListener('change',sync);
    presetHost.onclick=event=>{const button=event.target.closest('[data-feature]');if(!button)return;button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));sync()};
    details.querySelector('.add-feature-action').onclick=()=>{if(list.children.length>=8){toast('Maximum 8 custom features');return}const row=document.createElement('div');row.className='custom-feature';row.innerHTML='<input maxlength="40" aria-label="Your feature name" placeholder="e.g. Rooftop terrace"><select aria-label="Feature icon"><option value="house">House</option><option value="balcony">Balcony</option><option value="bbq">BBQ</option><option value="pool">Pool</option><option value="key-card">Access</option><option value="parking">Parking</option><option value="wifi">Wi-Fi</option><option value="shield">Security</option></select><button type="button" aria-label="Remove feature">×</button>';list.append(row);row.querySelectorAll('input,select').forEach(control=>control.addEventListener('input',sync));row.querySelector('button').onclick=()=>{row.remove();sync()};row.querySelector('input').focus()};
    let saved=[];try{saved=JSON.parse(JSON.parse(localStorage.getItem(listingDraftKey(form))||'null')?.shared?.customFeatures||'[]')}catch{}
    if(Array.isArray(saved)&&saved.length){saved.forEach(item=>{const preset=presetHost.querySelector('[data-feature="'+CSS.escape(item.icon||'')+'"]');if(preset&&preset.querySelector('span').textContent===item.label){preset.setAttribute('aria-pressed','true');return}if(!item?.label)return;details.querySelector('.add-feature-action').click();const row=list.lastElementChild;if(row){row.querySelector('input').value=String(item.label).slice(0,40);const choice=row.querySelector('select');if([...choice.options].some(option=>option.value===item.icon))choice.value=item.icon}});sync()}
  }

  function mergeUnitAdvanced(form,unitSection){
    const body=unitSection?.querySelector('.composer-section-body');if(!body)return;
    const all=[...body.querySelectorAll('.advanced-unit-settings')];let target=all.find(item=>item.textContent.includes('Advanced unit'))||all[0];
    if(!target){target=document.createElement('details');target.className='advanced-unit-settings wide';target.innerHTML='<summary>Advanced listing settings <span>Optional</span></summary><div class="advanced-settings-body"></div>'}
    target.querySelector('summary').firstChild.textContent='Advanced listing settings ';
    const targetBody=target.querySelector('.advanced-settings-body')||target.appendChild(document.createElement('div'));targetBody.classList.add('advanced-settings-body');
    all.filter(item=>item!==target).forEach(item=>{[...item.querySelectorAll('.optional-listing-field, label')].forEach(node=>targetBody.append(node));item.remove()});
    const max=form.querySelector('[data-base-name="maxOccupants"], [name="maxOccupants"]'),maxLabel=max?.closest('label');if(maxLabel&&!target.contains(maxLabel)){const row=document.createElement('div');row.className='optional-listing-field';row.innerHTML=`<button type="button" aria-expanded="false">${icon('eye-off')}<span>Maximum occupants</span></button>`;maxLabel.before(row);row.append(maxLabel);maxLabel.hidden=true;row.querySelector('button').onclick=()=>{const show=maxLabel.hidden;maxLabel.hidden=!show;row.querySelector('use').setAttribute('href',show?'#icon-eye':'#icon-eye-off');row.querySelector('button').setAttribute('aria-expanded',String(show))};targetBody.append(row)}
    if(!target.querySelector('.title-template')){const template=document.createElement('section');template.className='title-template';template.innerHTML='<span>Automatic title uses</span><button type="button" data-title-part="type" class="selected">Unit type</button><button type="button" data-title-part="place" class="selected">Location</button>';targetBody.append(template);const title=form.querySelector('[data-base-name="roomName"], [name="roomName"]'),sync=()=>{if(title?.dataset.titleMode!=='auto')return;const type=template.querySelector('[data-title-part="type"].selected')?(form.querySelector('[data-base-name="unitType"], [name="unitType"]')?.value||'Unit'):'';const place=template.querySelector('[data-title-part="place"].selected')?(form.querySelector('[name="locality"]')?.value.trim()||''):'';title.value=[type,place].filter(Boolean).join(type&&place?' in ':'')||'Listing'};template.onclick=event=>{const button=event.target.closest('[data-title-part]');if(!button)return;button.classList.toggle('selected');sync()};form.addEventListener('input',event=>{if(event.target.name==='locality'||event.target.dataset.baseName==='unitType')sync()});form.addEventListener('change',event=>{if(event.target.name==='locality'||event.target.dataset.baseName==='unitType')sync()})}
    target.open=false;body.insertBefore(target,body.querySelector('.section-continue'));
  }

  function renderPropertyPool(form,pool,input){
    const files=filePools.get(form)||[],grid=pool.querySelector('.property-media-grid');
    grid.querySelectorAll('img').forEach(image=>URL.revokeObjectURL(image.src));
    grid.innerHTML=files.map((file,index)=>`<figure><img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)} preview"><button type="button" data-remove-pool="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button></figure>`).join('');
    pool.querySelector('.property-media-empty').hidden=files.length>0;
    [...form.querySelectorAll('.unit-editor')].forEach(unit=>setupUnitPhotoChoices(form,unit,files));
    grid.onclick=event=>{const button=event.target.closest('[data-remove-pool]');if(!button)return;const next=[...files];next.splice(Number(button.dataset.removePool),1);filePools.set(form,next);renderPropertyPool(form,pool,input)};
  }

  function setupUnitPhotoChoices(form,unit,files=filePools.get(form)||[]){
    let choices=unit.querySelector('.unit-photo-choices');if(!choices){choices=document.createElement('details');choices.className='unit-photo-choices wide';choices.innerHTML='<summary>Photos of this unit <span></span></summary><button type="button" class="add-unit-media">+ Add media</button><div></div>';const advanced=unit.querySelector('.advanced-unit-settings');(advanced||unit.lastElementChild)?.before(choices);choices.querySelector('.add-unit-media').onclick=()=>unit.querySelector('input[type="file"]')?.click()}
    const input=unit.querySelector('input[type="file"]');if(!input)return;
    let selectedPool=unitPoolSelections.get(input);if(!selectedPool){selectedPool=new Set(files);unitPoolSelections.set(input,selectedPool)}else{[...selectedPool].filter(file=>!files.includes(file)).forEach(file=>selectedPool.delete(file))}
    const extras=unitExtraFiles.get(input)||[],selected=[...files.filter(file=>selectedPool.has(file)),...extras],body=choices.querySelector('div');photoSelections.set(input,selected);
    body.querySelectorAll('img[src^="blob:"]').forEach(image=>URL.revokeObjectURL(image.src));body.innerHTML=files.map((file,index)=>`<button type="button" data-pool-index="${index}" class="${selectedPool.has(file)?'selected':''}" aria-label="${selectedPool.has(file)?'Remove':'Use'} ${escapeHtml(file.name)}"><img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)} preview"></button>`).join('')+extras.map((file,index)=>`<span class="unit-extra-photo"><img src="${URL.createObjectURL(file)}" alt="${escapeHtml(file.name)} preview"><button type="button" data-remove-unit-photo="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button></span>`).join('');choices.querySelector('summary span').textContent=`${selected.length} selected`;
    body.onclick=event=>{const remove=event.target.closest('[data-remove-unit-photo]');if(remove){const next=[...extras];next.splice(Number(remove.dataset.removeUnitPhoto),1);unitExtraFiles.set(input,next);setupUnitPhotoChoices(form,unit,files);return}const button=event.target.closest('[data-pool-index]');if(!button)return;const file=files[Number(button.dataset.poolIndex)];if(selectedPool.has(file))selectedPool.delete(file);else selectedPool.add(file);setupUnitPhotoChoices(form,unit,files)};
    if(!input.dataset.stage61UnitMedia){input.dataset.stage61UnitMedia='true';input.addEventListener('change',()=>setTimeout(()=>{const added=[...input.files].filter(file=>!files.includes(file)),next=[...(unitExtraFiles.get(input)||[]),...added].slice(0,8);unitExtraFiles.set(input,next);setupUnitPhotoChoices(form,unit,filePools.get(form)||[])},0))}
  }

  function syncUnitPhotoChoices(form){const files=filePools.get(form)||[];form.querySelectorAll('.unit-editor').forEach(unit=>{const input=unit.querySelector('input[type="file"]');if(!input)return;const cloned=unit.querySelector('.unit-photo-choices');if(cloned&&!input.dataset.stage61UnitMedia)cloned.remove();setupUnitPhotoChoices(form,unit,files)})}

    window.clearListingUnitPhotos=(form,target)=>{const input=target.querySelector('input[type=file]');if(!input)return;unitPoolSelections.set(input,new Set());unitExtraFiles.set(input,[]);setupUnitPhotoChoices(form,target,filePools.get(form)||[])};window.copyListingUnitPhotos=(form,source,target)=>{const from=source.querySelector('input[type="file"]'),to=target.querySelector('input[type="file"]');if(!from||!to)return;unitPoolSelections.set(to,new Set(unitPoolSelections.get(from)||[]));unitExtraFiles.set(to,[...(unitExtraFiles.get(from)||[])]);setupUnitPhotoChoices(form,target,filePools.get(form)||[])};

  function setupPropertyMedia(form,steps){
    if(form.querySelector('.property-media-pool'))return;const firstInput=form.querySelector('input[type="file"][data-base-name="images"], input[type="file"][name="images"]'),firstUnit=form.querySelector('.unit-editor');if(!firstInput||!firstUnit)return;
    const firstLabel=firstInput.closest('label');if(firstLabel&&!firstUnit.contains(firstLabel))firstUnit.append(firstLabel);
    const pool=document.createElement('section');pool.className='property-media-pool wide';pool.innerHTML=`<div><span>Property photos</span><button type="button" class="property-media-add">+ Add media</button></div><p class="property-media-empty">Add photos once, then choose which ones each unit uses.</p><div class="property-media-grid"></div><input class="property-media-input" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>`;steps.after(pool);const picker=pool.querySelector('.property-media-input');
    pool.querySelector('.property-media-add').onclick=()=>picker.click();picker.onchange=()=>{const previous=filePools.get(form)||[],next=[...previous,...picker.files].slice(0,8),added=next.filter(file=>!previous.includes(file));form.querySelectorAll('.unit-editor input[type="file"]').forEach(input=>{const selected=unitPoolSelections.get(input)||new Set(previous);added.forEach(file=>selected.add(file));unitPoolSelections.set(input,selected)});filePools.set(form,next);renderPropertyPool(form,pool,firstInput);picker.value=''};
    form.querySelector('.quick-photo-start')?.remove();form.querySelectorAll('.unit-editor input[type="file"]').forEach(input=>input.closest('label').classList.add('unit-media-source'));
    renderPropertyPool(form,pool,firstInput);if(!form.dataset.stage61UnitObserver){form.dataset.stage61UnitObserver='true';form.addEventListener('click',event=>{if(event.target.closest('.add-unit'))setTimeout(()=>syncUnitPhotoChoices(form),0)})}
  }

  function improvePreview(form){const button=form.querySelector('.listing-preview-action'),output=form.querySelector('.listing-draft-preview');if(!button||button.dataset.stage61Preview)return;button.dataset.stage61Preview='true';button.addEventListener('click',()=>{const files=selectedPhotoFiles(form.querySelector('.unit-editor input[type="file"]'));if(!files.length)return;output.insertAdjacentHTML('afterbegin',`<div class="preview-media">${files.map((file,index)=>`<img src="${URL.createObjectURL(file)}" alt="Preview image ${index+1}">`).join('')}</div>`)})}

  function polishForm(form){if(!form||form.dataset.stage61Ready)return;form.dataset.stage61Ready='true';const sections=[...form.querySelectorAll('.composer-section')],property=sections.find(x=>x.textContent.includes('Property details')),unit=sections.find(x=>x.textContent.includes('Unit & availability')),propertyBody=property?.querySelector('.composer-section-body'),steps=form.querySelector('.listing-steps');
    if(propertyBody){groupRows(propertyBody,'Rules','property-rules',[['smokingAllowed','smoking'],['petsConsidered','pets']]);setupCustomFeatures(form,propertyBody);const advanced=[...propertyBody.querySelectorAll('.advanced-unit-settings')].find(x=>x.textContent.includes('Advanced property'));if(advanced){advanced.open=false;propertyBody.insertBefore(advanced,propertyBody.querySelector('.section-continue'))}}
    mergeUnitAdvanced(form,unit);if(steps)setupPropertyMedia(form,steps);improvePreview(form);
  }

  function polishListingStart(host){const start=host?.querySelector('.listing-start');if(!start||start.dataset.stage61Ready)return;start.dataset.stage61Ready='true';start.addEventListener('click',event=>{const button=event.target.closest('[data-add-mode]');if(button)start.querySelectorAll('[data-add-mode]').forEach(item=>item.classList.toggle('selected',item===button))},{capture:true})}
  const listBefore61=renderList;
  renderList=async function(){await listBefore61();const host=document.querySelector('#listingHost');polishListingStart(host);host?.querySelectorAll('form').forEach(polishForm);if(host&&!host.dataset.stage61Observer){host.dataset.stage61Observer='true';new MutationObserver(()=>{polishListingStart(host);host.querySelectorAll('form').forEach(polishForm)}).observe(host,{childList:true,subtree:true})}};

  let stopTimer=0,lastY=scrollY,ticking=false;const header=document.querySelector('.topbar');
  const reveal=()=>header?.classList.remove('scroll-hidden');
  addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{const y=scrollY;if(y<=12)reveal();else if(y>lastY+2)header?.classList.add('scroll-hidden');lastY=y;ticking=false});ticking=true}clearTimeout(stopTimer);stopTimer=setTimeout(reveal,180)},{passive:true});
  document.addEventListener('scrollend',reveal,{passive:true});
})();
