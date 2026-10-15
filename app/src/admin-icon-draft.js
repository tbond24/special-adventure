(() => {
 window.mountVacancyIconDrafts=async(panel,lib)=>{
  if(!window.mountVacancyPresentationDraft)await import('./admin-presentation-draft.js?v=20261015-brand');
  const {slots,labels,overrides,makeNodes,refresh,validPath,svgPathData,listingOptions}=lib;
  const NS='http://www.w3.org/2000/svg',grid=panel.querySelector('#iconSlots'),editor=panel.querySelector('#iconEditor');
  const catalogHost=panel.querySelector('[data-icon-catalog-draft]');
  let selected=slots[0],proposal='custom-'+crypto.randomUUID().replaceAll('-','');
  try{const proposals=await VACANCY_BACKEND.adminIconProposals();if(proposals?.length)proposal=proposals[0].split('/')[1];}catch{}
  const empty=c=>c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===0;
  const valid=c=>empty(c)||(c&&Object.keys(c).length===1&&((typeof c.source_slot==='string'&&slots.includes(c.source_slot))||(validPath(c.path_d)&&Object.hasOwn(c,'path_d'))));
  const summary=c=>c.source_slot?'Built-in: '+(labels.get(c.source_slot)||c.source_slot):c.path_d?'Custom SVG path: '+c.path_d:'Compiled original';
  async function upload(file){
   if(!file||file.size>20000)throw Error('Choose an SVG smaller than 20 KB.');
   const doc=new DOMParser().parseFromString(await file.text(),'image/svg+xml'),root=doc.documentElement;
   if(root.localName!=='svg'||root.getAttribute('viewBox')?.trim()!=='0 0 24 24'||doc.querySelector('parsererror'))throw Error('Use a simple SVG with a 0 0 24 24 viewBox.');
   return svgPathData(root);
  }
  function preview(host,c,slot){const svg=document.createElementNS(NS,'svg');svg.classList.add('icon-library-svg');host.classList.add('icon-library-preview');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-label','Private icon preview');svg.setAttribute('role','img');svg.replaceChildren(...makeNodes(c,slot));host.replaceChildren(svg);}
  async function confirm(slot,c){
   const rows=await VACANCY_BACKEND.siteIconOverrides({anonymous:true}),row=rows.find(row=>row.slot===slot);
   return empty(c)?!row:!!row&&(row.source_slot||null)===(c.source_slot||null)&&(row.path_d||null)===(c.path_d||null);
  }
  function drawGrid(){
   const query=panel.querySelector('#iconSearch').value.toLowerCase();grid.replaceChildren();
   for(const slot of slots.filter(slot=>(labels.get(slot)||slot).toLowerCase().includes(query))){
    const button=document.createElement('button'),svg=document.createElementNS(NS,'svg'),use=document.createElementNS(NS,'use');
    button.type='button';button.className='icon-library-item'+(slot===selected?' selected':'');button.dataset.iconTarget=slot;
    svg.setAttribute('viewBox','0 0 24 24');svg.classList.add('icon-library-svg');use.setAttribute('href','#icon-'+slot);svg.append(use);button.append(svg,document.createTextNode(labels.get(slot)||slot));
    button.onclick=()=>editor.requestDraftNavigation?.(()=>{selected=slot;drawGrid();void mountIcon();});grid.append(button);
   }
  }
  async function mountIcon(){
   const slot=selected,custom=listingOptions().some(row=>row.slot===slot);
   await window.mountVacancyPresentationDraft(editor,{
    key:'site-icon/'+slot,title:labels.get(slot)||slot,impact:'Changes this shared icon wherever it is used across the site. Customer choices and listing content stay unchanged.',valid,summary,
    mount(host,api){
     const label=document.createElement('label'),select=document.createElement('select');label.textContent='Use a built-in icon';select.dataset.iconSource='';select.add(new Option('Choose an icon',''));
     for(const item of slots.filter(item=>!listingOptions().some(row=>row.slot===item)))select.add(new Option(labels.get(item)||item,item));
     label.append(select);const uploadLabel=document.createElement('label'),file=document.createElement('input');uploadLabel.textContent='Or upload a 24 × 24 SVG';file.type='file';file.accept='.svg,image/svg+xml';file.dataset.iconUpload='';uploadLabel.append(file);
     const original=document.createElement('button');original.type='button';original.textContent='Use compiled original (draft)';original.dataset.iconOriginal='';original.disabled=custom;
     original.onclick=()=>api.change({});select.onchange=()=>{if(select.value)api.change({source_slot:select.value});};
     let serial=0;file.onchange=async()=>{const turn=++serial;try{const path=await upload(file.files?.[0]);if(api.current()&&turn===serial)api.change({path_d:path});}catch(error){if(api.current())api.message(error.message);}};
     host.append(label,uploadLabel,original);
    },
    paint(host,target,c,enabled){const select=host.querySelector('[data-icon-source]');select.value=c.source_slot||'';select.disabled=!enabled;host.querySelector('[data-icon-upload]').disabled=!enabled;host.querySelector('[data-icon-original]').disabled=!enabled||custom;preview(target,c,slot);},
    confirm:c=>confirm(slot,c),onPublished:async()=>{await refresh();drawGrid();},
    review:(host,before,after)=>{host.replaceChildren();for(const [name,value] of [['Published',before],['Private draft',after]]){const box=document.createElement('div');box.textContent=name;preview(box,value,slot);const label=document.createElement('p');label.textContent=name;host.append(label,box);}},
    legacyHistory:async()=>{const rows=await VACANCY_BACKEND.adminIconRevisions(slot);return rows.map(row=>({id:row.id,config:row.source_slot?{source_slot:row.source_slot}:row.path_d?{path_d:row.path_d}:{}})).filter(row=>!custom||!empty(row.config));}
   });
  }
  async function mountCatalog(){
   const slot=proposal;
   await window.mountVacancyPresentationDraft(catalogHost,{
    key:'icon-catalog/'+slot,title:'New listing icon proposal',impact:'Publication adds one shared feature or utility choice to the listing forms. A private draft adds no public choice.',
    valid:c=>empty(c)||(c&&Object.keys(c).sort().join(',')==='kind,label,path_d'&&typeof c.label==='string'&&c.label.trim().length>=2&&c.label.trim().length<=60&&['amenity','utility'].includes(c.kind)&&validPath(c.path_d)),
    summary:c=>empty(c)?'No proposed listing icon':c.label+' · '+c.kind+' · custom SVG',
    editable:revision=>revision===0,canPublish:revision=>revision===0,
    mount(host,api){
     host.innerHTML='<label>Name<input data-catalog-label maxlength="60"></label><label>Type<select data-catalog-kind><option value="amenity">Amenity or feature</option><option value="utility">Utility</option></select></label><label>24 × 24 SVG<input data-catalog-file type="file" accept=".svg,image/svg+xml"></label>';
     let path='',serial=0;
     const update=()=>api.change({label:host.querySelector('[data-catalog-label]').value.trim(),kind:host.querySelector('[data-catalog-kind]').value,path_d:path});
     host.querySelector('[data-catalog-label]').onchange=update;host.querySelector('[data-catalog-kind]').onchange=update;
     host.querySelector('[data-catalog-file]').onchange=async event=>{const turn=++serial;try{const next=await upload(event.target.files?.[0]);if(api.current()&&turn===serial){path=next;update();}}catch(error){if(api.current())api.message(error.message);}};
     host.syncPath=value=>{path=value||'';};
    },
    paint(host,target,c,enabled){host.querySelector('[data-catalog-label]').value=c.label||'';host.querySelector('[data-catalog-kind]').value=c.kind||'amenity';host.syncPath(c.path_d);host.querySelectorAll('input,select').forEach(node=>node.disabled=!enabled);if(c.path_d)preview(target,{path_d:c.path_d},slots[0]);else target.replaceChildren();},
    confirm:async c=>{const rows=await VACANCY_BACKEND.siteIconSlots({anonymous:true});return rows.some(row=>row.slot===slot&&row.label===c.label&&row.listing_kind===c.kind)&&await confirm(slot,{path_d:c.path_d});},
    onPublished:async()=>{await refresh();drawGrid();}
   });
  }
  panel.querySelector('[data-new-icon-proposal]').onclick=()=>catalogHost.requestDraftNavigation?.(()=>{proposal='custom-'+crypto.randomUUID().replaceAll('-','');void mountCatalog();});
  panel.querySelector('#iconSearch').oninput=drawGrid;drawGrid();await Promise.all([mountIcon(),mountCatalog()]);
 };
})();
