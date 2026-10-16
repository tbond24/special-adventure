// Typed presentation adapters share the existing server appearance workflow.
// No caller supplies executable markup, selectors or code from stored settings.
(() => {
 const copy=x=>JSON.parse(JSON.stringify(x));
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,canonical(x[key])])):x;
 const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 window.mountVacancyPresentationDraft=async(host,spec)=>{
  host.vacancyDraftCleanup?.();
  const actor=currentUser?.id;
  let disposed=false,busy=false,ready=false,published={},saved={},draft={},revision=0,version=0,owner=false,stale=false,pending=null,review=false,leaveAction=null,allowLeave=false;
  const $=s=>host.querySelector(s),escape=x=>escapeHtml(String(x));
  host.className='presentation-draft';
  host.innerHTML='<style>.presentation-draft{min-width:0}.presentation-draft [data-brand-controls]{display:grid;gap:12px}.presentation-draft [data-brand-controls] label{display:grid;gap:6px}.presentation-draft input:not([type=checkbox]),.presentation-draft select{width:100%;height:auto}.presentation-draft .brand-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.presentation-draft dialog{width:min(440px,calc(100vw - 32px))}.presentation-draft [data-brand-preview]{pointer-events:none;overflow:hidden}.presentation-draft [data-brand-preview] svg{width:64px;height:64px}.presentation-draft [data-brand-preview] img{max-width:64px;max-height:64px}</style>'+
   '<h3>'+escape(spec.title)+'</h3><p>'+escape(spec.impact)+'</p><div data-brand-controls></div><div data-brand-preview aria-label="Private presentation preview"></div><p data-brand-version></p>'+
   '<div class="brand-actions"><button type="button" data-brand-reset>Reset to published</button><button type="button" data-brand-save disabled>Save private draft</button><button type="button" data-brand-review disabled>Review &amp; publish</button><button type="button" data-brand-history>History</button><button type="button" data-brand-reload>Reload saved state</button></div>'+
   '<p data-brand-status role="status">Loading saved settings…</p><section data-brand-review-panel hidden><h4>Review publication</h4><p data-brand-diff style="overflow-wrap:anywhere"></p><div data-brand-review-preview></div><p>'+escape(spec.impact)+'</p><label>Reason for change<input data-brand-reason type="text" maxlength="500"></label><button type="button" data-brand-publish disabled>Publish changes</button></section>'+
   '<section data-brand-history-panel hidden><h4>Published versions</h4><div data-brand-versions></div></section>'+
   '<dialog aria-label="Unsaved presentation changes"><h3>Unsaved changes</h3><p>Save a private draft, discard edits, or stay here.</p><button type="button" data-brand-stay>Stay</button><button type="button" data-brand-discard>Discard</button><button type="button" data-brand-leave-save>Save draft &amp; leave</button><p data-brand-leave-status role="alert"></p></dialog>';
  const dialog=$('dialog'),status=$('[data-brand-status]');
  const current=()=>!disposed&&host.isConnected&&location.hash==='#admin'&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
  const dirty=()=>!same(draft,saved),message=t=>{status.textContent=t;};
  const canPublish=()=>current()&&ready&&!busy&&owner&&!dirty()&&!stale&&version>0&&!same(saved,published)&&spec.valid(saved)&&spec.canPublish?.(revision)!==false;
  function paint(){
   spec.paint?.($('[data-brand-controls]'),$('[data-brand-preview]'),copy(draft),current()&&ready&&!busy&&spec.editable?.(revision)!==false);
   $('[data-brand-version]').textContent=ready?'Published revision '+revision+(version?' · Private draft '+version:'')+(owner?'':' · Owner publication required'):'';
   $('[data-brand-save]').disabled=!current()||!ready||busy||(!dirty()&&!stale)||!spec.valid(draft);
   $('[data-brand-reset]').disabled=!ready||busy;
   $('[data-brand-review]').disabled=!canPublish();
   $('[data-brand-review-panel]').hidden=!review;
   $('[data-brand-diff]').textContent=spec.summary(published)+' → '+spec.summary(saved);
   if(review)spec.review?.($('[data-brand-review-preview]'),copy(published),copy(saved));
   $('[data-brand-publish]').disabled=!review||!canPublish()||$('[data-brand-reason]').value.trim().length<3;
   $('[data-brand-reload]').disabled=busy;$('[data-brand-history]').disabled=busy;
  }
  function change(value){if(!current()||busy||!ready)return;draft=copy(value);review=false;pending=null;message('Unsaved private changes. Public presentation is unchanged.');paint();}
  spec.mount($('[data-brand-controls]'),{change,message,current,requestNavigation:go=>navigate(go)});
  function cleanup(){
   if(disposed)return;disposed=true;observer.disconnect();dialog.close();
   document.removeEventListener('click',clickGuard,true);document.removeEventListener('change',sectionGuard,true);
   window.removeEventListener('hashchange',hashGuard,true);window.removeEventListener('beforeunload',unload);window.removeEventListener('storage',account);
   spec.dispose?.();host.replaceChildren();if(host.vacancyDraftCleanup===cleanup){delete host.vacancyDraftCleanup;delete host.requestDraftNavigation;}
  }
  async function load(){
   const result=await VACANCY_BACKEND.adminAppearanceState(spec.key);
   if(!current()){cleanup();return;}
   await spec.validateAssets?.(result?.published?.config,result?.draft?.config);
   if(!current()){cleanup();return;}
   if(!Number.isSafeInteger(result?.published?.revision)||!spec.valid(result.published.config)||(result.draft&&!spec.valid(result.draft.config)))throw Error('Saved settings were not confirmed');
   published=copy(result.published.config);revision=result.published.revision;saved=copy(result.draft?.config||published);draft=copy(saved);
   version=result.draft?.version||0;owner=result.canPublish===true;stale=!!result.draft&&result.draft.baseRevision!==revision;
   ready=true;review=false;pending=null;message(stale?'Draft is based on an older publication. Review and save again.':version?'Private draft loaded. Public presentation is unchanged.':'Published settings loaded.');
  }
  async function write(action,unready=false){
   if(!current()||busy||(!ready&&!unready))return false;busy=true;paint();
   try{await action();return current();}catch(error){if(current())message(error.message||'Not confirmed. Edits remain here.');return false;}
   finally{if(current()){busy=false;paint();}else cleanup();}
  }
  async function save(){
   const expected=copy(draft);await spec.validateAssets?.(expected);
   if(!current()){cleanup();return;}
   const result=await VACANCY_BACKEND.adminAppearanceSaveDraft(spec.key,expected,version,revision);
   if(!current()){cleanup();return;}
   if(!Number.isSafeInteger(result?.version)||!same(result.config,expected))throw Error('Private draft was not confirmed. Edits remain here.');
   saved=copy(result.config);draft=copy(saved);version=result.version;stale=false;review=false;pending=null;spec.onSaved?.(copy(saved));message('Private draft saved. Nothing published.');
  }
  $('[data-brand-save]').onclick=()=>write(save);
  $('[data-brand-reset]').onclick=()=>change(published);
  $('[data-brand-reload]').onclick=()=>{if(dirty()&&!confirm('Discard unsaved edits and reload saved settings?'))return;write(load,true);};
  $('[data-brand-review]').onclick=()=>{review=true;paint();};$('[data-brand-reason]').oninput=paint;
  $('[data-brand-publish]').onclick=()=>{
   if(!canPublish()||!review||$('[data-brand-reason]').value.trim().length<3)return;
   write(async()=>{
    pending=pending||{id:crypto.randomUUID(),reason:$('[data-brand-reason]').value.trim()};
    const expected=copy(saved),result=await VACANCY_BACKEND.adminAppearancePublish(spec.key,revision,version,pending.reason,pending.id);
    if(!current()){cleanup();return;}if(!Number.isSafeInteger(result?.revision))throw Error('Publication not confirmed. Retry preserves the request ID.');
    published=copy(expected);revision=result.revision;version=0;review=false;pending=null;$('[data-brand-reason]').value='';
    message('Published revision '+revision+'; checking anonymous public settings…');
    try{
     const [rows,projection]=await Promise.all([VACANCY_BACKEND.siteAppearancePublished({anonymous:true}),spec.confirm(expected,revision)]);
     const publicState=rows.find(row=>row.key===spec.key);
     if(!projection||publicState?.revision!==revision||!same(publicState.config,expected))throw Error('Public projection/revision not confirmed');
     if(!current()){cleanup();return;}
     await spec.onPublished?.(copy(expected));
     if(current())message('Published revision '+revision+'; verified in public settings.');
    }catch(error){if(current())message('Published revision '+revision+'; public propagation is unverified. Reload saved state and check again.');}
   });
  };
  async function history(){
   const rows=await VACANCY_BACKEND.adminAppearanceHistory(spec.key),legacy=spec.legacyHistory?await spec.legacyHistory():[];
   if(!current()){cleanup();return;}
   if(!Array.isArray(rows)||rows.length>20||rows.some(row=>!spec.valid(row.config)))throw Error('History not confirmed');
   const list=$('[data-brand-versions]');list.replaceChildren();
   if(!rows.length&&!legacy.length)list.textContent='No previous versions.';
   for(const item of [...rows.map(row=>({...row,legacy:false})),...legacy.map(row=>({...row,legacy:true}))]){
    const p=document.createElement('p'),button=document.createElement('button');
    p.append(document.createTextNode((item.legacy?'Legacy version '+item.id:'Revision '+item.revision)+' · '+spec.summary(item.config)+' '));
    button.type='button';button.textContent='Restore as draft';button.disabled=!owner;button.dataset.brandRestore=item.legacy?'legacy-'+item.id:String(item.revision);
    button.onclick=()=>write(async()=>{
     if(dirty())throw Error('Save or reset unsaved edits before restoring.');
     await spec.validateAssets?.(item.config);
     if(!current()){cleanup();return;}
     if(item.legacy){if(!spec.valid(item.config))throw Error('Legacy version is unsupported');draft=copy(item.config);await save();}
     else{
      const out=await VACANCY_BACKEND.adminAppearanceRestoreDraft(spec.key,item.revision,version,revision);
      if(!current()){cleanup();return;}
      if(!Number.isSafeInteger(out?.version)||!spec.valid(out.config))throw Error('Restore draft not confirmed');
      saved=copy(out.config);draft=copy(saved);version=out.version;stale=false;pending=null;
     }
     review=true;message('Earlier version copied to a private draft. Review and publish deliberately.');
    });p.append(button);list.append(p);
   }
  }
  $('[data-brand-history]').onclick=()=>{$('[data-brand-history-panel]').hidden=false;write(history);};
  function leave(){const go=leaveAction;leaveAction=null;draft=copy(saved);dialog.close();allowLeave=true;try{go?.();}finally{allowLeave=false;}}
  function navigate(go){if(busy)return;if(!dirty()){go();return;}leaveAction=go;$('[data-brand-leave-status]').textContent='';if(!dialog.open)dialog.showModal();}
  $('[data-brand-stay]').onclick=()=>{leaveAction=null;dialog.close();};$('[data-brand-discard]').onclick=leave;
  $('[data-brand-leave-save]').onclick=async()=>{const button=$('[data-brand-leave-save]');button.disabled=true;if(await write(save))leave();else if(current())$('[data-brand-leave-status]').textContent='Not saved. Your edits remain here.';button.disabled=false;};
  function clickGuard(event){
   if(!current()){cleanup();return;}if(allowLeave||!dirty()||event.defaultPrevented)return;
   const node=event.target.closest?.('a[href],button[data-nav],#adminRefresh,#adminSectionMenu button[data-section]');
   if(!node||node.closest('dialog')||node.target==='_blank'||node.dataset.section==='icons')return;
   if(node.matches('a[href]')&&new URL(node.href,location.href).hash==='#admin')return;
   event.preventDefault();event.stopImmediatePropagation();navigate(()=>node.click());
  }
  function sectionGuard(event){if(!current()||allowLeave||!dirty()||!event.target.matches('.admin-section-select')||event.target.value==='icons')return;const node=event.target,value=node.value;node.value='icons';event.stopImmediatePropagation();navigate(()=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));});}
  function hashGuard(event){if(disposed||allowLeave||!host.isConnected||currentUser?.id!==actor||!dirty()||location.hash==='#admin')return;const target=location.hash;event.stopImmediatePropagation();window.history.replaceState(null,'',event.oldURL);navigate(()=>{location.hash=target;});}
  function unload(event){if(current()&&dirty()){event.preventDefault();event.returnValue='';}}
  const account=()=>{if(!current())cleanup();},observer=new MutationObserver(account);
  observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
  document.addEventListener('click',clickGuard,true);document.addEventListener('change',sectionGuard,true);window.addEventListener('hashchange',hashGuard,true);window.addEventListener('beforeunload',unload);window.addEventListener('storage',account);
  host.vacancyDraftCleanup=cleanup;host.requestDraftNavigation=navigate;
  paint();await write(load,true);
 };
})();
