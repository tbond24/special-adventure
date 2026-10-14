// Desktop-only, allowlisted visual editor. This is not a general CMS.
(() => {
  const registry=window.VACANCY_ADMIN_DESIGN_REGISTRY;
  if(!registry)return;
  const page=registry.pages[0],item=page.elements[0],key=item.key;
  const esc=value=>escapeHtml(String(value??''));
  const clone=value=>JSON.parse(JSON.stringify(value||{}));
  const equal=(a,b)=>JSON.stringify(a||{})===JSON.stringify(b||{});
  const scopes=['all','mobile','desktop'];
  const scopeNames={all:'All screen sizes',mobile:'Mobile only',desktop:'Desktop only'};
  const statusMessage=(node,value)=>{node.textContent=value||'';};
  function fieldHtml(name,field){
    const title=esc(field.label),id='design-field-'+name;
    if(field.kind==='choice')return '<label class="design-field" for="'+id+'"><span>'+title+'</span><select id="'+id+'" data-style-field="'+name+'"><option value="">Inherited</option>'+field.choices.map(x=>'<option value="'+x+'">'+esc(x)+'</option>').join('')+'</select></label>';
    if(field.kind==='colour')return '<label class="design-field" for="'+id+'"><span>'+title+'</span><input id="'+id+'" type="text" data-style-field="'+name+'" placeholder="Inherited · #RRGGBB" maxlength="7" spellcheck="false"></label>';
    const slider=name==='radius'?'<input aria-label="Border radius slider" data-radius-range type="range" min="0" max="40" step="1" value="0">':'';
    return '<label class="design-field" for="'+id+'"><span>'+title+'</span><span class="design-number"><input id="'+id+'" data-style-field="'+name+'" type="number" min="'+field.min+'" max="'+field.max+'" step="1" placeholder="Inherited"><small>'+esc(field.unit||'')+'</small></span>'+slider+'</label>';
  }
  function controlPanel(){
    const appearance=['width','height','radius','background','colour','opacity','border_width','border_colour','shadow'];
    const spacing=['margin_top','margin_bottom','margin_left','margin_right'];
    return '<h4>Appearance</h4>'+appearance.map(x=>fieldHtml(x,registry.fields[x])).join('')+
      '<h4>Spacing</h4>'+spacing.map(x=>fieldHtml(x,registry.fields[x])).join('');
  }
  const emptyMessage='No registered elements match that search. Unverified controls are not editable.';
  async function mount(section){
    if(section.dataset.designMounted==='true')return;
    section.dataset.designMounted='true';
    const sheet=document.createElement('link');sheet.rel='stylesheet';
    sheet.href='/admin-design-workspace.css?v=20261014-stage2';
    sheet.dataset.adminDesignStyle='';
    const ready=new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=()=>reject(new Error('Editor styles did not load'));});
    document.head.append(sheet);
    try{await ready}catch(error){section.textContent=error.message;section.dataset.designMounted='';return;}
    const ownerId=currentUser?.id;
    const state={previewMode:'mobile',editScope:'all',tab:'style',treeMode:'pages',
      listing:null,publicRows:[],published:{},draft:{},saved:{},publishedRevision:0,
      draftVersion:0,serverReady:false,canPublish:false,dirty:false,busy:false,
      previewProof:false,reviewOpen:false,renderSeq:0,loadSeq:0,history:[],invalidFields:new Set(),error:'',notice:'',publishRequestId:null};
    section.innerHTML='<div class="design-board">'+
      '<aside class="design-browser"><header><h2>Design &amp; Style</h2><p>Edit verified elements without touching code.</p></header>'+
        '<div class="design-browser-tabs" role="tablist" aria-label="Browse interface"><button type="button" data-tree="pages" aria-pressed="true">Pages</button><button type="button" data-tree="components" aria-pressed="false">Components</button></div>'+
        '<label class="design-search-label"><span>Search pages or elements</span><input type="search" data-tree-search placeholder="Search verified pages..." autocomplete="off"></label>'+
        '<div data-design-tree role="tree" aria-label="Registered editable page elements"></div>'+
        '<p class="design-footnote">Only elements linked to real Vacancy renderers are listed. Page settings never edit customer listing data.</p>'+
      '</aside>'+
      '<section class="design-preview"><header class="design-preview-head"><div><h2>Listing detail</h2><p class="design-route">/listings/:id/:slug · template-level settings</p></div>'+
        '<div class="design-preview-actions"><div role="group" aria-label="Public preview viewport"><button type="button" data-mode="mobile" aria-pressed="true">Mobile</button><button type="button" data-mode="desktop" aria-pressed="false">Desktop</button></div><a data-open-page href="#admin" target="_blank" rel="noopener noreferrer" aria-disabled="true">Open page ↗</a></div></header>'+
        '<p class="design-context">Preview uses a real publicly available listing. It is script-disabled: Save, contact, navigation and analytics cannot execute here.</p>'+
        '<div class="design-preview-source"><label for="design-listing-select">Public listing example</label><select id="design-listing-select" data-public-listing disabled><option>Loading public listings…</option></select></div>'+
        '<div class="design-viewport-stage"><div data-design-frame-wrap class="design-frame-wrap"><iframe data-design-frame sandbox="" referrerpolicy="no-referrer" title="Read-only public listing preview" tabindex="-1"></iframe><button type="button" data-select-preview aria-label="Select Save listing element">Selected: Save listing</button></div><p data-frame-status role="status">Preparing safe preview…</p></div>'+
        '<p class="design-preview-caption">Preview viewport: <strong data-logical-width>390 px</strong>. Edit scope is chosen independently in the inspector.</p>'+
      '</section>'+
      '<aside class="design-inspector"><header class="design-inspector-head"><h2>Edit Element</h2><button type="button" data-reset-scope>Reset</button><button type="button" data-save-draft disabled>Save draft</button></header>'+
        '<div class="design-element-summary"><strong>Save listing</strong><p>Page: Listing detail · Existing Saved action</p><div class="design-element-id"><code>'+esc(key)+'</code><button type="button" data-copy-id aria-label="Copy element ID">Copy</button></div></div>'+
        '<label class="design-scope">Edit scope<select data-edit-scope><option value="all">All screen sizes</option><option value="mobile">Mobile only</option><option value="desktop">Desktop only</option></select></label>'+
        '<div class="design-inspector-tabs" role="tablist" aria-label="Edit element"><button type="button" data-inspect="style" aria-pressed="true">Style</button><button type="button" data-inspect="content" aria-pressed="false">Content</button><button type="button" data-inspect="visibility" aria-pressed="false">Visibility</button><button type="button" data-inspect="advanced" aria-pressed="false">Advanced</button></div>'+
        '<div data-inspector-style class="design-inspector-scroll">'+controlPanel()+'</div>'+
        '<div data-inspector-content class="design-inspector-scroll" hidden><h4>Content</h4><p>The Save action label follows the public Saved state. Editing its text is not approved for this element.</p><p>Customer listing titles, prices and messages are never editable here.</p></div>'+
        '<div data-inspector-visibility class="design-inspector-scroll" hidden><h4>Visibility</h4><p>Visibility changes are not enabled for this action. Existing Saved behavior is preserved.</p></div>'+
        '<div data-inspector-advanced class="design-inspector-scroll" hidden><h4>Generated CSS (read-only)</h4><p>Derived from the registered, validated appearance fields. Arbitrary selectors and CSS are rejected.</p><pre data-generated-css tabindex="0"></pre></div>'+
        '<p data-draft-status class="design-draft-status" role="status">Checking editor permissions…</p>'+
        '<div class="design-release-tools"><button type="button" data-review disabled>Review &amp; publish</button><button type="button" data-history>History</button></div>'+
        '<div class="design-review" data-review-panel hidden><h3>Review impact before publishing</h3><p>Changes affect every public Listing detail page, not a selected customer listing. No Find card, Create listing or Edit listing style is changed.</p><p data-impact></p><div data-diff></div><label>Reason for change<input type="text" data-publish-reason minlength="3" maxlength="500" placeholder="Why is this change needed?"></label><button type="button" data-confirm-publish disabled>Publish selected changes</button></div>'+
        '<div class="design-history" data-history-panel hidden><h3>Published versions</h3><div data-history-list></div></div>'+
      '</aside></div>';
    const $=selector=>section.querySelector(selector);
    const status=$('[data-draft-status]'),frameStatus=$('[data-frame-status]');
    const contextValid=()=>section.isConnected&&currentUser?.id===ownerId&&
      VACANCY_BACKEND.assuranceLevel()==='aal2';
    const configScope=()=>state.draft[state.editScope]||{};
    function refreshTree(){
      const search=$('[data-tree-search]').value.trim().toLowerCase();
      const matched=!search || [page.name,item.name,item.key].some(t=>t.toLowerCase().includes(search));
      const node=$('[data-design-tree]');
      if(!matched){node.textContent=emptyMessage;return;}
      if(state.treeMode==='pages'){
        node.innerHTML='<div class="design-tree-page"><strong>⌄ Listing detail</strong><small>/listings/:id/:slug</small>'+
          '<button type="button" role="treeitem" data-select-element aria-selected="true">◈ Save listing <small>Listing detail</small></button></div>';
      }else{
        node.innerHTML='<button type="button" role="treeitem" data-select-element aria-selected="true"><strong>◈ Save listing</strong><small>Listing detail · existing .quiet-save</small></button>';
      }
    }
    function validCurrent(){
      return registry.validConfig(state.draft);
    }
    function refreshButtons(){
      state.dirty=!equal(state.draft,state.saved);
      const canSave=state.serverReady&&!state.busy&&state.dirty&&
        state.invalidFields.size===0&&validCurrent()&&contextValid();
      $('[data-save-draft]').disabled=!canSave;
      $('[data-reset-scope]').disabled=state.busy;
      const publishable=state.serverReady&&state.canPublish&&!state.busy&&
        state.invalidFields.size===0&&validCurrent()&&
        !state.dirty&&state.draftVersion>0&&!equal(state.draft,state.published)&&
        state.previewProof&&contextValid();
      $('[data-review]').disabled=!publishable;
      $('[data-confirm-publish]').disabled=!publishable||
        $('[data-publish-reason]').value.trim().length<3;
      if(state.error&&!state.busy)statusMessage(status,state.error);
      else if(state.notice&&!state.busy)statusMessage(status,state.notice);
      else if(state.busy)statusMessage(status,'Checking with the server…');
      else if(!state.serverReady)statusMessage(status,'Private editing unavailable until the approved appearance migration and Owner/Operator assignment are released.');
      else if(state.invalidFields.size||!validCurrent())statusMessage(status,'Invalid value: use the ranges and colour format shown.');
      else if(state.dirty)statusMessage(status,'Unsaved changes · preview only. Save a private draft before publishing.');
      else if(state.draftVersion>0)statusMessage(status,'Private draft saved (v'+state.draftVersion+'). Published site is unchanged until review and publish.');
      else statusMessage(status,'Using compiled public defaults · no private draft.');
    }
    function fieldsFromScope(){
      const values=configScope();
      for(const node of section.querySelectorAll('[data-style-field]')){
        const name=node.dataset.styleField;
        node.value=Object.prototype.hasOwnProperty.call(values,name)?String(values[name]):'';
        if(!state.invalidFields.has(name)){node.setCustomValidity('');node.removeAttribute('aria-invalid');}
      }
      const radius=Number(values.radius);
      const slider=$('[data-radius-range]');
      slider.disabled=!Number.isInteger(radius)||!Object.prototype.hasOwnProperty.call(values,'radius');
      slider.value=slider.disabled?'0':String(radius);
      $('[data-edit-scope]').value=state.editScope;
      $('[data-generated-css]').textContent=window.VACANCY_SITE_APPEARANCE?.cssForConfig(state.draft)||'/* Inherited compiled appearance; no overrides. */';
      $('[data-impact]').textContent='Scope: '+scopeNames[state.editScope]+'. Public preview mode: '+state.previewMode+'.';
      refreshButtons();
    }
    function updateValue(name,raw){
      const field=registry.fields[name];
      if(!field||state.busy)return;
      state.error='';state.notice='';state.publishRequestId=null;
      let value=raw;
      if(field.kind==='integer'&&raw!=='')value=Number(raw);
      if(raw!==''&&!registry.validField(name,value)){
        const fieldNode=section.querySelector('[data-style-field="'+name+'"]');
        state.invalidFields.add(name);
        fieldNode?.setCustomValidity('Value is outside the registered range');
        fieldNode?.setAttribute('aria-invalid','true');
        refreshButtons();return;
      }
      state.invalidFields.delete(name);
      const values={...configScope()};
      if(raw==='')delete values[name];else values[name]=value;
      if(Object.keys(values).length)state.draft[state.editScope]=values;
      else delete state.draft[state.editScope];
      fieldsFromScope();void renderPreview();
    }
    function paintDiff(){
      const rows=[];
      for(const scope of scopes){
        const before=state.published[scope]||{},after=state.draft[scope]||{};
        for(const field of Object.keys(registry.fields)){
          const prev=Object.prototype.hasOwnProperty.call(before,field)?String(before[field]):'Inherited';
          const next=Object.prototype.hasOwnProperty.call(after,field)?String(after[field]):'Inherited';
          if(prev!==next)rows.push('<tr><td>'+esc(scopeNames[scope])+'</td><td>'+esc(registry.fields[field].label)+'</td><td>'+esc(prev)+'</td><td>'+esc(next)+'</td></tr>');
        }
      }
      $('[data-diff]').innerHTML=rows.length?
        '<table><thead><tr><th>Viewport</th><th>Property</th><th>Published</th><th>Proposed</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>':
        '<p>No changes compared with the published version.</p>';
    }
    function previewDocument(markup){
      const sprites=document.querySelector('.icon-sprite')?.outerHTML||'';
      const css=window.VACANCY_SITE_APPEARANCE?.cssForConfig(state.draft)||'';
      return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
        '<meta name="referrer" content="no-referrer"><base href="'+esc(location.origin)+'/">'+
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/src/stage95-vacancy-lite.css">'+
        '<link rel="stylesheet" href="/src/detail-quiet-experiment.css">'+
        '<style>'+css+'.quiet-detail .quiet-save{outline:3px dashed #f76a29!important;outline-offset:3px!important}'+
        'html,body{overflow-x:hidden}body *{pointer-events:none!important}</style></head><body>'+
        sprites+'<main id="app">'+markup+'</main></body></html>';
    }
    function resizeFrame(){
      const wrap=$('[data-design-frame-wrap]'),stage=$('.design-viewport-stage');
      const iframe=$('[data-design-frame]');
      const logical=state.previewMode==='mobile'?390:1280;
      const height=state.previewMode==='mobile'?980:1100;
      const available=Math.max(240,stage.clientWidth-36);
      const scale=Math.min(1,available/logical);
      iframe.style.width=logical+'px';iframe.style.height=height+'px';
      iframe.style.transform='scale('+scale+')';
      wrap.style.width=(logical*scale)+'px';wrap.style.height=(height*scale)+'px';
      $('[data-logical-width]').textContent=logical+' px';
    }
    async function renderPreview(){
      const id=++state.renderSeq;
      state.previewProof=false;
      if(!state.listing){
        $('[data-design-frame]').removeAttribute('srcdoc');
        statusMessage(frameStatus,'No published public listing is available for an in-context preview.');
        refreshButtons();return;
      }
      statusMessage(frameStatus,'Preparing read-only public listing…');
      try{
        // This calls the existing renderer's pure markup branch. It never
        // invokes product actions, telemetry, navigation, maps or lightboxes.
        const html=await renderDetailQuiet(state.listing.id,state.listing);
        if(id!==state.renderSeq||!contextValid())return;
        if(typeof html!=='string'||!html.includes('class="quiet-detail"')||
           !html.includes('class="quiet-icon-button quiet-save"'))
          throw new Error('Real Save listing binding not found. Nothing was substituted.');
        const iframe=$('[data-design-frame]');
        iframe.srcdoc=previewDocument(html);
        state.previewProof=true;
        resizeFrame();
        statusMessage(frameStatus,'Actual public renderer · script-disabled · no actions or tracking.');
      }catch(error){
        if(id!==state.renderSeq||!contextValid())return;
        state.previewProof=false;$('[data-design-frame]').removeAttribute('srcdoc');
        statusMessage(frameStatus,'Preview unavailable: '+(error.message||'Unknown renderer error'));
      }
      refreshButtons();
    }
    async function refreshHistory(){
      const node=$('[data-history-list]');
      node.textContent='Loading history…';
      try{
        const rows=await VACANCY_BACKEND.adminAppearanceHistory(key);
        if(!contextValid())return;
        state.history=Array.isArray(rows)?rows:[];
        node.innerHTML=state.history.length?state.history.map(row=>
          '<article><strong>Version '+Number(row.revision)+'</strong><small>'+esc(row.published_at||'')+
          ' · '+esc(row.reason||'')+'</small>'+((state.canPublish&&Number(row.revision)<state.publishedRevision)?
          '<button type="button" data-restore="'+Number(row.revision)+'">Restore to private draft</button>':'')+'</article>'
        ).join(''):'No previous published versions.';
      }catch(error){if(contextValid())node.textContent='History unavailable: '+(error.message||'Read failed');}
    }
    async function loadServerState(){
      const id=++state.loadSeq;
      if(!contextValid())return;
      try{
        const result=await VACANCY_BACKEND.adminAppearanceState(key);
        if(id!==state.loadSeq||!contextValid())return;
        const p=result?.published,d=result?.draft;
        if(!p||!registry.validConfig(p.config)||d&&!registry.validConfig(d.config))
          throw new Error('Invalid or unavailable appearance state');
        state.published=clone(p.config);state.publishedRevision=Number(p.revision)||0;
        state.draft=clone(d?.config||p.config);state.saved=clone(state.draft);
        state.draftVersion=Number(d?.version)||0;
        state.canPublish=result.canPublish===true;
        state.serverReady=true;
      }catch(error){
        if(id!==state.loadSeq||!contextValid())return;
        state.serverReady=false;state.canPublish=false;
      }
      fieldsFromScope();
      await renderPreview();
    }
    async function loadListings(){
      try{
        const rows=await VACANCY_BACKEND.activeVacancies();
        if(!contextValid())return;
        state.publicRows=Array.isArray(rows)?rows.slice(0,60):[];
        const selector=$('[data-public-listing]');
        selector.replaceChildren();
        if(!state.publicRows.length){
          selector.add(new Option('No public listings available',''));selector.disabled=true;
          state.listing=null;
        }else{
          for(const row of state.publicRows){
            const label=(row.room?.name||'Listing')+' · '+(row.property?.suburb||row.property?.city||'Location');
            selector.add(new Option(label.slice(0,115),row.id));
          }
          selector.disabled=false;state.listing=state.publicRows[0];
        }
        updateOpenPage();await renderPreview();
      }catch(error){
        if(contextValid()){
          state.listing=null;$('[data-public-listing]').replaceChildren(new Option('Public listing read unavailable',''));
          statusMessage(frameStatus,'Cannot load public-only listings: '+(error.message||'Network error'));
        }
      }
    }
    function updateOpenPage(){
      const link=$('[data-open-page]');
      if(!state.listing){link.href='#admin';link.setAttribute('aria-disabled','true');return;}
      link.href=publicListingPath(state.listing);
      link.removeAttribute('aria-disabled');
    }
    async function runWrite(action){
      if(!state.serverReady||state.busy||!contextValid())return;
      state.error='';state.notice='';state.busy=true;refreshButtons();
      try{await action();}
      catch(error){if(contextValid())state.error='Request failed: '+(error.message||'Unknown server error')+'. Reload before retrying after conflicts.';}
      finally{state.busy=false;refreshButtons();}
    }
    $('[data-tree-search]').addEventListener('input',refreshTree);
    section.querySelectorAll('[data-tree]').forEach(button=>button.onclick=()=>{
      state.treeMode=button.dataset.tree;
      section.querySelectorAll('[data-tree]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
      refreshTree();
    });
    $('[data-design-tree]').onclick=event=>{
      if(!event.target.closest('[data-select-element]'))return;
      $('[data-design-tree] [data-select-element]')?.focus();
    };
    $('[data-select-preview]').onclick=()=>{$('[data-design-tree] [data-select-element]')?.focus();};
    section.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{
      state.previewMode=button.dataset.mode;
      section.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
      resizeFrame();fieldsFromScope();void renderPreview();
    });
    $('[data-public-listing]').onchange=event=>{
      state.listing=state.publicRows.find(row=>row.id===event.target.value)||null;
      updateOpenPage();void renderPreview();
    };
    $('[data-edit-scope]').onchange=event=>{state.editScope=event.target.value;fieldsFromScope();};
    section.querySelectorAll('[data-style-field]').forEach(input=>{
      input.addEventListener(input.tagName==='SELECT'?'change':'change',event=>
        updateValue(input.dataset.styleField,event.target.value.trim()));
    });
    $('[data-radius-range]').addEventListener('input',event=>updateValue('radius',event.target.value));
    section.querySelectorAll('[data-inspect]').forEach(button=>button.onclick=()=>{
      state.tab=button.dataset.inspect;
      section.querySelectorAll('[data-inspect]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
      for(const name of ['style','content','visibility','advanced'])
        section.querySelector('[data-inspector-'+name+']').hidden=state.tab!==name;
      fieldsFromScope();
    });
    $('[data-copy-id]').onclick=async()=>{
      try{await navigator.clipboard.writeText(key);statusMessage(status,'Stable element ID copied.');}
      catch{statusMessage(status,'Copy unavailable in this browser. ID: '+key);}
    };
    $('[data-reset-scope]').onclick=()=>{
      state.error='';state.notice='';state.publishRequestId=null;state.invalidFields.clear();
      const original=state.published[state.editScope];
      if(original&&Object.keys(original).length)state.draft[state.editScope]=clone(original);
      else delete state.draft[state.editScope];
      fieldsFromScope();void renderPreview();
    };
    $('[data-save-draft]').onclick=()=>runWrite(async()=>{
      if(!state.dirty||!validCurrent())return;
      const saved=await VACANCY_BACKEND.adminAppearanceSaveDraft(
        key,state.draft,state.draftVersion,state.publishedRevision);
      if(!contextValid())return;
      if(!saved||!registry.validConfig(saved.config))throw new Error('Server did not confirm draft');
      state.draftVersion=Number(saved.version);state.draft=clone(saved.config);
      state.saved=clone(saved.config);fieldsFromScope();
      state.notice='Private draft saved. Nothing published.';
    });
    $('[data-review]').onclick=()=>{state.reviewOpen=true;$('[data-review-panel]').hidden=false;paintDiff();refreshButtons();};
    $('[data-publish-reason]').addEventListener('input',refreshButtons);
    $('[data-confirm-publish]').onclick=()=>runWrite(async()=>{
      if(state.dirty||state.invalidFields.size||!validCurrent()||!state.previewProof||!state.canPublish)return;
      const reason=$('[data-publish-reason]').value.trim();
      if(reason.length<3)return;
      state.publishRequestId=state.publishRequestId||crypto.randomUUID();
      const result=await VACANCY_BACKEND.adminAppearancePublish(
        key,state.publishedRevision,state.draftVersion,reason,state.publishRequestId);
      if(!contextValid())return;
      if(!Number.isInteger(Number(result?.revision)))throw new Error('Publication was not confirmed');
      // Verify the public read after transaction before saying it propagated.
      const published=await VACANCY_BACKEND.siteAppearancePublished();
      const row=Array.isArray(published)&&published.find(x=>x.key===key);
      if(!contextValid())return;
      if(!row||Number(row.revision)!==Number(result.revision)){
        state.serverReady=false;
        throw new Error('Published but public propagation is unverified. Reload safely.');
      }
      state.published=clone(row.config);state.draft=clone(row.config);
      state.saved=clone(row.config);state.publishedRevision=Number(row.revision);
      state.draftVersion=0;state.publishRequestId=null;$('[data-review-panel]').hidden=true;state.reviewOpen=false;
      $('[data-publish-reason]').value='';
      await window.VACANCY_SITE_APPEARANCE?.refresh();
      fieldsFromScope();await renderPreview();await refreshHistory();
      state.notice='Published revision '+state.publishedRevision+'; verified by the public settings read. Confirm public rendering separately.';
    });
    $('[data-history]').onclick=()=>{
      const panel=$('[data-history-panel]');panel.hidden=!panel.hidden;
      if(!panel.hidden)void refreshHistory();
    };
    $('[data-history-list]').onclick=event=>{
      const button=event.target.closest('[data-restore]');if(!button||!state.canPublish)return;
      const revision=Number(button.dataset.restore);
      runWrite(async()=>{
        if(state.dirty)throw new Error('Save or discard unsaved changes before restoring a version');
        const restored=await VACANCY_BACKEND.adminAppearanceRestoreDraft(
          key,revision,state.draftVersion,state.publishedRevision);
        if(!contextValid())return;
        if(!restored||!registry.validConfig(restored.config))throw new Error('Restore draft not confirmed');
        state.draft=clone(restored.config);state.saved=clone(restored.config);
        state.draftVersion=Number(restored.version);
        fieldsFromScope();await renderPreview();
        $('[data-review-panel]').hidden=false;paintDiff();
        state.notice='Earlier version copied to your private draft. Review and publish deliberately.';
      });
    };

    // Stay / Discard / Save draft are the only choices for leaving this
    // editor through existing in-app navigation or admin Refresh.
    // Tabs/browser close still use the native beforeunload warning below.
    const leaveDialog=document.createElement('dialog');
    leaveDialog.className='design-leave-dialog';
    leaveDialog.setAttribute('aria-labelledby','design-leave-title');
    leaveDialog.innerHTML='<h3 id="design-leave-title">Unsaved appearance changes</h3>'+
      '<p>The public website has not been changed. Save a private draft, discard these edits, or stay here.</p>'+
      '<div class="design-leave-actions"><button type="button" data-leave-stay>Stay</button>'+
      '<button type="button" data-leave-discard>Discard</button>'+
      '<button type="button" data-leave-save>Save draft &amp; leave</button></div>'+
      '<p data-leave-status role="alert"></p>';
    section.append(leaveDialog);
    let pendingNavigation=null,allowedNavigation=false;
    const hasUnsaved=()=>state.dirty||state.invalidFields.size>0;
    const discardAndGo=()=>{
      if(!pendingNavigation)return;
      const target=pendingNavigation;
      pendingNavigation=null;
      state.invalidFields.clear();
      state.draft=clone(state.saved);
      state.dirty=false;
      allowedNavigation=true;
      leaveDialog.close();
      try{target.click();}
      finally{allowedNavigation=false;}
    };
    leaveDialog.querySelector('[data-leave-stay]').onclick=()=>{
      pendingNavigation=null;leaveDialog.close();
    };
    leaveDialog.querySelector('[data-leave-discard]').onclick=discardAndGo;
    leaveDialog.querySelector('[data-leave-save]').onclick=async()=>{
      if(!pendingNavigation||!state.serverReady||state.busy||
          state.invalidFields.size||!validCurrent()||!contextValid())return;
      const button=leaveDialog.querySelector('[data-leave-save]');
      button.disabled=true;
      try{
        if(state.dirty){
          const result=await VACANCY_BACKEND.adminAppearanceSaveDraft(
            key,state.draft,state.draftVersion,state.publishedRevision);
          if(!contextValid()||!result||!registry.validConfig(result.config))
            throw new Error('Private draft was not confirmed');
          state.draftVersion=Number(result.version);
          state.saved=clone(result.config);
          state.draft=clone(result.config);
        }
        discardAndGo();
      }catch(error){
        leaveDialog.querySelector('[data-leave-status]').textContent=
          'Could not save private draft: '+(error.message||'Unknown error')+
          '. Changes are still here.';
      }finally{button.disabled=false;}
    };
    function guardRouteClick(event){
      if(!section.isConnected){
        document.removeEventListener('click',guardRouteClick,true);return;
      }
      if(allowedNavigation||!hasUnsaved()||event.defaultPrevented)return;
      const node=event.target.closest?.('a[href],button[data-nav],#adminRefresh');
      if(!node||node.closest('.design-leave-dialog'))return;
      if(node.matches('a[href]')){
        if(node.target==='_blank'||node.hasAttribute('download'))return;
        const url=new URL(node.href,location.href);
        if(url.pathname===location.pathname&&url.hash==='#admin')return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingNavigation=node;
      leaveDialog.querySelector('[data-leave-status]').textContent='';
      leaveDialog.querySelector('[data-leave-save]').disabled=
        !state.serverReady||state.invalidFields.size>0||!validCurrent();
      if(!leaveDialog.open)leaveDialog.showModal();
    }
    document.addEventListener('click',guardRouteClick,true);
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>resizeFrame()):null;
    resize?.observe($('.design-viewport-stage'));
    const unload=event=>{
      if(!state.dirty&&!state.invalidFields.size)return;
      event.preventDefault();event.returnValue='';
    };
    window.addEventListener('beforeunload',unload);
    // Existing admin navigation remains authoritative. Never auto-save to a
    // customer draft or expose unsaved appearance edits to public readers.
    refreshTree();fieldsFromScope();
    await Promise.all([loadServerState(),loadListings()]);
    if(!contextValid()){resize?.disconnect();window.removeEventListener('beforeunload',unload);}
  }
  window.mountVacancyDesignWorkspace=mount;
})();
