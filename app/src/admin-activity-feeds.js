// Read-only desktop feeds. Never infer registrations, geography or code releases.
window.mountVacancyActivityFeeds = function(root) {
 const actor=currentUser?.id, section=root.closest('[data-admin-section]');
 const host=document.createElement('div');host.className='overview-activity-feeds';
 const safe=value=>escapeHtml(String(value??''));
 host.innerHTML=['Site changes','Visitor activity'].map((title,i)=>`<section class="activity-feed" aria-label="${title}"><header><div><span class="activity-feed-eyebrow">${i?'ENGAGEMENT':'CHANGE LOG'}</span><h3>${title}</h3></div><button type="button" data-feed-refresh="${i}" aria-label="Refresh ${title.toLowerCase()}">Refresh</button></header><p class="activity-feed-coverage">${i?'Last 7 days · recorded actions and listing publications':'Published Save button edits · other sections and code releases are not connected'}</p><div data-feed-body="${i}" aria-live="polite">Loading…</div><small data-feed-stamp="${i}"></small></section>`).join('');
 root.querySelector('.overview-journey-map')?.after(host);
 if(!host.isConnected)root.querySelector('.overview-metric-row')?.after(host);
 if(!host.isConnected)root.prepend(host);
 let stopped=false;const versions=[0,0],timers=[null,null];
 const valid=()=>!stopped&&host.isConnected&&currentUser?.id===actor&&!!actor&&location.hash==='#admin'&&VACANCY_BACKEND.assuranceLevel()==='aal2';
 const visible=()=>!document.hidden&&!section?.hidden&&matchMedia('(min-width:1280px)').matches;
 const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
 function render(i,rows){
  const unique=[...new Map(rows.map(r=>[r.id,r])).values()].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,8);
  host.querySelector(`[data-feed-body="${i}"]`).innerHTML=unique.length?unique.map(r=>`<details class="activity-feed-event"><summary><span class="activity-feed-marker" aria-hidden="true">${i?'↗':'◇'}</span><span class="activity-feed-summary">${safe(r.title)}</span><time datetime="${safe(r.at)}" title="${safe(new Date(r.at).toLocaleString())}">${safe(new Date(r.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))}</time><span class="activity-feed-chevron" aria-hidden="true">＋</span></summary><div class="activity-feed-detail"><strong>${safe(r.title)}</strong><p>${safe(r.detail)}</p><p>${safe(new Date(r.at).toLocaleString())}</p></div></details>`).join(''):'<p>No recorded activity in this feed.</p>';
 }
 async function refresh(i){
  if(!valid()||!visible())return;
  const version=++versions[i],body=host.querySelector(`[data-feed-body="${i}"]`),stamp=host.querySelector(`[data-feed-stamp="${i}"]`);
  clearTimeout(timers[i]);body.textContent='Loading…';stamp.textContent='';
  try{
   const end=new Date(),start=new Date(end-7*864e5);
   const result=await Promise.race([i?VACANCY_BACKEND.adminListerMarketing(start.toISOString(),end.toISOString()):VACANCY_BACKEND.adminAppearanceHistory('listing-detail/save-button'),new Promise((_,reject)=>{timers[i]=setTimeout(()=>reject(Error('Read timed out')),15000)})]);
   if(version!==versions[i]||!valid()||!visible())return;
   let rows;
   if(!i){
    if(!Array.isArray(result)||result.some(r=>!Number.isSafeInteger(r.revision)||!date(r.published_at)))throw Error('Invalid history');
    rows=result.filter(r=>r.revision>0).map(r=>({id:String(r.revision),at:r.published_at,title:'Listing Save button updated',detail:`Published revision ${r.revision}. ${typeof r.reason==='string'?r.reason:'No edit note recorded.'}`}));
   }else{
    if(!Array.isArray(result?.events)||!Array.isArray(result?.publications)||result.events.length>=5001||result.publications.length>=5001||result.events.some(r=>r.id==null||typeof r.event_name!=='string'||!date(r.created_at))||result.publications.some(r=>typeof r.vacancy_id!=='string'||!date(r.created_at)))throw Error('Invalid or incomplete activity');
    const labels={location_started:'Location step opened',listing_details_started:'Listing details opened',listing_previewed:'Listing review opened',listing_record_created:'Listing record created',contact_button_pressed:'Contact button pressed',text_button_pressed:'Text button pressed'};
    rows=result.events.filter(r=>labels[r.event_name]).map(r=>({id:'event:'+r.id,at:r.created_at,title:labels[r.event_name],detail:`Recorded browser action${r.device_class?' · '+r.device_class:''}${r.source?' · source: '+r.source:''}. This does not verify a completed registration or publication.`}));
    rows.push(...result.publications.map(r=>({id:'publication:'+r.vacancy_id,at:r.created_at,title:'Listing published',detail:'First recorded active transition in available listing history. Confirmed by the publication report; earlier history may be missing.'})));
    rows=rows.filter(r=>r.at>=start.toISOString()&&r.at<end.toISOString());
   }
   render(i,rows);stamp.textContent='Latest 8 available records · updated '+new Date().toLocaleTimeString();
  }catch{if(version===versions[i]&&valid()&&visible())body.textContent='Feed unavailable or incomplete. Refresh to retry.';}
  finally{if(version===versions[i])clearTimeout(timers[i]);}
 }
 function invalidate(){for(let i=0;i<2;i++){versions[i]++;clearTimeout(timers[i]);host.querySelector(`[data-feed-body="${i}"]`).textContent='Feed paused. Refresh when visible.';host.querySelector(`[data-feed-stamp="${i}"]`).textContent='';}}
 function cleanup(){if(stopped)return;stopped=true;invalidate();host.remove();observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);window.removeEventListener('vacancy:refresh-data',refreshAll);media.removeEventListener('change',sync);}
 const refreshAll=()=>{void refresh(0);void refresh(1);};let wasVisible=visible();
 function sync(){if(!valid()){cleanup();return;}const next=visible();if(!next&&wasVisible)invalidate();else if(next&&!wasVisible)refreshAll();wasVisible=next;}
 const media=matchMedia('(min-width:1280px)'),observer=new MutationObserver(sync);
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);window.addEventListener('vacancy:refresh-data',refreshAll);media.addEventListener('change',sync);
 host.querySelectorAll('[data-feed-refresh]').forEach(button=>button.onclick=()=>refresh(Number(button.dataset.feedRefresh)));
 refreshAll();return{cleanup};
};
