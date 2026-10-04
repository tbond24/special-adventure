// Admin-only readout. The database RPC also checks MFA-backed admin access.
(() => {
  const priorAdmin=renderAdmin;
  const unique=(rows,key)=>new Set(rows.map(key).filter(Boolean)).size;
  const percent=(part,total)=>total?`${Math.round(part/total*100)}%`:'—';
  const median=values=>{const list=values.filter(Number.isFinite).sort((a,b)=>a-b);return list.length?list[Math.floor((list.length-1)/2)]:null};
  const p95=values=>{const list=values.filter(Number.isFinite).sort((a,b)=>a-b);return list.length?list[Math.ceil(list.length*.95)-1]:null};
  const seconds=value=>value==null?'—':`${(value/1000).toFixed(1)}s`;
  const label=value=>escapeHtml(value||'Direct / Unknown');
  renderAdmin=async function(...args){
    let remembered;try{remembered=sessionStorage.getItem('vacancy-admin-section')}catch{}
    await priorAdmin.apply(this,args);
    const host=document.querySelector('#adminHost'),menu=document.querySelector('#adminSectionMenu'),select=document.querySelector('.admin-section-select');
    if(!host||!menu||!select||host.classList.contains('empty')||document.querySelector('[data-admin-section="marketing"]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.section='marketing';button.textContent='Marketing';menu.append(button);
    select.add(new Option('Marketing','marketing'));
    const section=document.createElement('section');section.className='admin-section';section.dataset.adminSection='marketing';section.setAttribute('aria-label','Marketing');section.hidden=true;
    section.innerHTML=`<div class="panel admin-marketing"><div class="section-head"><div><h2>Lister marketing</h2><p class="muted">From first visit to a database-confirmed publication. New tracking starts when this release is enabled.</p></div></div>
      <div class="admin-marketing-filters"><label>Period <select data-marketing-period><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom</option></select></label><label data-custom-date hidden>From <input type="date" data-marketing-from></label><label data-custom-date hidden>To <input type="date" data-marketing-to></label><label>Source <select data-marketing-source><option value="">All</option></select></label><label>Campaign <select data-marketing-campaign><option value="">All</option></select></label><label>Device <select data-marketing-device><option value="">All</option></select></label></div>
      <div class="admin-marketing-tabs" role="tablist" aria-label="Marketing views"><button type="button" data-marketing-view="overview">Overview</button><button type="button" data-marketing-view="funnel">Funnel</button><button type="button" data-marketing-view="sources">Sources</button><button type="button" data-marketing-view="performance">Performance</button><button type="button" data-marketing-view="errors">Errors</button></div>
      <div data-marketing-results aria-live="polite">Open Marketing to load results.</div></div>`;
    host.append(section);
    if(remembered==='marketing')button.click();
    const panel=section.querySelector('.admin-marketing'),results=panel.querySelector('[data-marketing-results]');
    const period=panel.querySelector('[data-marketing-period]'),from=panel.querySelector('[data-marketing-from]'),to=panel.querySelector('[data-marketing-to]');
    const source=panel.querySelector('[data-marketing-source]'),campaign=panel.querySelector('[data-marketing-campaign]'),device=panel.querySelector('[data-marketing-device]');
    const views=[...panel.querySelectorAll('[data-marketing-view]')];let view='overview',data=null,loading=false;
    const options=(node,values)=>{const selected=node.value;node.replaceChildren(new Option('All',''),...[...new Set(values.filter(Boolean))].sort().map(value=>new Option(value,value)));node.value=[...node.options].some(option=>option.value===selected)?selected:''};
    function filtered(){
      const match=item=>(!source.value||(item.source||'Direct / Unknown')===source.value)&&(!campaign.value||(item.campaign||'')===campaign.value)&&(!device.value||(item.device_class||'')===device.value);
      return {events:(data?.events||[]).filter(match),publications:(data?.publications||[]).filter(match)};
    }
    function paint(){
      if(!data)return;const {events,publications}=filtered(),byName=name=>events.filter(event=>event.event_name===name);
      const visits=byName('lister_landing_viewed'),starts=byName('listing_started'),submitted=byName('listing_submitted');
      const visitors=unique(visits,row=>row.visitor_id),sessions=unique(byName('lister_session_started'),row=>row.session_id);
      const publishedProperties=unique(publications.filter(row=>row.is_first_property_publication),row=>row.property_id),publishedListings=unique(publications,row=>row.vacancy_id);
      const stageNames=[['Landing','lister_landing_viewed'],['List clicked','list_property_clicked'],['Listing started','listing_started'],['Location complete','location_completed'],['Details and photos complete','listing_details_completed'],['Preview','listing_previewed'],['Submitted','listing_submitted']];
      let cohort=null;
      const stages=stageNames.map(([name,event])=>{const observed=new Set(byName(event).map(row=>row.visitor_id).filter(Boolean));cohort=cohort?new Set([...cohort].filter(id=>observed.has(id))):observed;return{name,count:cohort.size}});
      const publishedVisitors=new Set(publications.filter(row=>row.is_first_property_publication).map(row=>row.visitor_id).filter(Boolean));
      stages.push({name:'Property published',count:[...cohort].filter(id=>publishedVisitors.has(id)).length});
      const incomplete=Number(data.events?.length||0)>5000||Number(data.publications?.length||0)>5000;
      const note='<p class="muted">Publication is counted from the database status log. Source for a publication is unknown when no linked listing event was received. Recent journeys may still be in progress.</p>';
      let html='';
      if(view==='overview'){
        html=`<div class="stat-grid"><div class="stat"><strong>${visitors}</strong>Visitors</div><div class="stat"><strong>${sessions}</strong>Sessions</div><div class="stat"><strong>${unique(starts,row=>row.visitor_id)}</strong>Listers started</div><div class="stat"><strong>${unique(submitted,row=>row.vacancy_id)}</strong>Listings submitted</div><div class="stat"><strong>${publishedProperties}</strong>Properties published</div><div class="stat"><strong>${publishedListings}</strong>Listings published</div></div><p>Observed visitor → start: ${percent(stages[2].count,stages[0].count)} · Start → submit: ${percent(stages[6].count,stages[2].count)} · Submit → published: ${percent(stages[7].count,stages[6].count)}</p>${note}`;
      }else if(view==='funnel'){
        const biggest=stages.slice(0,-1).map((stage,index)=>({from:stage.name,to:stages[index+1].name,lost:Math.max(0,stage.count-stages[index+1].count)})).sort((a,b)=>b.lost-a.lost)[0];
        html=`<div class="admin-metric-table"><table><thead><tr><th>Stage</th><th>Visitors</th><th>From previous</th><th>From landing</th><th>Not yet progressed</th></tr></thead><tbody>${stages.map((stage,index)=>`<tr><td>${label(stage.name)}</td><td>${stage.count}</td><td>${index?percent(stage.count,stages[index-1].count):'100%'}</td><td>${percent(stage.count,visitors)}</td><td>${index<stages.length-1?Math.max(0,stage.count-stages[index+1].count):'—'}</td></tr>`).join('')}</tbody></table></div><p>${biggest?`Largest observed gap: ${label(biggest.from)} → ${label(biggest.to)} (${biggest.lost} visitors not yet at the next stage).`:'No journey data yet.'}</p>${note}`;
      }else if(view==='sources'){
        const key=row=>[row.source||'Direct / Unknown',row.medium||'unknown'].join('|');
        const groups=[...new Set([...visits,...publications].map(key))].sort();
        html=`<div class="admin-metric-table"><table><thead><tr><th>Source</th><th>Medium</th><th>Visitors</th><th>Starts</th><th>Submitted</th><th>Properties published</th><th>Visitor publish rate</th></tr></thead><tbody>${groups.map(group=>{const [sourceName,mediumName]=group.split('|'),visitRows=visits.filter(row=>key(row)===group),publishedRows=publications.filter(row=>row.is_first_property_publication&&key(row)===group),count=unique(visitRows,row=>row.visitor_id),published=unique(publishedRows,row=>row.property_id),publishedVisitors=unique(publishedRows,row=>row.visitor_id);return `<tr><td>${label(sourceName)}</td><td>${label(mediumName)}</td><td>${count}</td><td>${unique(starts.filter(row=>key(row)===group),row=>row.visitor_id)}</td><td>${unique(submitted.filter(row=>key(row)===group),row=>row.vacancy_id)}</td><td>${published}</td><td>${count?percent(publishedVisitors,count):'—'}</td></tr>`}).join('')}</tbody></table></div><p class="muted">Visitor publish rate compares linked publishers with visitors in this date window; journeys begun earlier may appear as unknown. Campaign and ad IDs can be filtered above. Ad spend is not connected.</p>${note}`;
      }else if(view==='performance'){
        const ready=byName('step_ready'),uploads=byName('photo_upload'),completed=events.filter(row=>['location_completed','listing_details_completed'].includes(row.event_name));
        const grouped=[...new Set(ready.map(row=>row.step))].map(step=>({step,median:median(ready.filter(row=>row.step===step).map(row=>row.duration_ms))})).sort((a,b)=>(b.median||0)-(a.median||0));
        const firstStart=new Map();starts.forEach(row=>{const key=row.journey_id||row.session_id;if(key&&(!firstStart.has(key)||row.created_at<firstStart.get(key)))firstStart.set(key,row.created_at)});
        const completionTimes=submitted.map(row=>{const start=firstStart.get(row.journey_id||row.session_id);return start?new Date(row.created_at)-new Date(start):NaN}).filter(value=>Number.isFinite(value)&&value>=0);
        const devices=[...new Set(events.map(row=>[row.device_class||'Unknown',row.browser_family||'Unknown'].join(' / ')))].sort();
        html=`<div class="stat-grid"><div class="stat"><strong>${seconds(median(completionTimes))}</strong>Median observed start → submit</div><div class="stat"><strong>${seconds(median(ready.map(row=>row.duration_ms)))}</strong>Median step ready</div><div class="stat"><strong>${seconds(p95(ready.map(row=>row.duration_ms)))}</strong>p95 step ready</div><div class="stat"><strong>${seconds(median(uploads.map(row=>row.duration_ms)))}</strong>Median photo upload</div><div class="stat"><strong>${seconds(median(completed.map(row=>row.active_ms)))}</strong>Median active step time</div></div><p>Slowest measured transition: ${grouped[0]?`${label(grouped[0].step)} (${seconds(grouped[0].median)})`:'No measurements yet.'}</p><div class="admin-metric-table"><table><thead><tr><th>Device / browser</th><th>Sessions</th><th>Starts</th><th>Errors</th><th>Median step ready</th></tr></thead><tbody>${devices.map(name=>{const rows=events.filter(row=>[row.device_class||'Unknown',row.browser_family||'Unknown'].join(' / ')===name);return `<tr><td>${label(name)}</td><td>${unique(rows,row=>row.session_id)}</td><td>${unique(rows.filter(row=>row.event_name==='listing_started'),row=>row.journey_id||row.session_id)}</td><td>${rows.filter(row=>row.event_name==='journey_error').length}</td><td>${seconds(median(rows.filter(row=>row.event_name==='step_ready').map(row=>row.duration_ms)))}</td></tr>`}).join('')}</tbody></table></div><p class="muted">Active time excludes time when the browser tab was hidden. Browser timing may include device or network delay. Start → submit includes only journeys with both events inside the selected period.</p>`;
      }else{
        const errors=byName('journey_error'),affected=unique(errors,row=>row.session_id),allSessions=unique(events,row=>row.session_id),codes=[...new Set(errors.map(row=>row.error_code||'other'))];
        html=`<div class="stat-grid"><div class="stat"><strong>${affected}</strong>Sessions with errors</div><div class="stat"><strong>${percent(affected,allSessions)}</strong>Error-session rate</div></div><div class="admin-metric-table"><table><thead><tr><th>Error category</th><th>Step</th><th>Device / browser</th><th>Occurrences</th><th>First</th><th>Last</th></tr></thead><tbody>${codes.flatMap(code=>[...new Set(errors.filter(row=>(row.error_code||'other')===code).map(row=>[row.step||'Unknown',row.device_class||'Unknown',row.browser_family||'Unknown'].join('|')))].map(group=>{const [step,device,browser]=group.split('|'),rows=errors.filter(row=>(row.error_code||'other')===code&&(row.step||'Unknown')===step&&(row.device_class||'Unknown')===device&&(row.browser_family||'Unknown')===browser).sort((a,b)=>a.created_at.localeCompare(b.created_at));return `<tr><td>${label(code)}</td><td>${label(step)}</td><td>${label(device+' / '+browser)}</td><td>${rows.length}</td><td>${new Date(rows[0].created_at).toLocaleString()}</td><td>${new Date(rows.at(-1).created_at).toLocaleString()}</td></tr>`})).join('')}</tbody></table></div><p class="muted">An error and an unfinished journey can occur together; this view does not claim the error caused abandonment.</p>`;
      }
      if(incomplete)html='<p role="status">Only the newest 5,000 records are shown for this range. Counts below are partial; choose a shorter period.</p>'+html;
      if(!events.length&&!publications.length)html='<p class="muted">No lister journey data in this period yet.</p>';
      results.innerHTML=html;
      if(view==='overview'&&events.length){
        const recent=[...new Set([...events,...publications].map(row=>row.session_id).filter(Boolean))].slice(0,20);
        const timeline=document.createElement('details');timeline.className='admin-fold';timeline.innerHTML='<summary>Inspect a session timeline</summary><label>Session <select data-journey-session></select></label><ol data-journey-timeline></ol>';
        const picker=timeline.querySelector('select');recent.forEach((id,index)=>picker.add(new Option(`Session ${index+1} · ${id.slice(0,8)}`,id)));
        const showTimeline=()=>{const rows=[...events.filter(row=>row.session_id===picker.value),...publications.filter(row=>row.session_id===picker.value).map(row=>({...row,event_name:row.is_first_property_publication?'property_published':'listing_published_confirmed'}))].sort((a,b)=>a.created_at.localeCompare(b.created_at));timeline.querySelector('ol').innerHTML=rows.map(row=>`<li>${new Date(row.created_at).toLocaleTimeString()} · ${label(row.event_name)}${row.step?` · ${label(row.step)}`:''}${row.error_code?` · ${label(row.error_code)}`:''}</li>`).join('')};
        picker.onchange=showTimeline;showTimeline();results.append(timeline);
      }
    }
    async function load(){
      if(loading)return;loading=true;results.textContent='Loading lister results…';
      try{
        const end=period.value==='custom'&&to.value?new Date(to.value+'T23:59:59.999').toISOString():new Date().toISOString();
        const start=period.value==='custom'&&from.value?new Date(from.value+'T00:00:00').toISOString():new Date(Date.now()-Number(period.value)*86400000).toISOString();
        data=await VACANCY_BACKEND.adminListerMarketing(start,end);
        options(source,[...(data.events||[]),...(data.publications||[])].map(row=>row.source||'Direct / Unknown'));
        options(campaign,[...(data.events||[]),...(data.publications||[])].map(row=>row.campaign));
        options(device,[...(data.events||[]),...(data.publications||[])].map(row=>row.device_class));
        paint();
      }catch(error){results.textContent=error.message}finally{loading=false}
    }
    views.forEach(button=>button.onclick=()=>{view=button.dataset.marketingView;views.forEach(item=>item.setAttribute('aria-selected',String(item===button)));paint()});
    views[0].setAttribute('aria-selected','true');
    period.onchange=()=>{panel.querySelectorAll('[data-custom-date]').forEach(item=>item.hidden=period.value!=='custom');if(period.value!=='custom')void load()};
    from.onchange=to.onchange=()=>{if(from.value&&to.value)void load()};
    source.onchange=campaign.onchange=device.onchange=paint;
    button.addEventListener('click',()=>{if(!data)void load()});
    select.addEventListener('change',()=>{if(select.value==='marketing'&&!data)void load()});
    if(remembered==='marketing')void load();
  };
})();
