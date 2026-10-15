// Private desktop editing for the existing shared sprite and listing choices.
(() => {
 const key='site/icon-library',NS='http://www.w3.org/2000/svg',clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 window.mountVacancyReviewedIcons=async panel=>{
  if(!document.querySelector('[data-reviewed-icons-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/src/admin-icon-editor.css?v=20261016';link.dataset.reviewedIconsStyle='';document.head.append(link);}
  panel.classList.add('reviewed-icons');
  panel.innerHTML='<div class="section-head"><div><h2>Icon library</h2><p>Shared icons and listing choices stay private until an Owner reviews and publishes them.</p></div><button type="button" data-icons-reload>Reload library</button></div>'+
   '<p class="icons-mobile-note">Open this editor on a desktop to change shared icons and listing choices.</p><div class="icons-desktop"><p role="status" data-icons-status>Loading library.</p>'+
   '<div class="icons-layout"><div><label>Find an icon<input type="search" data-icons-search></label><div data-icons-list></div></div>'+
   '<section><h3 data-icons-title></h3><div class="icons-preview-pair"><div><h4>Currently published</h4><div data-icons-picture="published"></div></div><div><h4>Your private draft</h4><div data-icons-picture="draft"></div></div></div>'+
   '<label>Use a built-in icon<select data-icons-source disabled></select></label><label>Or upload a 24 x 24 SVG<input type="file" accept=".svg,image/svg+xml" data-icons-file disabled></label>'+
   '<button type="button" data-icons-default disabled>Preview compiled original</button><div data-icons-legacy></div></section></div>'+
   '<details><summary>Add a listing feature or utility</summary><form data-icons-add><label>Name<input name="label" maxlength="60" minlength="2" required></label><label>Type<select name="kind"><option value="amenity">Amenity or feature</option><option value="utility">Utility</option></select></label><label>24 x 24 SVG<input name="file" type="file" accept=".svg,image/svg+xml" required></label><button type="submit" disabled>Add to private draft</button></form></details>'+
   '<div class="icons-actions"><button type="button" class="primary" data-icons-save disabled>Save private draft</button><button type="button" data-icons-review disabled>Review publication</button></div><p data-icons-role></p>'+
   '<section data-icons-review-panel hidden><h3>Review icon library publication</h3><p>Changed shared icons affect all screen sizes. New choices become available on Create and Edit. Existing listing selections remain.</p><ul data-icons-diff></ul>'+
   '<label>Reason<textarea rows="2" minlength="3" maxlength="500" data-icons-reason></textarea></label><label class="icons-confirm"><input type="checkbox" data-icons-confirm> I reviewed the icon previews and listing-choice changes.</label>'+
   '<div class="icons-actions"><button type="button" class="primary" data-icons-publish disabled>Publish icon library</button><button type="button" data-icons-cancel>Cancel review</button></div></section>'+
   '<details><summary>Published library history</summary><p>Restore artwork as a private draft. Listing choices added later are kept.</p><div data-icons-history></div></details></div>';
  const $=s=>panel.querySelector(s),actor=currentUser?.id,desktop=matchMedia('(min-width:1024px)'),lib=window.VACANCY_ICON_LIBRARY;
  const state={ready:false,busy:false,reading:false,proof:false,conflict:false,config:null,saved:null,published:null,revision:0,version:0,base:0,canPublish:false,selected:'find',requestId:null,seq:0};
  const live=()=>panel.isConnected&&currentUser?.id===actor&&parseHash().name==='admin'&&VACANCY_BACKEND.assuranceLevel()==='aal2';
  const allowed=()=>live()&&desktop.matches,dirty=()=>!same(state.config,state.saved);
  const changes=()=>Object.keys(state.config?.icons||{}).filter(slot=>!same(state.config.icons[slot],state.published?.icons[slot]));
  const status=text=>{if(live())$('[data-icons-status]').textContent=text;};
  const valid=x=>x&&Object.keys(x).length===1&&x.icons&&typeof x.icons==='object'&&!Array.isArray(x.icons)&&Object.keys(x.icons).length<=128&&Object.entries(x.icons).every(([slot,e])=>/^[a-z0-9-]+$/.test(slot)&&e&&Object.keys(e).length===4&&typeof e.label==='string'&&(e.kind===null||['amenity','utility'].includes(e.kind))&&(e.source===null||lib.builtins.includes(e.source))&&(e.path===null||lib.validPath(e.path))&&!(e.source&&e.path));
  const close=()=>{$('[data-icons-review-panel]').hidden=true;$('[data-icons-confirm]').checked=false;state.requestId=null;};
  function buttons(){
   const enabled=allowed()&&state.ready&&!state.busy&&!state.reading&&!state.conflict;
   for(const selector of ['[data-icons-source]','[data-icons-file]','[data-icons-add] button'])$(selector).disabled=!enabled;
   $('[data-icons-default]').disabled=!enabled||!lib.builtins.includes(state.selected);
   $('[data-icons-reload]').disabled=state.busy||state.reading;
   $('[data-icons-save]').disabled=!enabled||!state.proof||(!dirty()&&state.base===state.revision);
   $('[data-icons-review]').disabled=!enabled||!state.canPublish||!state.proof||!state.version||dirty()||state.base!==state.revision||!changes().length;
   $('[data-icons-publish]').disabled=$('[data-icons-review]').disabled||!$('[data-icons-confirm]').checked||$('[data-icons-reason]').value.trim().length<3;
   $('[data-icons-reason]').disabled=$('[data-icons-confirm]').disabled=state.busy;
   panel.querySelectorAll('[data-icons-restore],[data-icons-legacy-use]').forEach(b=>b.disabled=!enabled||b.hasAttribute('data-icons-restore')&&!state.canPublish);
  }
  function picture(where,entry){
   const target=$('[data-icons-picture="'+where+'"]');target.replaceChildren();
   if(!entry){target.textContent='Not published yet';return;}
   const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-label',where==='draft'?'Private icon preview':'Published icon preview');svg.setAttribute('role','img');
   svg.replaceChildren(...lib.previewNodes({source_slot:entry.source,path_d:entry.path},state.selected));target.append(svg);
  }
  function list(){
   const target=$('[data-icons-list]'),query=$('[data-icons-search]').value.trim().toLowerCase();target.replaceChildren();
   for(const [slot,entry] of Object.entries(state.config.icons).filter(([,e])=>e.label.toLowerCase().includes(query)).sort((a,b)=>a[1].label.localeCompare(b[1].label))){
    const b=document.createElement('button');b.type='button';b.dataset.iconsSlot=slot;b.textContent=entry.label+(state.published.icons[slot]?'':' (private new choice)');b.setAttribute('aria-pressed',String(slot===state.selected));b.onclick=()=>{state.selected=slot;close();list();draw();void legacy();};target.append(b);
   }
  }
  function draw(){
   const entry=state.config.icons[state.selected];$('[data-icons-title]').textContent=entry.label;
   picture('published',state.published.icons[state.selected]);picture('draft',entry);
   const select=$('[data-icons-source]');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=entry.path?'Uploaded custom path':'Compiled original';select.append(empty);
   for(const slot of lib.builtins.filter(id=>state.published.icons[id]?.kind===null)){const option=document.createElement('option');option.value=slot;option.textContent=state.config.icons[slot]?.label||slot;select.append(option);}select.value=entry.source||'';
   state.proof=true;buttons();
  }
  async function legacy(){
   const seq=++state.seq,slot=state.selected,target=$('[data-icons-legacy]');target.replaceChildren();
   if(!state.published.icons[slot])return;
   try{const rows=await VACANCY_BACKEND.adminIconRevisions(slot);if(!live()||seq!==state.seq)return;
    if(!rows.length)return;const heading=document.createElement('h4');heading.textContent='Earlier artwork';target.append(heading);
    for(const row of rows){const b=document.createElement('button');b.type='button';b.dataset.iconsLegacyUse=String(row.id);b.textContent='Preview earlier artwork · '+new Date(row.created_at).toLocaleString();
     b.onclick=()=>{if(!allowed()||b.disabled)return;const e=state.config.icons[state.selected];if(e.kind&&!row.source_slot&&!row.path_d){status('This listing choice needs artwork.');return;}e.source=row.source_slot;e.path=row.path_d;close();draw();status('Earlier artwork previewed privately. Save, review and publish to apply.');};target.append(b);}buttons();
   }catch(error){if(live()&&seq===state.seq)target.textContent='Earlier artwork unavailable: '+error.message;}
  }
  async function history(){
   const rows=await VACANCY_BACKEND.adminAppearanceHistory(key);if(!live())return;
   if(!Array.isArray(rows)||rows.some(r=>!valid(r.config)))throw Error('Library history unavailable');
   const target=$('[data-icons-history]');target.replaceChildren();
   for(const row of rows){const line=document.createElement('article'),text=document.createElement('span');text.textContent=(row.revision===0?'Initial library':'Version '+row.revision)+' · '+row.reason;line.append(text);
    if(state.canPublish&&row.revision!==state.revision){const b=document.createElement('button');b.type='button';b.dataset.iconsRestore=String(row.revision);b.textContent='Restore to private draft';b.onclick=()=>{if(dirty()&&!confirm('Replace unsaved library changes with this historical artwork?'))return;void action(async()=>{await VACANCY_BACKEND.adminAppearanceRestoreDraft(key,row.revision,state.version,state.revision);if(live()){await load();status('Historical artwork copied to your private draft. Later listing choices are kept.');}});};line.append(b);}target.append(line);}
  }
  async function load(){
   state.ready=false;state.proof=false;buttons();status('Loading icon library.');
   const result=await VACANCY_BACKEND.adminAppearanceState(key);if(!live())return;
   const p=result?.published,d=result?.draft;if(!valid(p?.config)||d&&!valid(d.config)||!Number.isSafeInteger(p.revision))throw Error('Icon library unavailable. Nothing can be published.');
   Object.assign(state,{ready:true,conflict:false,config:d?{icons:{...clone(p.config.icons),...clone(d.config.icons)}}:clone(p.config),saved:clone(d?.config||p.config),published:clone(p.config),revision:p.revision,version:d?.version||0,base:d?.baseRevision??p.revision,canPublish:result.canPublish===true});
   if(!state.config.icons[state.selected])state.selected=Object.keys(state.config.icons)[0];close();list();draw();await history();await legacy();
   $('[data-icons-role]').textContent=state.canPublish?'Owner: save, review and publish the shared library.':'Operator: save your private draft. An Owner prepares and publishes the reviewed change.';
   status(state.base!==state.revision?'Published library changed. Review your draft and save again before publishing.':state.version?'Your private icon library draft is loaded.':'Published icon library version '+state.revision+' loaded.');buttons();
  }
  async function action(run){
   if(!allowed()||state.busy||state.reading)return;state.busy=true;buttons();
   try{await run();}catch(error){if(live()){if(error.status===409)state.conflict=true;status((error.message||'Request failed.')+(state.conflict?' Reload library before continuing. Your draft remains visible.':''));}}
   finally{state.busy=false;if(live())buttons();}
  }
  async function read(file){
   if(!file||file.size>20000)throw Error('Choose an SVG smaller than 20 KB.');
   const doc=new DOMParser().parseFromString(await file.text(),'image/svg+xml'),root=doc.documentElement;
   if(root.localName!=='svg'||root.getAttribute('viewBox')?.trim()!=='0 0 24 24'||doc.querySelector('parsererror'))throw Error('Use a 24 x 24 SVG icon.');
   return lib.svgPathData(root);
  }
  $('[data-icons-search]').oninput=()=>{if(state.ready)list();};
  $('[data-icons-source]').onchange=()=>{if(!allowed()||state.busy||state.reading)return;const e=state.config.icons[state.selected],value=$('[data-icons-source]').value;if(!value&&e.kind){draw();status('Choose artwork for this listing choice.');return;}e.source=value||null;e.path=null;close();draw();status('Icon previewed privately. Save the draft before review.');};
  $('[data-icons-default]').onclick=()=>{if(!allowed()||state.busy||state.reading)return;Object.assign(state.config.icons[state.selected],{source:null,path:null});close();draw();status('Compiled original previewed privately.');};
  $('[data-icons-file]').onchange=async()=>{
   if(!allowed()||!state.ready||state.busy||state.reading)return;const slot=state.selected,file=$('[data-icons-file]').files?.[0];if(!file)return;state.reading=true;buttons();
   try{const path=await read(file);if(!allowed()||state.selected!==slot)return;Object.assign(state.config.icons[slot],{source:null,path});close();draw();status('Custom icon previewed privately. Save the draft before review.');}
   catch(error){status((error.message||'Unsupported SVG.')+' Previous draft retained.');}finally{state.reading=false;if(live())buttons();}
  };
  $('[data-icons-add]').onsubmit=async event=>{
   event.preventDefault();if(!allowed()||!state.ready||state.busy||state.reading)return;const form=event.currentTarget;state.reading=true;buttons();
   try{
    const label=form.elements.label.value.trim(),kind=form.elements.kind.value,path=await read(form.elements.file.files?.[0]);if(!allowed())return;
    if(label.length<2||label.length>60||!['amenity','utility'].includes(kind))throw Error('Choose a category and a name of 2-60 characters.');
    if(Object.keys(state.config.icons).length>=128)throw Error('This library supports at most 128 slots.');
    if(Object.values(state.config.icons).some(e=>e.kind===kind&&e.label.toLowerCase()===label.toLowerCase()))throw Error('A listing choice with this name and category already exists.');
    const slot='custom-'+crypto.randomUUID().replaceAll('-','');state.config.icons[slot]={label,kind,source:null,path};state.selected=slot;form.reset();close();list();draw();await legacy();status('New listing choice previewed privately. Save, review and publish to make it available.');
   }catch(error){status((error.message||'Could not prepare choice.')+' Previous draft retained.');}finally{state.reading=false;if(live())buttons();}
  };
  $('[data-icons-save]').onclick=()=>action(async()=>{
   const out=await VACANCY_BACKEND.adminAppearanceSaveDraft(key,state.config,state.version,state.revision);if(!live())return;
   state.version=out.version;state.base=out.baseRevision;state.saved=clone(state.config);close();status('Private icon library draft saved. Public icons and listing choices are unchanged.');
  });
  $('[data-icons-review]').onclick=()=>{
   if($('[data-icons-review]').disabled)return;const target=$('[data-icons-diff]');target.replaceChildren();
   for(const slot of changes()){const li=document.createElement('li'),entry=state.config.icons[slot];li.textContent=entry.label+(state.published.icons[slot]?' — shared artwork changes':' — new '+entry.kind+' listing choice');for(const [label,e] of [['Published',state.published.icons[slot]],['Private',entry]]){const box=document.createElement('span');box.textContent=label+': ';if(e){const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('role','img');svg.setAttribute('aria-label',label+' '+entry.label);svg.replaceChildren(...lib.previewNodes({source_slot:e.source,path_d:e.path},slot));box.append(svg);}else box.append(document.createTextNode('New choice'));li.append(box);}target.append(li);}
   $('[data-icons-review-panel]').hidden=false;$('[data-icons-confirm]').checked=false;$('[data-icons-reason]').focus();buttons();
  };
  $('[data-icons-reason]').oninput=()=>{state.requestId=null;buttons();};$('[data-icons-confirm]').onchange=buttons;$('[data-icons-cancel]').onclick=close;
  $('[data-icons-publish]').onclick=()=>action(async()=>{
   state.requestId??=crypto.randomUUID();
   await VACANCY_BACKEND.adminAppearancePublish(key,state.revision,state.version,$('[data-icons-reason]').value.trim(),state.requestId);
   if(!live())return;await load();await lib.refresh();if(live())status('Icon library published.');
  });
  $('[data-icons-reload]').onclick=()=>{if(dirty()&&!confirm('Discard unsaved library changes and reload?'))return;void action(load);};
  const resize=()=>{if(!panel.isConnected)return;close();buttons();if(desktop.matches&&!state.ready&&!state.busy)void action(load);};
  const unload=event=>{if(live()&&dirty()){event.preventDefault();event.returnValue='';}};
  desktop.addEventListener('change',resize);window.addEventListener('beforeunload',unload);
  const detach=new MutationObserver(()=>{if(!panel.isConnected){desktop.removeEventListener('change',resize);window.removeEventListener('beforeunload',unload);detach.disconnect();}});detach.observe(document.body,{childList:true,subtree:true});
  if(!desktop.matches)return;
  try{await load();}catch(error){state.ready=false;status(error.message||'Icon library unavailable.');buttons();}
 };
})();
