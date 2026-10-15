// One shared, registered display setting. Reuses the appearance publication RPCs.
(() => {
  const key='listing-display/card-services';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const valid=config=>config&&typeof config==='object'&&!Array.isArray(config)&&
    (Object.keys(config).length===0||(Object.keys(config).length===1&&
      Object.keys(config.all||{}).length===1&&typeof config.all?.enabled==='boolean'));
  const enabled=config=>config.all?.enabled??true;
  let disposePrevious=null;
  window.mountVacancyDisplayDraft=async(host,onPublished)=>{
    disposePrevious?.();
    const owner=currentUser?.id;
    let state={published:{},saved:{},draft:{},revision:0,version:0,canPublish:false,
      ready:false,busy:false,preview:false,review:false,requestId:null,staleDraft:false};
    let disposed=false,sequence=0,pendingNavigation=null,allowNavigation=false,previewMarkup='',previewValue=null;
    host.className='display-draft';
    host.innerHTML='<style>.display-draft{padding-bottom:16px;border-bottom:1px solid var(--line,#e5e7eb)}.display-draft>label{display:flex;align-items:center;gap:8px}.display-draft input[type=checkbox]{width:18px;height:18px;flex:none}.display-draft [data-display-review-panel] label{display:grid;gap:6px}.display-draft-actions{display:flex;flex-wrap:wrap;gap:8px}.display-draft [data-display-reason]{width:100%;height:40px}.display-draft iframe{width:100%;max-width:410px;height:380px;border:1px solid #e5e7eb;border-radius:12px;pointer-events:none}.display-draft dialog{width:min(420px,calc(100vw - 32px))}.display-draft section{margin-top:14px}</style>'+
      '<h3>Card and list service icons</h3><p class="muted">Shared across listing result cards on all screen sizes. Prices and listing details stay as they are.</p>'+
      '<label><input type="checkbox" data-display-enabled disabled>Show service icons</label>'+
      '<p data-display-version></p><div class="display-draft-actions"><button type="button" data-display-reset disabled>Reset to published</button> '+
      '<button type="button" data-display-save disabled>Save private draft</button> <button type="button" data-display-review disabled>Review &amp; publish</button> '+
      '<button type="button" data-display-history>History</button> <button type="button" data-display-reload>Reload saved state</button></div>'+
      '<p data-display-status role="status">Loading display settings…</p>'+
      '<details><summary>Public card preview</summary><p data-display-preview-status>Loading a publicly available card…</p>'+
      '<iframe data-display-preview sandbox="" referrerpolicy="no-referrer" tabindex="-1" title="Read-only service-icon card preview"></iframe></details>'+
      '<section data-display-review-panel hidden><h4>Review shared display change</h4><p data-display-diff></p>'+
      '<p>Applies to every listing result card, including future listings, on all screen sizes.</p>'+
      '<label>Reason for change<input data-display-reason type="text" minlength="3" maxlength="500"></label>'+
      '<button type="button" data-display-publish disabled>Publish service-icon changes</button></section>'+
      '<section data-display-history-panel hidden><h4>Published display versions</h4><div data-display-versions></div></section>'+
      '<dialog aria-labelledby="display-leave-title"><h3 id="display-leave-title">Unsaved display changes</h3><p>Save a private draft, discard edits, or stay here.</p>'+
      '<button type="button" data-display-stay>Stay</button> <button type="button" data-display-discard>Discard</button> '+
      '<button type="button" data-display-leave-save>Save draft &amp; leave</button><p data-display-leave-status role="alert"></p></dialog>';
    const $=selector=>host.querySelector(selector),status=$('[data-display-status]'),dialog=$('dialog');
    const context=()=>!disposed&&host.isConnected&&location.hash==='#admin'&&currentUser?.id===owner&&
      VACANCY_BACKEND.assuranceLevel()==='aal2'&&
      (!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===owner);
    const dirty=()=>!equal(state.draft,state.saved);
    const canPublish=()=>context()&&state.ready&&!state.busy&&state.canPublish&&state.preview&&
      !dirty()&&!state.staleDraft&&state.version>0&&!equal(state.saved,state.published);
    const message=text=>{status.textContent=text;};
    const say=value=>value?'Shown':'Hidden';
    function paint(){
      $('[data-display-enabled]').checked=enabled(state.draft);
      $('[data-display-enabled]').disabled=!state.ready||state.busy||!context();
      $('[data-display-reset]').disabled=!state.ready||state.busy;
      $('[data-display-save]').disabled=!context()||!state.ready||state.busy||(!dirty()&&!state.staleDraft);
      $('[data-display-review]').disabled=!canPublish();
      $('[data-display-publish]').disabled=!canPublish()||!state.review||$('[data-display-reason]').value.trim().length<3;
      $('[data-display-reload]').disabled=state.busy;
      $('[data-display-history]').disabled=state.busy;
      $('[data-display-version]').textContent=state.ready?'Published revision '+state.revision+
        (state.version?' · Private draft '+state.version:'')+(state.canPublish?'':' · Owner publication required'):'';
      $('[data-display-review-panel]').hidden=!state.review;
      $('[data-display-diff]').textContent='Service icons: '+say(enabled(state.published))+' → '+say(enabled(state.saved))+'.';
      if(previewMarkup&&previewValue!==enabled(state.draft))paintPreview();
    }
    function paintPreview(){
      previewValue=enabled(state.draft);
      const esc=value=>escapeHtml(String(value));
      const assets=['/styles.css','/src/stage95-vacancy-lite.css','/src/detail-quiet-experiment.css'];
      const images=[...new DOMParser().parseFromString(previewMarkup,'text/html').images];
      const imageOrigins=[...new Set(images.map(img=>{try{return new URL(img.src).origin;}catch{return '';}}))]
        .filter(origin=>/^https:\/\//.test(origin)||/^http:\/\/127\.0\.0\.1:\d+$/.test(origin));
      const csp="default-src 'none'; style-src 'unsafe-inline' "+location.origin+"; img-src data: "+imageOrigins.join(' ')+"; font-src "+location.origin+"; form-action 'none'";
      $('[data-display-preview]').srcdoc='<!doctype html><html lang="en" data-card-services="'+(enabled(state.draft)?'on':'off')+'"><head>'+
        '<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+esc(csp)+'">'+
        assets.map(path=>'<link rel="stylesheet" href="'+esc(location.origin+path)+'">').join('')+
        '<style>body{margin:0;padding:10px}body *{pointer-events:none!important}.listing-card{max-width:380px}.listing-visual{height:180px}</style></head><body>'+
        (document.querySelector('.icon-sprite')?.outerHTML||'')+previewMarkup+'</body></html>';
    }
    async function preview(){
      try{
        if(typeof card!=='function')throw Error('Public card binding unavailable');
        const rows=await VACANCY_BACKEND.activeVacancies();
        if(!context()){cleanup();return;}
        if(!Array.isArray(rows)||!rows.length)throw Error('No public listing is available for preview');
        const row=rows.find(row=>card(row).includes('service-card-pill'))||rows[0];
        const template=document.createElement('template');template.innerHTML=card(row);
        template.content.querySelectorAll('script,iframe,object,embed,form,input,.listing-distance').forEach(node=>node.remove());
        template.content.querySelectorAll('*').forEach(node=>{
          for(const attr of [...node.attributes])if(/^on/i.test(attr.name)||['data-open-card','data-save','tabindex'].includes(attr.name))node.removeAttribute(attr.name);
          if(node.matches('a'))node.removeAttribute('href');
          if(node.matches('button')){node.disabled=true;node.classList.remove('saved');node.setAttribute('aria-pressed','false');node.setAttribute('aria-label','Listing action (preview only)');}
        });
        previewMarkup=template.innerHTML;state.preview=true;
        $('[data-display-preview-status]').textContent='Existing public card layout · preview only; actions cannot run.';
        paint();
      }catch(error){if(context())$('[data-display-preview-status]').textContent='Preview unavailable. '+error.message;}
    }
    async function load(){
      const turn=++sequence;
      const result=await VACANCY_BACKEND.adminAppearanceState(key);
      if(!context()){cleanup();return;}if(turn!==sequence)return;
      if(!valid(result?.published?.config)||!Number.isSafeInteger(result.published.revision)||
        (result.draft&&(!valid(result.draft.config)||!Number.isSafeInteger(result.draft.version))))throw Error('Display state was not confirmed');
      state.published=clone(result.published.config);state.revision=result.published.revision;
      state.saved=clone(result.draft?.config||state.published);state.draft=clone(state.saved);
      state.version=result.draft?.version||0;state.canPublish=result.canPublish===true;
      state.staleDraft=!!result.draft&&result.draft.baseRevision!==state.revision;
      state.ready=true;state.requestId=null;state.review=false;paint();
      message(state.staleDraft?'Your private draft is based on an older publication. Review the latest values and save it again.':
        state.version?'Your private draft is loaded. Public cards are unchanged.':'Published display settings loaded.');
    }
    async function write(action,allowUnready=false){
      if(!context()||state.busy||(!state.ready&&!allowUnready))return false;
      state.busy=true;paint();
      try{await action();return context();}
      catch(error){if(context())message(error.message||'Change was not confirmed. Your edits remain here.');return false;}
      finally{if(context()){state.busy=false;paint();}}
    }
    async function save(){
      const expected=clone(state.draft);
      const result=await VACANCY_BACKEND.adminAppearanceSaveDraft(key,expected,state.version,state.revision);
      if(!context()){cleanup();return;}
      if(!valid(result?.config)||!equal(result.config,expected)||!Number.isSafeInteger(result.version))throw Error('Private draft was not confirmed. Edits remain here.');
      state.saved=clone(result.config);state.draft=clone(result.config);state.version=result.version;state.staleDraft=false;
      state.review=false;state.requestId=null;message('Private draft saved. Nothing published.');
    }
    $('[data-display-enabled]').onchange=event=>{
      state.draft={all:{enabled:event.target.checked}};state.review=false;state.requestId=null;
      message('Unsaved private changes. Public cards are unchanged.');paint();
    };
    $('[data-display-reset]').onclick=()=>{state.draft=clone(state.published);state.review=false;state.requestId=null;paint();message('Published values previewed. Save privately before publishing any reset.');};
    $('[data-display-save]').onclick=()=>write(save);
    $('[data-display-review]').onclick=()=>{state.review=true;paint();};
    $('[data-display-reason]').oninput=paint;
    $('[data-display-publish]').onclick=()=>{
      if(!canPublish()||!state.review||$('[data-display-reason]').value.trim().length<3)return;
      write(async()=>{
        state.requestId=state.requestId||crypto.randomUUID();
        const confirmed=await VACANCY_BACKEND.adminAppearancePublish(key,state.revision,state.version,
          $('[data-display-reason]').value.trim(),state.requestId);
        if(!context()){cleanup();return;}
        if(!Number.isSafeInteger(confirmed?.revision))throw Error('Publication not confirmed. Retry preserves the same request ID.');
        const expected=clone(state.saved),revision=confirmed.revision;
        state.published=clone(expected);state.revision=revision;state.version=0;state.review=false;
        state.requestId=null;$('[data-display-reason]').value='';
        message('Published revision '+revision+'; checking public propagation…');
        try{
          const [published,options]=await Promise.all([
            VACANCY_BACKEND.siteAppearancePublished({anonymous:true}),
            VACANCY_BACKEND.listingDisplayOptions({anonymous:true})]);
          if(!context()){cleanup();return;}
          const row=Array.isArray(published)&&published.find(row=>row.key===key);
          const option=Array.isArray(options)&&options.find(row=>row.slot==='card-services');
          if(row?.revision!==revision||!equal(row.config,expected)||option?.enabled!==enabled(expected))throw Error('Public values are not confirmed');
          await onPublished?.();
          if(context())message('Published revision '+revision+'; verified in public settings.');
        }catch(error){if(context())message('Published revision '+revision+'; public propagation is unverified. Reload saved state and check again.');}
      });
    };
    $('[data-display-reload]').onclick=()=>{
      if(dirty()&&!confirm('Discard unsaved display edits and reload your saved state?'))return;
      write(load,true);
    };
    async function loadHistory(){
      const rows=await VACANCY_BACKEND.adminAppearanceHistory(key);
      if(!context()){cleanup();return;}
      if(!Array.isArray(rows)||rows.length>20||rows.some(row=>!Number.isSafeInteger(row.revision)||!valid(row.config)))throw Error('Display history is unavailable');
      const list=$('[data-display-versions]');list.replaceChildren();
      if(!rows.length)list.textContent='No published display changes yet.';
      for(const row of rows){
        const line=document.createElement('p'),text=document.createElement('span'),restore=document.createElement('button');
        text.textContent='Revision '+row.revision+' · '+say(enabled(row.config))+' ';
        restore.type='button';restore.textContent='Restore as draft';restore.dataset.displayRestore=String(row.revision);
        restore.disabled=!state.canPublish;restore.onclick=()=>write(async()=>{
          if(dirty())throw Error('Save or reset unsaved edits before restoring.');
          const result=await VACANCY_BACKEND.adminAppearanceRestoreDraft(key,row.revision,state.version,state.revision);
          if(!context()){cleanup();return;}
          if(!valid(result?.config)||!Number.isSafeInteger(result.version))throw Error('Restore draft was not confirmed');
          state.saved=clone(result.config);state.draft=clone(result.config);state.version=result.version;state.staleDraft=false;
          state.review=true;state.requestId=null;message('Earlier version copied to a private draft. Review and publish deliberately.');
        });
        line.append(text,restore);list.append(line);
      }
    }
    $('[data-display-history]').onclick=async()=>{
      $('[data-display-history-panel]').hidden=false;
      try{await loadHistory();}catch(error){if(context())message(error.message);}
    };
    function leave(){
      const go=pendingNavigation;pendingNavigation=null;state.draft=clone(state.saved);dialog.close();
      allowNavigation=true;try{go?.();}finally{allowNavigation=false;}
    }
    function ask(go){pendingNavigation=go;$('[data-display-leave-status]').textContent='';
      $('[data-display-leave-save]').disabled=state.busy||!state.ready;
      if(!dialog.open)dialog.showModal();}
    $('[data-display-stay]').onclick=()=>{pendingNavigation=null;dialog.close();};
    $('[data-display-discard]').onclick=leave;
    $('[data-display-leave-save]').onclick=async()=>{
      $('[data-display-leave-save]').disabled=true;
      if(await write(save))leave();
      else if(context()){$('[data-display-leave-status]').textContent='Not saved. Your edits are still here.';$('[data-display-leave-save]').disabled=false;}
    };
    function guardClick(event){
      if(!context()){cleanup();return;}
      if(allowNavigation||!dirty()||event.defaultPrevented)return;
      const node=event.target.closest?.('a[href],button[data-nav],#adminRefresh,#adminSectionMenu button[data-section]');
      if(!node||node.closest('dialog')||node.target==='_blank'||node.hasAttribute('download'))return;
      if(node.matches('a[href]')&&new URL(node.href,location.href).hash==='#admin')return;
      if(node.dataset.section==='icons')return;
      event.preventDefault();event.stopImmediatePropagation();ask(()=>node.click());
    }
    function guardSelect(event){
      if(!context()||allowNavigation||!dirty()||!event.target.matches('.admin-section-select'))return;
      const node=event.target,value=node.value;if(value==='icons')return;
      event.stopImmediatePropagation();node.value='icons';
      ask(()=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));});
    }
    function guardHash(event){
      if(disposed||allowNavigation||!host.isConnected||currentUser?.id!==owner||!dirty()||location.hash==='#admin')return;
      const target=location.hash;event.stopImmediatePropagation();history.replaceState(null,'',event.oldURL);
      ask(()=>{location.hash=target;});
    }
    const unload=event=>{if(context()&&dirty()){event.preventDefault();event.returnValue='';}};
    function cleanup(){
      if(disposed)return;disposed=true;sequence++;observer.disconnect();
      document.removeEventListener('click',guardClick,true);document.removeEventListener('change',guardSelect,true);
      window.removeEventListener('hashchange',guardHash,true);window.removeEventListener('beforeunload',unload);
      window.removeEventListener('storage',checkAccount);
      dialog.close();host.replaceChildren();if(disposePrevious===cleanup)disposePrevious=null;
    }
    const observer=new MutationObserver(()=>{if(!context())cleanup();});
    const checkAccount=()=>{if(!context())cleanup();};
    observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
    document.addEventListener('click',guardClick,true);document.addEventListener('change',guardSelect,true);
    window.addEventListener('hashchange',guardHash,true);window.addEventListener('beforeunload',unload);
    window.addEventListener('storage',checkAccount);
    disposePrevious=cleanup;
    await Promise.all([load().catch(error=>{if(context())message('Display settings unavailable. '+error.message);}),preview()]);
  };
})();
