(() => {
 const safe=value=>escapeHtml(String(value??''));
 const time=value=>new Date(value).toLocaleString();
 const table=(heads,rows)=>'<div class="admin-metric-table" tabindex="0"><table><thead><tr>'+heads.map(x=>'<th scope="col">'+safe(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+safe(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 let activityCleanup=null;
 function activity(section){if(!section||section.querySelector('[data-recent-activity]'))return;
 if(activityCleanup)activityCleanup();
 const panel=document.createElement('div');panel.className='panel';panel.dataset.recentActivity='';panel.innerHTML='<div class="section-head"><h2>Recent activity</h2><button type="button" class="ghost">Refresh</button></div><p class="muted">Refreshes every 30 seconds while this section is visible. Recorded activity is not a count of people online. Sources describe referrals and campaigns, not visitors’ physical locations.</p><p role="status"></p><div data-activity-body></div>';section.prepend(panel);
 const status=panel.querySelector('[role=status]'),body=panel.querySelector('[data-activity-body]'),button=panel.querySelector('button');
 const ownerId=currentUser?.id;
 let pending=null,timer=null,stopped=false,failures=0,visible=false;
 const contextValid=()=>panel.isConnected&&location.hash==='#admin'&&ownerId&&
   currentUser?.id===ownerId&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&
   (!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===ownerId);
 const isVisible=()=>!document.hidden&&!section.hidden;
 const clearTimer=()=>{clearTimeout(timer);timer=null;};
 function cancel(){
   clearTimer();
   const previous=pending;pending=null;
   if(previous)previous.controller.abort();
   button.disabled=false;
 }
 function stop(){
   if(stopped)return;stopped=true;cancel();observer.disconnect();
   document.removeEventListener('visibilitychange',sync);
   window.removeEventListener('hashchange',sync);
   window.removeEventListener('storage',sync);
   window.removeEventListener('pagehide',pageHidden);
   window.removeEventListener('pageshow',sync);
   button.onclick=null;body.replaceChildren();
   status.textContent='Activity unavailable. Reopen admin to refresh.';
   if(activityCleanup===stop)activityCleanup=null;
 }
 function schedule(){
   clearTimer();
   if(!stopped&&contextValid()&&isVisible()){
     const delay=failures?Math.min(300000,30000*2**Math.min(failures,4)):30000;
     timer=setTimeout(()=>{timer=null;refresh();},delay);
   }
 }
 function validResponse(data){
   const count=value=>Number.isSafeInteger(value)&&value>=0;
   return data&&Number.isFinite(Date.parse(data.generated_at))&&
     count(data.browsers_recent)&&count(data.accounts_created)&&
     Array.isArray(data.sources)&&data.sources.every(r=>r&&typeof r.source==='string'&&count(r.sessions))&&
     Array.isArray(data.actions)&&data.actions.every(r=>r&&typeof r.event_name==='string'&&count(r.events))&&
     Array.isArray(data.recent)&&data.recent.every(r=>r&&typeof r.event_name==='string'&&
       typeof r.route==='string'&&Number.isFinite(Date.parse(r.created_at)));
 }
 async function refresh(){
   if(stopped||pending)return;
   if(!contextValid()){stop();return;}
   if(!isVisible())return;
   clearTimer();button.disabled=true;
   const operation={controller:new AbortController()};pending=operation;
   const signal=operation.controller.signal;
   let onAbort;
   const interrupted=new Promise((resolve,reject)=>{
     onAbort=()=>reject(signal.reason||new DOMException('Read cancelled','AbortError'));
     signal.addEventListener('abort',onAbort,{once:true});
   });
   const deadline=setTimeout(()=>operation.controller.abort(
     new DOMException('Activity refresh timed out. Try again.','TimeoutError')),15000);
   try{
     // Abort the UI wait even if shared session refresh has not reached fetch.
     // The aborted signal still prevents that delayed read from sending later.
     const data=await Promise.race([VACANCY_BACKEND.recentActivity({signal}),interrupted]);
     if(pending!==operation||stopped)return;
     if(!contextValid()){stop();return;}
     if(!isVisible()){cancel();return;}
     if(!validResponse(data))throw Error('Invalid activity response');
     failures=0;
 status.textContent='Report generated '+time(data.generated_at)+' · preceding 24 hours';body.innerHTML='<div class="stat-grid"><div class="stat"><strong>'+safe(data.browsers_recent)+'</strong>Browser IDs seen in the last 5 minutes</div><div class="stat"><strong>'+safe(data.accounts_created)+'</strong>Non-guest accounts created · 24h</div></div><h3>Arrival sources</h3>'+table(['Source','Recorded sessions'],data.sources.map(r=>[r.source,r.sessions]))+'<h3>Actions · 24h</h3>'+table(['Recorded action','Events'],data.actions.map(r=>[r.event_name.replaceAll('_',' '),r.events]))+'<h3>Latest recorded actions</h3>'+table(['Action','Area','Time'],data.recent.map(r=>[r.event_name.replaceAll('_',' '),r.route,time(r.created_at)]));
   }catch(error){
     if(pending!==operation||stopped)return;
     if(!contextValid()){stop();return;}
     if(!isVisible()){cancel();return;}
     failures++;
     status.textContent=(body.textContent?'Previous results are stale. ':'Activity unavailable. ')+error.message;
   }finally{
     clearTimeout(deadline);signal.removeEventListener('abort',onAbort);
     if(pending===operation){pending=null;button.disabled=false;schedule();}
   }
 }
 button.onclick=refresh;
 function sync(){
   if(stopped)return;
   if(!contextValid()){stop();return;}
   const next=isVisible();
   if(!next){visible=false;cancel();return;}
   if(!visible){visible=true;refresh();}
 }
 function pageHidden(event){
   if(event.persisted){visible=false;cancel();}
   else stop();
 }
 const observer=new MutationObserver(sync);
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('hashchange',sync);
 window.addEventListener('storage',sync);
 window.addEventListener('pagehide',pageHidden);
 window.addEventListener('pageshow',sync);
 activityCleanup=stop;sync();
 }
 function favicon(section){if(!section||section.querySelector('[data-favicon-editor]'))return;const panel=document.createElement('div');panel.className='panel';panel.dataset.faviconEditor='';panel.innerHTML='<h2>Site favicon</h2><p class="muted">Upload PNG, JPG, WebP, GIF, AVIF, BMP or ICO. We use a still frame, fit it inside a square and generate a 64 × 64 PNG. Use a clear, simple image at least 64 pixels wide. This changes the browser tab icon only.</p><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/x-icon,image/vnd.microsoft.icon" aria-label="Choose favicon image"><div class="favicon-preview" hidden><img width="64" height="64" alt="Favicon preview"><span>Actual tab size: <img width="16" height="16" alt="Small favicon preview"></span></div><div class="favicon-actions"><button type="button" class="primary" data-favicon-save disabled>Save favicon</button><button type="button" class="ghost" data-favicon-restore disabled>Restore previous</button></div><p role="status"></p>';section.prepend(panel);
 const input=panel.querySelector('input'),save=panel.querySelector('[data-favicon-save]'),restore=panel.querySelector('[data-favicon-restore]'),status=panel.querySelector('[role=status]'),preview=panel.querySelector('.favicon-preview');let record=null,png=null,selection=0;
 function paint(value){preview.hidden=!value;preview.querySelectorAll('img').forEach(img=>{if(value)img.src=value;else img.removeAttribute('src')});}
 async function load(){try{record=await VACANCY_BACKEND.adminFavicon();paint(record.png);restore.disabled=record.revision===0;status.textContent='Current favicon loaded';}catch(error){status.textContent='Favicon settings unavailable: '+error.message}}
 input.onchange=async()=>{const file=input.files[0],id=++selection;png=null;save.disabled=true;if(!file)return;if(file.size>10*1024*1024){status.textContent='Choose an image smaller than 10 MB.';return}let url;
 try{if(!/^(image\/(png|jpeg|webp|gif|avif|bmp|x-icon|vnd.microsoft.icon))$/.test(file.type))throw Error('Choose one of the supported image formats.');url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();if(id!==selection)return;if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>40000000)throw Error('Choose an image below 40 megapixels.');const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';const scale=Math.min(64/img.naturalWidth,64/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(64-w)/2,(64-h)/2,w,h);png=canvas.toDataURL('image/png');paint(png);save.disabled=!record;status.textContent='Preview only. Save to update the tab icon.';}catch(error){status.textContent=error.message;}finally{if(url)URL.revokeObjectURL(url)}};
 async function write(revert){if(!record)return;if(revert&&!confirm('Restore the previous favicon?'))return;save.disabled=restore.disabled=input.disabled=true;try{record=await VACANCY_BACKEND.setFavicon(revert?null:png,record.revision,revert);png=null;paint(record.png);window.applyVacancyFavicon(record.png);status.textContent=revert?'Previous favicon restored.':'Favicon saved.';}catch(error){status.textContent='Not saved: '+error.message;}finally{input.disabled=false;save.disabled=!png;restore.disabled=!record||record.revision===0}}
 save.onclick=()=>write(false);restore.onclick=()=>write(true);load();
 }
 window.mountVacancyAdminTools=host=>{activity(host.querySelector('[data-admin-section="activity"]'));favicon(host.querySelector('[data-admin-section="icons"]'));};
})();
