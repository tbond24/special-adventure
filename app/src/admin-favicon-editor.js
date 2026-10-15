// The existing browser-tab favicon, edited privately on desktop.
(() => {
 const key='site/favicon',clone=x=>JSON.parse(JSON.stringify(x));
 const valid=x=>x&&Object.keys(x).length===1&&Object.hasOwn(x,'png')&&
   (x.png===null||typeof x.png==='string'&&x.png.length<=40000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(x.png));
 const esc=x=>escapeHtml(String(x??''));
 window.mountVacancyReviewedFavicon=async panel=>{
  if(!document.querySelector('[data-favicon-review-style]')){
   const link=document.createElement('link');link.rel='stylesheet';link.href='/src/admin-favicon-editor.css?v=20261016';
   link.dataset.faviconReviewStyle='';document.head.append(link);
  }
  panel.classList.add('reviewed-favicon');
  const pictureMarkup=(name,label)=>'<section><h3>'+label+'</h3><div data-favicon-picture="'+name+'"><img width="64" height="64" alt="'+label+' at 64 pixels"><img width="16" height="16" alt="'+label+' at tab size"><p>Default browser icon</p></div></section>';
  panel.innerHTML='<div class="section-head"><div><h2>Site favicon</h2><p class="muted">The browser tab icon. Changes stay private until an Owner reviews and publishes them.</p></div><button type="button" data-favicon-reload>Reload settings</button></div>'+
   '<p class="favicon-mobile-note">Open this editor on a desktop to change the shared browser tab icon.</p>'+
   '<div class="favicon-desktop"><p role="status" data-favicon-status>Loading settings.</p>'+
   '<p class="muted">Choose PNG, JPG, WebP, GIF, AVIF, BMP or ICO, under 10 MB and 40 megapixels. A still frame is fitted inside a 64 × 64 PNG.</p>'+
   '<label>Choose favicon image<input type="file" data-favicon-file accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/x-icon,image/vnd.microsoft.icon" disabled></label>'+
   '<div class="favicon-preview-pair">'+pictureMarkup('published','Currently published')+pictureMarkup('draft','Your private draft')+'</div>'+
   '<div class="favicon-actions"><button type="button" data-favicon-default disabled>Use default browser icon</button><button type="button" class="primary" data-favicon-draft disabled>Save private draft</button><button type="button" data-favicon-review disabled>Review publication</button></div>'+
   '<p class="muted" data-favicon-role></p>'+
   '<section data-favicon-review-panel hidden><h3>Review favicon publication</h3><p>The selected preview will become the public browser tab icon on all screen sizes.</p>'+
   '<label>Reason<textarea rows="2" minlength="3" maxlength="500" data-favicon-reason></textarea></label>'+
   '<label class="favicon-confirm"><input type="checkbox" data-favicon-confirm><span>I reviewed the favicon previews and want to publish this change.</span></label>'+
   '<div class="favicon-actions"><button type="button" class="primary" data-favicon-publish disabled>Publish favicon</button><button type="button" data-favicon-cancel>Cancel review</button></div></section>'+
   '<details class="favicon-history"><summary>Published favicon history</summary><div data-favicon-history></div></details></div>';
  const $=s=>panel.querySelector(s),actor=currentUser?.id,desktop=matchMedia('(min-width:1024px)');
  const state={ready:false,busy:false,decoding:false,conflict:false,published:null,config:null,saved:null,version:0,revision:0,base:0,canPublish:false,proof:false,seq:0,fileSeq:0,requestId:null};
  const live=()=>panel.isConnected&&currentUser?.id===actor&&parseHash().name==='admin'&&VACANCY_BACKEND.assuranceLevel()==='aal2';
  const allowed=()=>live()&&desktop.matches;
  const dirty=()=>state.config?.png!==state.saved?.png;
  const changed=()=>state.config?.png!==state.published?.png;
  const status=text=>{if(live())$('[data-favicon-status]').textContent=text;};
  const close=()=>{$('[data-favicon-review-panel]').hidden=true;$('[data-favicon-confirm]').checked=false;state.requestId=null;};
  function buttons(){
   const enabled=allowed()&&state.ready&&!state.busy&&!state.decoding&&!state.conflict;
   $('[data-favicon-file]').disabled=$('[data-favicon-default]').disabled=!enabled;
   $('[data-favicon-reload]').disabled=state.busy||state.decoding;
   $('[data-favicon-draft]').disabled=!enabled||!state.proof||(!dirty()&&state.base===state.revision);
   $('[data-favicon-review]').disabled=!enabled||!state.canPublish||!state.proof||!state.version||dirty()||!changed()||state.base!==state.revision;
   $('[data-favicon-publish]').disabled=$('[data-favicon-review]').disabled||!$('[data-favicon-confirm]').checked||$('[data-favicon-reason]').value.trim().length<3;
   $('[data-favicon-reason]').disabled=$('[data-favicon-confirm]').disabled=state.busy;
   panel.querySelectorAll('[data-favicon-restore]').forEach(b=>b.disabled=!enabled||!state.canPublish);
  }
  function image(name,png){
   const box=$('[data-favicon-picture="'+name+'"]');box.querySelector('p').hidden=png!==null;
   for(const img of box.querySelectorAll('img')){img.hidden=png===null;if(png)img.src=png;else img.removeAttribute('src');}
  }
  async function preview(){
   const seq=++state.seq;state.proof=false;buttons();const png=state.config.png;image('draft',png);
   try{if(png){const check=new Image();check.src=png;await check.decode();if(check.naturalWidth!==64||check.naturalHeight!==64)throw Error('Favicon dimensions changed');}
    if(seq!==state.seq||!live())return;state.proof=true;
   }catch{if(seq===state.seq&&live())status('Preview unavailable. Choose another image or the default browser icon.');}
   if(live())buttons();
  }
  async function history(){
   const rows=await VACANCY_BACKEND.adminAppearanceHistory(key);if(!live())return;
   if(!Array.isArray(rows)||rows.some(r=>!valid(r.config)))throw Error('Favicon history unavailable');
   $('[data-favicon-history]').innerHTML=rows.map(r=>'<article><div><strong>'+(r.revision===-1?'Earlier favicon':r.revision===0?'Initial favicon':'Version '+Number(r.revision))+'</strong><p>'+esc(r.reason)+'</p></div>'+
    (r.config.png?'<img width="24" height="24" src="'+esc(r.config.png)+'" alt="Historical favicon">':'<span>Default</span>')+
    (state.canPublish&&r.revision!==state.revision?'<button type="button" data-favicon-restore="'+Number(r.revision)+'">Restore to private draft</button>':'')+'</article>').join('');
  }
  async function load(){
   state.ready=false;state.proof=false;buttons();status('Loading favicon settings.');
   const result=await VACANCY_BACKEND.adminAppearanceState(key);if(!live())return;
   const p=result?.published,d=result?.draft;
   if(!valid(p?.config)||d&&!valid(d.config)||!Number.isSafeInteger(p.revision))throw Error('Favicon settings unavailable. Nothing can be published.');
   Object.assign(state,{ready:true,conflict:false,published:clone(p.config),config:clone(d?.config||p.config),saved:clone(d?.config||p.config),revision:p.revision,version:d?.version||0,base:d?.baseRevision??p.revision,canPublish:result.canPublish===true});
   close();image('published',state.published.png);await history();await preview();
   $('[data-favicon-role]').textContent=state.canPublish?'Owner: save, review and publish the shared favicon.':'Operator: save your private draft. An Owner prepares and publishes the reviewed change.';
   if(state.proof)status(state.base!==state.revision?'Published favicon changed. Review your private draft and save again before publishing.':
    state.version?'Your private favicon draft is loaded. Public favicon is unchanged.':'Published favicon version '+state.revision+' loaded.');
   buttons();
  }
  async function action(run){
   if(!allowed()||state.busy||state.decoding)return;state.busy=true;buttons();
   try{await run();}catch(error){if(live()){if(error.status===409)state.conflict=true;status((error.message||'Request failed.')+(state.conflict?' Reload settings before continuing. Your draft remains visible.':''));}}
   finally{state.busy=false;if(live())buttons();}
  }
  $('[data-favicon-file]').onchange=async()=>{
   if(!allowed()||!state.ready||state.busy||state.decoding)return;
   const file=$('[data-favicon-file]').files?.[0],seq=++state.fileSeq;if(!file)return;
   close();state.decoding=true;buttons();let url;
   try{
    if(file.size>10*1024*1024)throw Error('Choose an image smaller than 10 MB.');
    if(!/^image\/(png|jpeg|webp|gif|avif|bmp|x-icon|vnd.microsoft.icon)$/.test(file.type))throw Error('Choose one of the supported image formats.');
    url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
    if(seq!==state.fileSeq||!allowed())return;
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw Error('Choose an image below 40 megapixels.');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image conversion unavailable.');
    ctx.imageSmoothingQuality='high';const scale=Math.min(64/img.naturalWidth,64/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    ctx.drawImage(img,(64-w)/2,(64-h)/2,w,h);const config={png:canvas.toDataURL('image/png')};if(!valid(config))throw Error('Converted PNG exceeds the favicon limit.');
    state.config=config;await preview();status('Private preview only. Save the draft before review.');
   }catch(error){if(live())status((error.message||'Image could not be loaded.')+' Previous draft retained.');}
   finally{if(url)URL.revokeObjectURL(url);state.decoding=false;if(live())buttons();}
  };
  $('[data-favicon-default]').onclick=()=>{if(!allowed()||!state.ready||state.busy||state.decoding)return;state.config={png:null};close();void preview();status('Default browser icon previewed privately.');};
  $('[data-favicon-draft]').onclick=()=>action(async()=>{
   if(!state.proof)return;
   const saved=await VACANCY_BACKEND.adminAppearanceSaveDraft(key,state.config,state.version,state.revision);if(!live())return;
   state.version=saved.version;state.base=saved.baseRevision;state.saved=clone(state.config);close();status('Private favicon draft saved. Public favicon is unchanged.');
  });
  $('[data-favicon-review]').onclick=()=>{if($('[data-favicon-review]').disabled)return;$('[data-favicon-review-panel]').hidden=false;$('[data-favicon-confirm]').checked=false;$('[data-favicon-reason]').focus();buttons();};
  $('[data-favicon-reason]').oninput=()=>{state.requestId=null;buttons();};$('[data-favicon-confirm]').onchange=buttons;
  $('[data-favicon-cancel]').onclick=close;
  $('[data-favicon-publish]').onclick=()=>action(async()=>{
   if(!state.canPublish||!state.proof||dirty()||!$('[data-favicon-confirm]').checked)return;
   state.requestId??=crypto.randomUUID();
   await VACANCY_BACKEND.adminAppearancePublish(key,state.revision,state.version,$('[data-favicon-reason]').value.trim(),state.requestId);
   if(!live())return;await load();if(live()){window.applyVacancyFavicon?.(state.published.png);status('Favicon published.');}
  });
  $('[data-favicon-history]').onclick=e=>{const button=e.target.closest('[data-favicon-restore]');if(!button||button.disabled)return;
   if(dirty()&&!confirm('Replace unsaved edits with this historical favicon?'))return;
   void action(async()=>{await VACANCY_BACKEND.adminAppearanceRestoreDraft(key,Number(button.dataset.faviconRestore),state.version,state.revision);if(live()){await load();status('Historical favicon copied to your private draft. Review and publish to apply.');}});
  };
  $('[data-favicon-reload]').onclick=()=>{if(dirty()&&!confirm('Discard unsaved edits and reload favicon settings?'))return;void action(load);};
  const resize=()=>{if(!panel.isConnected)return;close();buttons();if(desktop.matches&&!state.ready&&!state.busy)void action(load);};
  desktop.addEventListener('change',resize);
  const detach=new MutationObserver(()=>{if(!panel.isConnected){desktop.removeEventListener('change',resize);detach.disconnect();}});detach.observe(document.body,{childList:true,subtree:true});
  if(!desktop.matches)return;
  try{await load();}catch(error){state.ready=false;status(error.message||'Favicon editor unavailable.');buttons();}
 };
})();
