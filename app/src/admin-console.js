// Presentation only. No collection, authentication bypass or synthetic data lives here.
(() => {
  const safe=value=>escapeHtml(String(value??''));
  const names={overview:'Overview',activity:'Activity',people:'People & listings',reports:'Reports',system:'System',icons:'Appearance',marketing:'Marketing',design:'Admin Panel'};
  const descriptions={overview:'',activity:'Recorded marketplace activity over time.',people:'Find and manage existing people and listings.',reports:'Review reports and recorded moderation decisions.',system:'Delivery, storage and operational information.',icons:'Manage site icons and their existing revisions.',marketing:'Understand how recorded visits become listing journeys.',design:'Customise · Control · Keep it simple.'};
  const paths={overview:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',activity:'M3 17l5-6 5 3 8-10 M3 21h18',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',reports:'M5 21V3h13l-2 5 2 5H5',system:'M4 4h16v6H4z M4 14h16v6H4z M7 7h.01 M7 17h.01',icons:'M12 3a9 9 0 1 0 9 9c0-1-1-2-2-2h-3a2 2 0 0 1-2-2V5c0-1-1-2-2-2 M7 10h.01 M8 15h.01 M12 17h.01',marketing:'M4 20V13 M10 20V8 M16 20V3 M3 21h18',design:'M12 3 3 12 12 21 21 12 12 3Z M9 12h6'};
  const glyph=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.activity}"/></svg>`;
  // One markup contract for aggregate info tiles; values/notes come from the report.
  function infoTile(label,value,note,kind='',trend=null){
    const icons={
      'Recorded arrivals':'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
      'Journeys started':'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
      'Reached Review':'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      'With publication':'M12 3l9 8v10H3V11z M9 21v-8h6v8',
      '7-day publication rate':'M4 20V13 M10 20V8 M16 20V3 M3 21h18'
    };
    const path=icons[label]||'M4 4h16v16H4z M8 16v-4 M12 16V8 M16 16v-6';
    let spark='<span class="info-tile-trend"><small>Trend unavailable</small></span>';
    if(value!=='—'&&Array.isArray(trend)&&trend.length>=2&&trend.length<=90&&trend.every(n=>Number.isFinite(n)&&n>=0)){
      const low=Math.min(...trend),range=Math.max(...trend)-low||1;
      const points=trend.map((n,i)=>`${(4+i*112/(trend.length-1)).toFixed(2)},${(36-(n-low)*30/range).toFixed(2)}`).join(' ');
      spark=`<span class="info-tile-trend"><svg viewBox="0 0 120 42" role="img" aria-label="Synthetic example trend"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><small>Synthetic example trend</small></span>`;
    }
    return `<article class="journey-stat info-tile ${kind==='error'?'error':kind==='positive'?'positive':''}"><span class="info-tile-heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg><span class="info-tile-label">${safe(label)}</span></span><strong class="info-tile-value">${safe(value)}</strong>${spark}<small class="info-tile-note">${safe(note)}</small></article>`;
  }
  function mountShell(host,menu,select){
    const page=host.closest('.admin-page');if(!page||page.classList.contains('admin-console'))return;
    page.classList.add('admin-console');window.VACANCY_ANALYTICS_PREFERENCES?.exclude?.();
    const snapshotLabel=host.querySelector('.admin-health strong');if(snapshotLabel)snapshotLabel.textContent='Recorded operations snapshot';
    for(const stat of host.querySelectorAll('.admin-stat-grid .stat'))if(stat.textContent.includes('Listings → messages')){const value=stat.querySelector('strong');if(value)value.textContent=value.textContent.replace('%','');for(const node of stat.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent.includes('Listings → messages'))node.textContent='Message requests per 100 listings · 7d';}
    if(!document.querySelector('[data-admin-console-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin-console.css?v=20261021-traffic';link.dataset.adminConsoleStyle='true';document.head.append(link);}
    const heading=page.querySelector(':scope > .section-head');heading.classList.add('console-topbar');
    const theme=document.createElement('button');theme.type='button';theme.className='theme-toggle console-theme-toggle';theme.dataset.themeToggle='';page.append(theme);bindVacancyThemeControl(theme,'admin');
    const rail=document.createElement('aside');rail.className='console-sidebar';rail.id='consoleSidebar';
    rail.innerHTML='<a class="console-brand" href="#home" aria-label="Vacancy — return to site"><span class="brand-logo-stack" aria-hidden="true"><img class="brand-logo" src="assets/vacancy-logo.png" alt=""></span></a><p class="console-eyebrow">OPERATIONS</p>';
    for(const button of menu.querySelectorAll('button'))button.innerHTML=glyph(button.dataset.section)+`<span>${safe(button.textContent)}</span>`;
    rail.append(menu);rail.insertAdjacentHTML('beforeend','<a class="console-return" href="#home">← Return to site</a>');page.prepend(rail);

    const site=document.createElement('div');
    site.className='design-site-card';
    site.innerHTML='<strong>Site status</strong><small>Unknown · no recent check</small>'+
      '<a href="/" target="_blank" rel="noopener noreferrer">View site ↗</a>';
    rail.append(site);
    heading.querySelector('#adminRefresh')?.remove();
    const toggle=document.createElement('button');toggle.type='button';toggle.className='console-menu-toggle';toggle.textContent='☰';toggle.setAttribute('aria-label','Open admin navigation');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',rail.id);heading.prepend(toggle);
    const backdrop=document.createElement('button');backdrop.className='console-backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Close admin navigation');backdrop.hidden=true;page.append(backdrop);
    const close=()=>{page.classList.remove('console-menu-open');toggle.setAttribute('aria-expanded','false');backdrop.hidden=true;};
    toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';close();if(open){page.classList.add('console-menu-open');toggle.setAttribute('aria-expanded','true');backdrop.hidden=false;menu.querySelector('[aria-current=page]')?.focus();}};
    backdrop.onclick=()=>{close();toggle.focus();};
    page.addEventListener('keydown',event=>{if(!page.classList.contains('console-menu-open'))return;if(event.key==='Escape'){close();toggle.focus();}if(event.key==='Tab'){const items=[...rail.querySelectorAll('a,button')];const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
    mountSnapshotRefresh(host);
    const sync=()=>{const key=select.value;page.dataset.adminView=key;heading.querySelector('h1').textContent=names[key]||'Admin';heading.querySelector('p').textContent=descriptions[key]||'';close();};
    menu.addEventListener('click',event=>{if(event.target.closest('[data-section]'))sync();});select.addEventListener('change',sync);sync();window.mountAdminMetricWorkspace?.(host);
  }
  function mountSnapshotRefresh(host){
    const grid=host.querySelector('.admin-stat-grid');if(!grid)return;
    const actor=currentUser?.id,keys=['open_reports','oldest_report_hours','active_listings','users_total','properties','units','enquiries_7d','listings_7d'],cards=[...grid.children],error=document.createElement('small');grid.after(error);
    let controller=null,version=0;
    const valid=()=>host.isConnected&&currentUser?.id===actor&&location.hash==='#admin'&&VACANCY_BACKEND.assuranceLevel()==='aal2';
    async function refresh(event){
      if(event.detail?.initial||!valid())return;
      controller?.abort();controller=new AbortController();const active=controller,id=++version,deadline=setTimeout(()=>active.abort(),10000);grid.setAttribute('aria-busy','true');
      try{
        const r=await VACANCY_BACKEND.adminDashboard({at:event.detail?.at||Date.now(),signal:active.signal});if(id!==version||!valid()||active.signal.aborted)return;
        if(keys.some(k=>!Number.isSafeInteger(r?.[k])||r[k]<0))throw Error('Invalid snapshot');
        cards.forEach((c,i)=>{const n=c.querySelector('strong');if(n)n.textContent=r[keys[i]].toLocaleString()});error.textContent='';grid.title='Last refreshed '+new Date(event.detail?.at||Date.now()).toLocaleString();
      }catch{if(id===version&&valid()){cards.forEach(c=>{const n=c.querySelector('strong');if(n)n.textContent='—'});error.textContent='Snapshot unavailable. Refresh to retry.'}}
      finally{clearTimeout(deadline);if(id===version)grid.removeAttribute('aria-busy')}
    }
    const observer=new MutationObserver(()=>{if(!valid()){++version;controller?.abort();window.removeEventListener('vacancy:refresh-data',refresh);observer.disconnect()}});observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('vacancy:refresh-data',refresh);
  }
  // Preferences contain presentation choices only, scoped to the current account.
  function mountGraphChoices(root){
    const choices=[['events','Button & page activity'],['live','Live activity'],['location','Listings by location'],['seeker','Seeker journey'],['activity','Recorded activity'],['sources','Acquisition sources'],['outcomes','Publication outcomes'],['flow','Listing milestone flow']];
    const key='vacancy-admin-overview-graphs-v3:'+String(currentUser?.id||'');
    let selected=choices.map(([id])=>id),temporary=false;
    try{let saved=JSON.parse(localStorage.getItem(key)||'null');
      if(saved===null){const v2=localStorage.getItem(key.replace('-v3:','-v2:'));const legacy=JSON.parse(v2||localStorage.getItem(key.replace('-v3:','-v1:'))||'null');if(Array.isArray(legacy))saved=[...new Set([...legacy,...(v2?['events']:['live','location','seeker','events'])])];}
      if(Array.isArray(saved)&&saved.every(id=>choices.some(([known])=>known===id)))selected=saved;
    }catch{}
    const controls=document.createElement('fieldset');controls.className='overview-graph-choices';
    const legend=document.createElement('legend');legend.textContent='Graphs on Overview';controls.append(legend);
    const status=document.createElement('p');status.setAttribute('role','status');
    for(const [id,title] of choices){
      const label=document.createElement('label'),input=document.createElement('input');
      input.type='checkbox';input.value=id;input.checked=selected.includes(id);
      label.append(input,document.createTextNode(title));controls.append(label);
      input.onchange=()=>{selected=[...controls.querySelectorAll('input:checked')].map(el=>el.value);
        try{localStorage.setItem(key,JSON.stringify(selected));temporary=false;}catch{temporary=true;}
        apply();};
    }
    const restore=document.createElement('button');restore.type='button';restore.textContent='Show all graphs';
    restore.onclick=()=>{for(const input of controls.querySelectorAll('input'))input.checked=true;
      controls.querySelector('input').dispatchEvent(new Event('change'));};
    controls.append(restore,status);root.querySelector('.journey-body').before(controls);
    function apply(){
      for(const [id] of choices)root.classList.toggle('overview-hide-'+id,!selected.includes(id));
      root.closest('[data-admin-section]')?.classList.toggle('overview-hide-seeker',!selected.includes('seeker'));
      status.textContent=(selected.length?'':'No graphs selected. Choose a graph above to show it. ')+
        (temporary?'Choices could not be saved. Changes last until you leave this page.':'Saved');
    }
    apply();
  }
  function mountJourney(section,provider){
    // An aggregate provider is supplied explicitly; legacy reporting remains intact elsewhere.
    const root=document.createElement('div');root.className='console-journey';section.replaceChildren(root);
    root.innerHTML=`<div class="journey-heading"><div><p class="console-eyebrow">ACQUISITION & PROGRESSION</p><h2>Visitor journey</h2><p>Observed paths through Vacancy. Every count has a clear unit.</p></div><button class="console-refresh" type="button">Refresh</button></div>
      <form class="journey-filters"><label>Period<select name="period"><option value="30">Last 30 days</option><option value="7">Last 7 days</option></select></label><label>Source<select name="source"><option value="">All sources</option></select></label><label>Campaign<select name="campaign"><option value="">All campaigns</option></select></label><label>Device<select name="device"><option value="">All devices</option><option>mobile</option><option>desktop</option></select></label><span class="journey-timezone">7-day observation</span></form><p class="journey-freshness" role="status"></p><div class="journey-body"></div>`;
    mountGraphChoices(root);
    const metricCards=document.createElement('div');root.prepend(metricCards);const metricCardsApi=window.VACANCY_OVERVIEW_CARDS.mount(metricCards);window.VACANCY_JOURNEY_MAP.mount(metricCards);window.mountVacancyOverviewInsights(root);window.mountVacancyEventExplorer(root);
    const form=root.querySelector('form.journey-filters'),body=root.querySelector('.journey-body'),fresh=root.querySelector('.journey-freshness'),refresh=root.querySelector('.console-refresh');let request=0,data=null;
    refresh.addEventListener('click',()=>metricCardsApi.refresh());
    const stat=(label,value,note,kind='')=>infoTile(label,value,note,kind,null);
    function paint(report){
      for(const key of ['source','campaign','device'])form.elements[key].disabled=!report.complete;
      if(!report.complete){body.innerHTML='<div class="journey-state" role="status"><h3>Tracking coverage is incomplete</h3><p>This range cannot support reliable flow totals or a completion rate. Narrow the period or retry. Missing records are not failed journeys.</p></div>';return;}
      if(!report.total){body.innerHTML='<div class="journey-state"><h3>No recorded journeys</h3><p>No eligible creation journeys match these filters. Try another source, campaign or period.</p></div>';return;}
      const pct=report.linkageComplete&&report.mature?`${(100*report.matureSuccess/report.mature).toFixed(1)}%`:'—';
      body.innerHTML=`<div class="journey-stats">${stat('Recorded arrivals',report.arrivals,'Sessions · not people')}${stat('Journeys started',report.total,'Distinct creation journeys')}${stat('Reached Review',report.stages[2].count,'Observed within seven days')}${stat('With publication',report.confirmed,`${report.listings} distinct published listings`,'positive')}${stat('7-day publication rate',pct,report.linkageComplete?`${report.matureSuccess} / ${report.mature} mature recorded journeys`:'Unavailable · outcome linkage incomplete')}</div>
      <div class="journey-coverage"><span class="coverage-dot"></span><div><strong>${report.linkageComplete?'Recorded cohort coverage complete':'Outcome linkage is incomplete'}</strong><p>${report.unknown} journeys have unknown publication linkage. ${report.observing} are still within observation. Unconfirmed does not mean failed or abandoned.</p></div><button type="button" data-definition>Definitions</button></div>
      <section class="journey-arrivals"><div><h3>Arrival activity</h3><p>Sessions are separate from the creation journeys below.</p></div><div><strong>${report.arrivals}</strong><span> recorded arrival sessions</span><b aria-hidden="true"> → </b><strong>${report.intentSessions}</strong><span> reached listing intent</span></div></section>
      <section class="journey-flow-panel"><div class="flow-panel-title"><div><h3>How listing journeys progress</h3><p>Select a stage to inspect its recorded journeys.</p></div><span class="unit-chip">Counting unit: journeys</span></div><div class="journey-flow-layout"><aside class="journey-sources"><h4>Acquisition sources</h4>${report.sources.map(s=>`<button type="button" data-source="${safe(s.name)}"><span class="source-dot" style="--source-colour:${safe(s.colour)}"></span><span>${safe(s.name)}<small>${s.count} journeys</small></span><meter min="0" max="${report.total}" value="${s.count}" aria-label="${safe(s.name)} journeys">${s.count}</meter></button>`).join('')}<p>Source at journey start.<br>Unattributed stays unknown.</p></aside><div class="journey-chart"><div class="journey-graph" role="group" aria-label="Observed listing milestone flow"></div><p class="flow-legend"><span></span> Observed progression <i></i> Last recorded at this stage</p><p class="flow-note">Photos and pricing are inside Listing details. Retries do not add another journey.</p></div><aside class="journey-outcomes"><h4>Outcome evidence</h4><article class="outcome-confirmed"><span>Confirmed publication</span><strong>${report.confirmed}</strong><small>Journeys · ${report.listings} listings</small></article><article><span>Linkage unknown</span><strong>${report.unknown}</strong><small>Publication cannot be associated reliably</small></article><article><span>No linked confirmation</span><strong>${report.total-report.confirmed-report.unknown}</strong><small>Including still-observing journeys; not proof of abandonment</small></article></aside></div></section>
      <section class="journey-selection" aria-live="polite"><h3>Explore the flow</h3><p>Choose Location, Listing details, Review or Submission to see the supporting journey records.</p></section>
      <div class="journey-insights">${stat('Journeys with errors',report.errors,'May also have published','error')}${stat('Returned in another session',report.returned,'Same recorded journey')}${stat('No recorded activity · 24h',report.inactive,'An observation, not an exit')}${stat('Still observing',report.observing,'Seven-day window not complete')}</div>
      <details class="journey-details"><summary>Accessible flow table</summary><div class="journey-table-wrap" tabindex="0" role="region" aria-label="Observed transitions"><table><caption>One count per journey at each milestone</caption><thead><tr><th>Milestone</th><th>Reached</th><th>Continued</th><th>Last observed here</th></tr></thead><tbody>${report.stages.map((s,i)=>`<tr><th>${safe(s.label)}</th><td>${s.count}</td><td>${report.stages[i+1]?.count??report.confirmed}</td><td>${s.count-(report.stages[i+1]?.count??report.confirmed)}</td></tr>`).join('')}</tbody></table></div></details>
      <details class="journey-details"><summary>Performance & recorded errors</summary><p>Diagnostic events can overlap publication outcomes. A recorded error is not an inferred exit.</p><div class="journey-table-wrap"><table><thead><tr><th>Recorded category</th><th>Affected journeys</th></tr></thead><tbody><tr><td>Photo upload retry</td><td>${report.errors}</td></tr></tbody></table></div><p>Timing measurements unavailable in this visual fixture. No production performance is implied.</p></details>
      <details class="journey-details journey-definitions"><summary>Definitions, coverage & retention</summary><p>Arrival sessions, creation journeys and published listings are different counting units. Source/campaign/device describe the journey-start snapshot. Dates use UTC, start inclusive and end exclusive.</p><p>The seven-day publication rate uses mature recorded journeys only: those whose seven-day window plus 24-hour ingestion grace has ended. When linkage or required evidence is incomplete, the rate is unavailable. Even a complete recorded cohort does not measure all visitors.</p><p>Errors overlap successes. Missing linkage is unknown. No confirmed publication—even after seven days—is not proof of abandonment. The proposed 90-day retention must mark affected cohorts incomplete when required evidence has expired; it must not silently shorten their history.</p><p>Hosted authentication and privacy/consent decisions remain release dependencies. Live tracking is not enabled by this preview.</p></details>`;
      drawGraph(report);
      body.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>{form.elements.source.value=button.dataset.source;load();});
      body.querySelector('[data-definition]').onclick=()=>{const node=body.querySelector('.journey-definitions');node.open=true;node.scrollIntoView({block:'center',behavior:'auto'});node.querySelector('summary').focus();};
    }
    function drawGraph(report){
      const graph=body.querySelector('.journey-graph');const colours=['#ff5a3d','#6d6ae8','#b37bdc','#dfa143'];
      const scale=150/report.total,y=75,w=18,positions=[20,140,260,380];
      let svg='<svg viewBox="0 0 560 335" aria-hidden="true"><defs><linearGradient id="journeyBand"><stop stop-color="#ff5a3d" stop-opacity=".38"/><stop offset="1" stop-color="#b98dde" stop-opacity=".3"/></linearGradient></defs>';
      report.stages.forEach((s,i)=>{const x=positions[i],height=s.count*scale,next=report.stages[i+1]?.count??report.confirmed,remain=(s.count-next)*scale;
        {const nx=positions[i+1]??500,nh=next*scale;svg+=`<path d="M${x+w} ${y} C${x+70} ${y},${nx-55} ${y},${nx} ${y} L${nx} ${y+nh} C${nx-55} ${y+nh},${x+70} ${y+nh},${x+w} ${y+nh}Z" fill="${i===3?'#b8e1cf':'url(#journeyBand)'}"/>`;}
        if(remain>0)svg+=`<path d="M${x+w} ${y+next*scale} C${x+60} ${y+next*scale},${x+45} 252,${x+65} 252 L${x+65} ${252+remain} C${x+35} ${252+remain},${x+45} ${y+height},${x+w} ${y+height}Z" fill="#dbe1e9"/>`;
        svg+=`<rect x="${x}" y="${y}" width="${w}" height="${height}" rx="3" fill="${colours[i]}"/><text x="${x}" y="45" fill="#56637c" font-size="12">${safe(s.label)}</text><text x="${x}" y="64" fill="#16213a" font-size="16" font-weight="600">${s.count}</text><text x="${x+30}" y="295" fill="#65748a" font-size="11">${s.count-next} last here</text>`;
      });svg+=`<rect x="500" y="75" width="18" height="${report.confirmed*scale}" rx="3" fill="#279877"/><text x="478" y="45" fill="#56637c" font-size="12">Confirmed</text><text x="500" y="64" fill="#17243b" font-size="16">${report.confirmed}</text></svg>`;
      graph.innerHTML=svg+'<div class="flow-stage-buttons">'+report.stages.map((s,i)=>`<button type="button" data-stage="${i}" aria-pressed="false"><span>${i+1}</span><strong>${safe(s.label)}</strong><small>${s.count} journeys</small></button>`).join('')+'</div>';
      graph.querySelectorAll('[data-stage]').forEach(button=>button.onclick=async()=>{
        graph.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
        const target=body.querySelector('.journey-selection'),index=Number(button.dataset.stage),stage=report.stages[index];
        const rows=report.samples.filter(r=>r.reached>index);
        target.innerHTML=`<div class="flow-panel-title"><h3>${safe(stage.label)} · ${stage.count} journeys</h3><button type="button" data-close-selection>Clear selection</button></div><p>Showing ${rows.length} illustrative records. Labels identify synthetic journeys, not real people.</p><div class="journey-table-wrap"><table><thead><tr><th>Journey</th><th>Source</th><th>Latest evidence</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.label)}</td><td>${safe(r.source)}</td><td>${safe(r.outcome)}</td></tr>`).join('')}</tbody></table></div>`;
        target.querySelector('[data-close-selection]').onclick=()=>{graph.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));target.innerHTML='<h3>Explore the flow</h3><p>Select a stage to inspect recorded journeys.</p>';button.focus();};
      });
    }
    async function load(){const id=++request;data=null;refresh.disabled=true;body.innerHTML='<div class="journey-state" role="status">Loading journey evidence…</div>';fresh.textContent='Report not loaded.';try{const report=await provider(Object.fromEntries(new FormData(form)));if(id!==request)return;data=report;for(const [key,values] of Object.entries(report.facets||{})){const select=form.elements[key];if(!select||key==='device')continue;const prior=select.value;select.replaceChildren(new Option(key==='source'?'All sources':'All campaigns',''),...values.map(v=>new Option(v,v)));select.value=prior;}fresh.textContent=`Generated ${new Date(report.generatedAt).toLocaleString('en-GB',{})} · Latest recorded event ${report.latestLabel}`;paint(report);}catch(error){if(id!==request)return;body.innerHTML=`<div class="journey-state" role="alert"><h3>Journey report unavailable</h3><p>${safe(error.message)}</p><p>Previous counts are not displayed under these filters.</p><button type="button" data-retry>Retry</button></div>`;body.querySelector('[data-retry]').onclick=load;}finally{if(id===request)refresh.disabled=false;}}
    form.onchange=()=>load();form.onsubmit=e=>e.preventDefault();refresh.onclick=()=>load();load();return {refresh:load};
  }
  window.VACANCY_ADMIN_CONSOLE={mountShell,mountJourney,mountGraphChoices,infoTile};
})();
