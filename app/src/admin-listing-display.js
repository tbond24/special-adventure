// Existing shared display switches, edited privately on desktop.
(() => {
  const key='site/listing-display';
  const fields=[
    ['card-services','Card and list service icons'],['listing-wifi','Wi-Fi in listing details'],
    ['listing-parking','Parking in listing details'],['listing-furnished','Furnished in listing details'],
    ['listing-ensuite','Private ensuite in listing details'],['listing-bills','Utilities included in listing details'],
    ['listing-security','Security in listing details'],['listing-custom','Lister-added features in listing details'],
    ['listing-water','Water in listing details'],['listing-electricity','Electricity in listing details']
  ];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const valid=x=>x&&Object.keys(x).length===1&&x.all&&
    Object.keys(x.all).length===fields.length&&fields.every(([id])=>typeof x.all[id]==='boolean');
  const same=(a,b)=>fields.every(([id])=>a?.all?.[id]===b?.all?.[id]);
  const esc=x=>escapeHtml(String(x??''));
  window.mountVacancyListingDisplay=async panel=>{
    if(!document.querySelector('[data-listing-display-style]')){
      const sheet=document.createElement('link');sheet.rel='stylesheet';
      sheet.href='/src/admin-listing-display.css?v=20261015';sheet.dataset.listingDisplayStyle='';
      document.head.append(sheet);
    }
    panel.classList.add('reviewed-listing-display');
    panel.innerHTML='<div class="section-head"><div><h2>Listing display</h2><p class="muted">Shared settings for all screen sizes. Listing facts and actions stay with the listing.</p></div><button type="button" data-display-reload>Reload settings</button></div>'+
      '<p class="display-mobile-note">Open this editor on a desktop to change shared listing display settings.</p>'+
      '<div class="display-desktop"><p data-display-state role="status">Loading settings.</p>'+
      '<div class="display-layout"><div><fieldset data-display-fields disabled><legend>Private draft</legend>'+
      fields.map(([id,label])=>'<label><input type="checkbox" data-display-slot="'+id+'">'+esc(label)+'</label>').join('')+
      '</fieldset><div class="row"><button type="button" data-display-save disabled>Save private draft</button>'+
      '<button type="button" data-display-review disabled>Review publication</button></div>'+
      '<p data-display-role class="muted"></p><details><summary>Published history</summary><div data-display-history></div></details></div>'+
      '<section class="display-preview"><h3>Draft preview</h3><label>Published listing<select data-display-listing><option>Loading listings</option></select></label>'+
      '<div class="row"><label>View<select data-display-view><option value="detail">Listing details</option><option value="card">Listing card</option></select></label>'+
      '<label>Screen size<select data-display-viewport><option value="390">Mobile</option><option value="1024">Desktop</option></select></label></div>'+
      '<p data-display-preview-state class="muted"></p><div class="display-frame-stage"><div data-display-frame-wrap>'+
      '<iframe title="Listing display private draft preview" sandbox="" referrerpolicy="no-referrer"></iframe></div></div></section></div>'+
      '<section data-display-review-panel hidden><h3>Review publication</h3><p>These shared settings affect public listings on all screen sizes.</p><ul data-display-diff></ul>'+
      '<label>Reason<textarea data-display-reason minlength="3" maxlength="500" rows="2"></textarea></label>'+
      '<label class="display-confirm"><input type="checkbox" data-display-confirm> I reviewed the changes and the public preview.</label>'+
      '<div class="row"><button type="button" data-display-publish disabled>Publish shared settings</button><button type="button" data-display-cancel>Cancel review</button></div></section></div>';
    const $=s=>panel.querySelector(s),owner=currentUser?.id,desktop=matchMedia('(min-width:1024px)');
    const state={ready:false,busy:false,conflict:false,published:null,config:null,saved:null,revision:0,version:0,base:0,canPublish:false,rows:[],seq:0,preview:false,requestId:null};
    const live=()=>panel.isConnected&&currentUser?.id===owner&&parseHash().name==='admin'&&VACANCY_BACKEND.assuranceLevel()==='aal2';
    const allowed=()=>live()&&desktop.matches;
    const dirty=()=>!same(state.config,state.saved);
    const changes=()=>fields.filter(([id])=>state.config?.all[id]!==state.published?.all[id]);
    const status=message=>{if(live())$('[data-display-state]').textContent=message;};
    const closeReview=()=>{$('[data-display-review-panel]').hidden=true;$('[data-display-confirm]').checked=false;state.requestId=null;};
    function buttons(){
      const enabled=allowed()&&state.ready&&!state.busy&&!state.conflict;
      $('[data-display-fields]').disabled=!enabled;
      $('[data-display-reload]').disabled=state.busy;
      $('[data-display-save]').disabled=!enabled||(!dirty()&&state.base===state.revision);
      $('[data-display-review]').disabled=!enabled||!state.canPublish||!state.version||dirty()||state.base!==state.revision||!changes().length||!state.preview;
      $('[data-display-publish]').disabled=$('[data-display-review]').disabled||
        !$('[data-display-confirm]').checked||$('[data-display-reason]').value.trim().length<3;
      $('[data-display-reason]').disabled=state.busy;
      $('[data-display-confirm]').disabled=state.busy;
      panel.querySelectorAll('[data-display-restore]').forEach(b=>b.disabled=!enabled||!state.canPublish);
    }
    function paint(){for(const [id] of fields)$('[data-display-slot="'+id+'"]').checked=state.config.all[id];buttons();}
    function fit(){
      const iframe=$('iframe'),wrap=$('[data-display-frame-wrap]'),stage=$('.display-frame-stage');
      const width=Number($('[data-display-viewport]').value),scale=Math.min(1,Math.max(1,stage.clientWidth-12)/width);
      iframe.style.width=width+'px';iframe.style.height='850px';iframe.style.transform='scale('+scale+')';
      wrap.style.width=width*scale+'px';wrap.style.height=850*scale+'px';
    }
    async function preview(){
      const seq=++state.seq;state.preview=false;buttons();
      const listing=state.rows.find(x=>x.id===$('[data-display-listing]').value);
      if(!listing){$('iframe').removeAttribute('srcdoc');$('[data-display-preview-state]').textContent='No public listing is available for a preview.';return;}
      try{
        const cardView=$('[data-display-view]').value==='card';
        const html=cardView?card(listing):await renderDetailQuiet(listing.id,listing,state.config.all);
        if(seq!==state.seq||!live())return;
        if(typeof html!=='string'||!html.includes(cardView?'listing-card':'quiet-detail'))throw Error('Existing renderer unavailable');
        const sprites=document.querySelector('.icon-sprite')?.outerHTML||'';
        $('iframe').srcdoc='<!doctype html><html lang="en" data-card-services="'+(state.config.all['card-services']?'on':'off')+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
          '<base href="'+esc(location.origin)+'/"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/src/stage95-vacancy-lite.css"><link rel="stylesheet" href="/src/detail-quiet-experiment.css">'+
          '<style>body{margin:0}body *{pointer-events:none!important}html,body{overflow-x:hidden}.listing-card{max-width:420px}</style></head><body>'+sprites+'<main id="app">'+html+'</main></body></html>';
        state.preview=true;fit();
        $('[data-display-preview-state]').textContent='Actual public renderer. Preview has no actions or tracking.';
      }catch{$('iframe').removeAttribute('srcdoc');$('[data-display-preview-state]').textContent='Preview unavailable. Reload settings to retry.';}
      buttons();
    }
    async function history(){
      const rows=await VACANCY_BACKEND.adminAppearanceHistory(key);if(!live())return;
      if(!Array.isArray(rows))throw Error('Published history unavailable');
      $('[data-display-history]').innerHTML=rows.map(r=>'<article><strong>'+(r.revision===0?'Initial settings':'Version '+Number(r.revision))+'</strong><p>'+esc(r.reason)+'</p>'+
        (state.canPublish&&r.revision<state.revision?'<button type="button" data-display-restore="'+Number(r.revision)+'">Restore to private draft</button>':'')+'</article>').join('');
    }
    async function load(){
      state.ready=false;state.preview=false;buttons();status('Loading settings.');
      const result=await VACANCY_BACKEND.adminAppearanceState(key);if(!live())return;
      const p=result?.published,d=result?.draft;
      if(!valid(p?.config)||d&&!valid(d.config)||!Number.isSafeInteger(p.revision))throw Error('Settings unavailable. Nothing can be published.');
      Object.assign(state,{published:clone(p.config),config:clone(d?.config||p.config),saved:clone(d?.config||p.config),
        revision:p.revision,version:d?.version||0,base:d?.baseRevision??p.revision,canPublish:result.canPublish===true,ready:true,conflict:false});
      closeReview();paint();
      $('[data-display-role]').textContent=state.canPublish?'Owner: save, review and publish shared settings.':'Operator: save your private draft. An Owner must prepare and publish their reviewed change.';
      await history();await preview();
      status(state.base!==state.revision?'Published settings changed. Review your private draft and save again before publishing.':
        state.version?'Your private draft is loaded. Public settings are unchanged.':'Published version '+state.revision+' loaded. Changes stay private until publication.');
    }
    async function action(run){
      if(!allowed()||state.busy)return;
      state.busy=true;buttons();
      try{await run();}catch(error){if(live()){if(error.status===409)state.conflict=true;status((error.message||'Request failed.')+(state.conflict?' Reload settings before continuing. Your edits remain visible.':''));}}
      finally{state.busy=false;if(live())buttons();}
    }
    $('[data-display-fields]').onchange=()=>{if(!allowed()||!state.ready||state.busy)return;for(const [id] of fields)state.config.all[id]=$('[data-display-slot="'+id+'"]').checked;closeReview();buttons();status('Unsaved private changes. Public settings are unchanged.');void preview();};
    $('[data-display-save]').onclick=()=>action(async()=>{
      const saved=await VACANCY_BACKEND.adminAppearanceSaveDraft(key,state.config,state.version,state.revision);if(!live())return;
      state.version=saved.version;state.base=saved.baseRevision;state.saved=clone(state.config);closeReview();
      status('Private draft saved. Public settings are unchanged.');
    });
    $('[data-display-review]').onclick=()=>{
      if($('[data-display-review]').disabled)return;
      $('[data-display-diff]').innerHTML=changes().map(([id,label])=>'<li>'+esc(label)+': '+(state.published.all[id]?'Shown':'Hidden')+' → '+(state.saved.all[id]?'Shown':'Hidden')+'</li>').join('');
      $('[data-display-review-panel]').hidden=false;$('[data-display-confirm]').checked=false;
      $('[data-display-reason]').focus();buttons();
    };
    $('[data-display-reason]').oninput=()=>{state.requestId=null;buttons();};
    $('[data-display-confirm]').onchange=buttons;
    $('[data-display-cancel]').onclick=closeReview;
    $('[data-display-publish]').onclick=()=>action(async()=>{
      if(!state.canPublish||dirty()||!state.preview||!$('[data-display-confirm]').checked)return;
      state.requestId??=crypto.randomUUID();
      await VACANCY_BACKEND.adminAppearancePublish(key,state.revision,state.version,$('[data-display-reason]').value.trim(),state.requestId);
      if(!live())return;
      await window.VACANCY_LISTING_OPTIONS.refresh();await load();status('Shared listing settings published.');
    });
    $('[data-display-history]').onclick=e=>{
      const button=e.target.closest('[data-display-restore]');if(!button||button.disabled)return;
      if(dirty()&&!confirm('Replace unsaved edits with this historical version?'))return;
      void action(async()=>{await VACANCY_BACKEND.adminAppearanceRestoreDraft(key,Number(button.dataset.displayRestore),state.version,state.revision);if(live()){await load();status('Historical settings copied to your private draft. Review and publish to apply.');}});
    };
    $('[data-display-reload]').onclick=()=>{if(dirty()&&!confirm('Discard unsaved edits and reload settings?'))return;void action(load);};
    for(const selector of ['[data-display-view]','[data-display-viewport]','[data-display-listing]'])$(selector).onchange=()=>{closeReview();void preview();};
    const onDesktopChange=()=>{if(!panel.isConnected){desktop.removeEventListener('change',onDesktopChange);return;}closeReview();buttons();};
    const observer=new ResizeObserver(()=>{if(!panel.isConnected){observer.disconnect();desktop.removeEventListener('change',onDesktopChange);return;}fit();buttons();});observer.observe($('.display-frame-stage'));
    desktop.addEventListener('change',onDesktopChange);
    if(!desktop.matches){status('Use a desktop to open the shared display editor.');return;}
    try{
      state.rows=(await VACANCY_BACKEND.activeVacancies()).slice(0,60);if(!live())return;
      $('[data-display-listing]').replaceChildren(...state.rows.map(v=>new Option(v.room?.name||'Listing',v.id)));
      await load();
    }catch(error){state.ready=false;status(error.message||'Display editor unavailable.');buttons();}
  };
})();
