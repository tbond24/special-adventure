// Authenticated summaries only. Shared refresh + lightweight polling while visible.
window.mountVacancyActivityFeeds=function(root){
 const actor=currentUser?.id,section=root.closest('[data-admin-section]'),host=document.createElement('div');host.className='overview-activity-feeds';root.querySelector('.overview-journey-map').after(host);
 const esc=v=>escapeHtml(String(v??'')),kinds=['site','visitor'],titles=['Site changes','Visitor activity'];
 const categories=[[['all','All changes'],['ui','UI edits'],['code','Code releases']],[['all','All activity'],['clicks','Contact & text'],['listing','Listing creation'],['registrations','Registrations']]];
 host.innerHTML=titles.map((title,i)=>'<section class="activity-feed" aria-label="'+title+'"><header><h3>'+title+'</h3><div class="activity-feed-controls"><select data-feed-filter="'+i+'" aria-label="Filter '+title.toLowerCase()+'">'+categories[i].map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select><button type="button" data-feed-pause="'+i+'" aria-label="Pause '+title.toLowerCase()+'">Pause</button><button type="button" data-feed-refresh="'+i+'" aria-label="Refresh '+title.toLowerCase()+'">↻</button></div></header><div data-feed-body="'+i+'" class="activity-feed-scroll" role="log" aria-label="'+title+' entries">Loading…</div><small data-feed-stamp="'+i+'" role="status"></small></section>').join('');
 let stopped=false,inView=false;const versions=[0,0],paused=[false,false],controllers=[null,null],timers=[null,null],filters=['all','all'];
 const key='vacancy-activity-feed-filters:'+actor;try{const saved=JSON.parse(localStorage.getItem(key)||'null');for(let i=0;i<2;i++)if(categories[i].some(c=>c[0]===saved?.[i]))filters[i]=saved[i]}catch{}
 const visible=()=>!document.hidden&&!section?.hidden&&matchMedia('(min-width:1280px)').matches;
 const valid=()=>!stopped&&host.isConnected&&!!actor&&currentUser?.id===actor&&location.hash==='#admin'&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
 function country(code){try{return new Intl.DisplayNames(undefined,{type:'region'}).of(code)}catch{return code}}
 function render(i,report){
  if(report?.schemaVersion!==1||report.kind!==kinds[i]||!Number.isFinite(Date.parse(report.generatedAt))||!Array.isArray(report.rows)||report.rows.length>50)throw Error('Invalid feed');
  const ids=new Set();for(const r of report.rows){if(typeof r.id!=='string'||ids.has(r.id)||typeof r.title!=='string'||r.title.length>240||typeof r.section!=='string'||!categories[i].some(c=>c[0]===r.category)||!Number.isFinite(Date.parse(r.at))||!Number.isSafeInteger(r.count)||r.count<1||r.city!=null&&typeof r.city!=='string'||r.country!=null&&!/^[A-Z]{2}$/.test(r.country))throw Error('Invalid event');ids.add(r.id)}
  const body=host.querySelector('[data-feed-body="'+i+'"]'),open=new Set([...body.querySelectorAll('details[open]')].map(d=>d.dataset.eventId));
  const html=report.rows.length?report.rows.map(r=>{
   const place=[r.city,r.country?country(r.country):null].filter(Boolean).join(', '),caption=place?'Approx. '+place:r.category==='registrations'?'Location unavailable':r.section;
   const at=new Date(r.at),time=at.toDateString()===new Date().toDateString()?at.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:true}):at.toLocaleDateString(undefined,{month:'short',day:'numeric'});
   return '<details class="activity-feed-event" data-event-id="'+esc(r.id)+'"'+(open.has(r.id)?' open':'')+'><summary><span class="activity-feed-marker" aria-hidden="true">'+(r.category==='code'?'⌘':r.category==='ui'?'◇':'•')+'</span><span class="activity-feed-summary"><strong>'+esc(r.title)+'</strong><small>'+esc(caption)+'</small></span>'+(r.count>1?'<span class="activity-feed-count">×'+r.count+'</span>':'')+'<time datetime="'+esc(r.at)+'" title="'+esc(at.toLocaleString())+'">'+esc(time)+'</time><span class="activity-feed-chevron" aria-hidden="true">＋</span></summary><div class="activity-feed-detail"><p>'+esc(r.section)+' · '+r.count+' recorded '+(r.count===1?'event':'events')+'</p>'+(r.commit?'<p>Commit '+esc(String(r.commit).slice(0,12))+'</p>':'')+(r.deployment?'<p>Deployment '+esc(r.deployment)+'</p>':'')+'<p>'+esc(at.toLocaleString())+'</p>'+(place?'<p>Approximate network location; not a verified address.</p>':'')+'</div></details>';
  }).join(''):'<p>No matching activity in the last 7 days.</p>';
  if(body.innerHTML!==html)body.innerHTML=html;
 }
 function schedule(i){clearTimeout(timers[i]);if(valid()&&visible()&&inView&&!paused[i])timers[i]=setTimeout(()=>void refresh(i),10000)}
 async function refresh(i,manual=false){
  clearTimeout(timers[i]);if(!valid()||!visible()||!inView&&!manual||paused[i]&&!manual)return;
  if(controllers[i]&&!manual)return;
  if(!manual&&host.contains(document.activeElement)){schedule(i);return}
  controllers[i]?.abort();const controller=controllers[i]=new AbortController(),version=++versions[i],end=new Date(),start=new Date(end-7*864e5),stamp=host.querySelector('[data-feed-stamp="'+i+'"]');
  const deadline=setTimeout(()=>controller.abort(),10000);
  try{const report=await VACANCY_BACKEND.adminActivityFeed(kinds[i],start.toISOString(),end.toISOString(),filters[i],{signal:controller.signal});if(version!==versions[i]||!valid()||!visible()||controller.signal.aborted)return;render(i,report);stamp.textContent=(paused[i]?'Paused · ':'')+'Latest grouped activity · '+end.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:true});}
  catch{if(version===versions[i]&&valid()&&visible()){host.querySelector('[data-feed-body="'+i+'"] ').textContent='Connection unavailable. Refresh to retry.';stamp.textContent=''}}finally{clearTimeout(deadline);if(version===versions[i]){controllers[i]=null;schedule(i)}}
 }
 for(let i=0;i<2;i++){
  const filter=host.querySelector('[data-feed-filter="'+i+'"]');filter.value=filters[i];filter.onchange=()=>{filters[i]=filter.value;try{localStorage.setItem(key,JSON.stringify(filters))}catch{}void refresh(i,true)};
  const pause=host.querySelector('[data-feed-pause="'+i+'"]');pause.onclick=()=>{paused[i]=!paused[i];pause.textContent=paused[i]?'Resume':'Pause';pause.setAttribute('aria-label',(paused[i]?'Resume ':'Pause ')+titles[i].toLowerCase());if(paused[i]){versions[i]++;controllers[i]?.abort();controllers[i]=null;clearTimeout(timers[i]);host.querySelector('[data-feed-stamp="'+i+'"] ').textContent='Paused'}else void refresh(i,true)};
  host.querySelector('[data-feed-refresh="'+i+'"] ').onclick=()=>void refresh(i,true);
 }
 const refreshAll=event=>{const groups=event?.detail?.groups;if(!groups||groups.includes('all')||groups.includes('site_feed'))void refresh(0);if(!groups||groups.includes('all')||groups.includes('visitor_feed'))void refresh(1)};
 function cancel(){for(let i=0;i<2;i++){versions[i]++;controllers[i]?.abort();controllers[i]=null;clearTimeout(timers[i])}}
 function cleanup(){if(stopped)return;stopped=true;cancel();observer.disconnect();intersection.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);window.removeEventListener('storage',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('vacancy:refresh-data',refreshAll);host.remove()}
 function sync(){if(!valid()){cleanup();return}if(!visible())cancel();else refreshAll()}
 const media=matchMedia('(min-width:1280px)'),observer=new MutationObserver(()=>{if(!valid())cleanup();else if(section?.hidden)cancel()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 const intersection=new IntersectionObserver(entries=>{const wasInView=inView;inView=entries.some(e=>e.isIntersecting);if(inView&&!wasInView)refreshAll();else if(!inView)cancel()});intersection.observe(host);
 media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('storage',sync);window.addEventListener('hashchange',sync);window.addEventListener('vacancy:refresh-data',refreshAll);return {cleanup};
};
