// Admin-only readout. The reporting RPC also requires an AAL2 administrator.
(() => {
  const priorAdmin = renderAdmin;
  const LIMIT_SENTINEL = 5001;
  const safe = value => escapeHtml(String(value ?? ''));
  const distinct = (rows, key) => new Set(rows.map(key).filter(Boolean)).size;
  const sourceOf = row => row.source || 'Direct / Unknown';
  const mediumOf = row => row.medium || 'unknown';
  const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const validEvents = rows => Array.isArray(rows) && rows.every(row => row && row.id != null && typeof row.event_name === 'string' && validDate(row.created_at));
  const validPublications = rows => Array.isArray(rows) && rows.every(row => row && typeof row.vacancy_id === 'string' && row.vacancy_id.length > 0 && validDate(row.created_at));
  const utc = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unavailable' : `${new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date)} UTC`;
  };
  const median = values => {
    const sorted = values.filter(Number.isFinite).sort((a,b) => a-b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length/2);
    return sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
  };
  const seconds = value => value === null ? '—' : `${(value/1000).toFixed(1)} s`;
  const table = (caption, headings, rows) => `<div class="admin-metric-table" role="region" tabindex="0" aria-label="${safe(caption)}"><table><caption>${safe(caption)}</caption><thead><tr>${headings.map(heading => `<th scope="col">${safe(heading)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const stages = [
    ['Session recorded','lister_session_started','The collector recorded a browser session.'],
    ['Page load recorded','lister_landing_viewed','The collector loaded; this does not verify a Home-page landing.'],
    ['List clicked','list_property_clicked','A List or Create New Listing control was clicked.'],
    ['Property type selected','property_type_completed','A listing type was selected; repeated choices count again.'],
    ['Listing started · Location','listing_started','A new listing form was instrumented.'],
    ['Location opened','location_started','The Location screen was entered.'],
    ['Location completed','location_completed','The form advanced from Location.'],
    ['Listing details opened','listing_details_started','The Listing details screen was entered.'],
    ['Listing details completed','listing_details_completed','The form advanced to Review. Photos and Pricing events share this trigger; they are not separate screens.'],
    ['Review opened','listing_previewed','The Review screen was entered.'],
    ['Publish clicked','publish_clicked','Publish was attempted; this does not confirm publication.'],
    ['Listing record created','listing_record_created','The listing-create call returned successfully.'],
    ['Submission recorded','listing_submitted','The reconfirm call returned successfully; database publication is separate.']
  ];

  async function buildAdmin(...args) {
    let remembered;
    try { remembered = sessionStorage.getItem('vacancy-admin-section'); } catch {}
    await priorAdmin.apply(this,args);
    const host = document.querySelector('#adminHost'), menu = document.querySelector('#adminSectionMenu'), select = document.querySelector('.admin-section-select');
    if (!host || !menu || !select || host.classList.contains('empty') || document.querySelector('[data-admin-section="marketing"]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.section = 'marketing'; button.textContent = 'Marketing'; menu.append(button);
    select.add(new Option('Marketing','marketing'));
    const section = document.createElement('section');
    section.className = 'admin-section'; section.dataset.adminSection = 'marketing'; section.setAttribute('aria-label','Marketing'); section.hidden = true;
    section.innerHTML = `<div class="panel admin-marketing">
      <div class="section-head"><div><h2>Marketing</h2><p class="muted">Review recorded listing activity and analytics coverage.</p></div></div>
      <div class="admin-marketing-filters" aria-label="Marketing report filters">
        <label>Period <select data-marketing-period><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom</option></select></label>
        <label data-custom-date hidden>From · UTC <input type="date" data-marketing-from></label>
        <label data-custom-date hidden>To · UTC <input type="date" data-marketing-to></label>
        <label>Source <select data-marketing-source><option value="">All</option></select></label>
        <label>Campaign <select data-marketing-campaign><option value="">All</option></select></label>
        <label>Device <select data-marketing-device><option value="">All</option></select></label>
      </div><p class="admin-marketing-time" data-marketing-time>Report not loaded. Times use UTC.</p>
      <div data-marketing-results aria-live="polite">Open Marketing to load results.</div>
    </div>`;
    host.append(section);
    if (remembered === 'marketing') button.click();

    const panel = section.querySelector('.admin-marketing'), results = panel.querySelector('[data-marketing-results]'), time = panel.querySelector('[data-marketing-time]');
    const period = panel.querySelector('[data-marketing-period]'), from = panel.querySelector('[data-marketing-from]'), to = panel.querySelector('[data-marketing-to]');
    const source = panel.querySelector('[data-marketing-source]'), campaign = panel.querySelector('[data-marketing-campaign]'), device = panel.querySelector('[data-marketing-device]');
    const filters = [source,campaign,device];
    let data = null, requestId = 0;
    const enableFilters = enabled => filters.forEach(filter => { filter.disabled = !enabled; });
    function setOptions(node, values) {
      const selected = node.value;
      node.replaceChildren(new Option('All',''),...[...new Set(values.filter(Boolean))].sort().map(value => new Option(value,value)));
      node.value = [...node.options].some(option => option.value === selected) ? selected : '';
    }
    function range() {
      const end = new Date();
      if (period.value !== 'custom') return [new Date(end.getTime()-Number(period.value)*86400000).toISOString(),end.toISOString()];
      if (!from.value || !to.value) return null;
      const start = new Date(`${from.value}T00:00:00.000Z`);
      const exclusiveEnd = new Date(new Date(`${to.value}T00:00:00.000Z`).getTime()+86400000);
      if (Number.isNaN(start.getTime()) || Number.isNaN(exclusiveEnd.getTime()) || exclusiveEnd<=start || exclusiveEnd-start>90*86400000) throw Error('Choose a UTC date range of up to 90 days.');
      return [start.toISOString(),exclusiveEnd.toISOString()];
    }
    const selectedEvents = () => data.events.filter(row => (!source.value || sourceOf(row)===source.value) && (!campaign.value || (row.campaign||'')===campaign.value) && (!device.value || (row.device_class||'')===device.value));

    function paint() {
      if (!data) return;
      const eventsValid = validEvents(data.events), publicationsValid = validPublications(data.publications);
      const eventsComplete = eventsValid && data.events.length<LIMIT_SENTINEL, publicationsComplete = publicationsValid && data.publications.length<LIMIT_SENTINEL;
      const events = eventsComplete ? selectedEvents() : [];
      const count = name => events.filter(row => row.event_name===name).length;
      const latest = events.reduce((max,row) => row.created_at && (!max || row.created_at>max) ? row.created_at : max,null);
      time.textContent = `Report generated ${data.generated_at ? utc(data.generated_at) : 'unavailable (reporting migration not applied)'}. Latest recorded event ${eventsComplete ? (latest ? utc(latest) : 'none for these filters') : 'unavailable while analytics is incomplete'}. Times use UTC; this report does not refresh automatically.`;
      let html = '<div class="admin-marketing-coverage" role="note"><h3>Analytics coverage</h3><p>Browser and session counts reflect recorded analytics activity, not verified people. First recorded publications are reported separately and are not linked to these sessions. Collection is best effort.</p></div>';
      if (!eventsComplete) {
        html += eventsValid ? '<p class="admin-marketing-warning" role="status">Analytics reached the report limit. Narrow the date range before using source, campaign, or device filters. Analytics counts, breakdowns, stages, and session details are unavailable.</p>' : '<p class="admin-marketing-warning" role="status">Analytics data could not be validated. Counts, filters, stages, and session details are unavailable. Refresh to try again.</p>';
      } else {
        if (!events.length) html += `<p class="muted">${data.events.length ? 'No analytics events match these filters.' : 'No recorded analytics activity in this period.'}</p>`;
        html += `<h3>Recorded activity</h3><p class="muted">Selected period and analytics filters.</p><div class="stat-grid admin-marketing-cards"><div class="stat"><strong>${events.length.toLocaleString()}</strong>Recorded events</div><div class="stat"><strong>${distinct(events,row=>row.visitor_id).toLocaleString()}</strong>Distinct browser IDs</div><div class="stat"><strong>${distinct(events,row=>row.session_id).toLocaleString()}</strong>Distinct sessions</div></div>`;
        const starts = events.filter(row=>row.event_name==='lister_session_started'), groups = new Map();
        for (const row of starts) { const key=JSON.stringify([sourceOf(row),mediumOf(row)]); if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(row); }
        const sourceRows = [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>{const [name,medium]=JSON.parse(key);return `<tr><td>${safe(name)}</td><td>${safe(medium)}</td><td>${distinct(rows,row=>row.session_id)}</td><td>${distinct(rows,row=>row.visitor_id)}</td></tr>`});
        html += `<h3>Acquisition sources</h3>${table('Recorded session-start sources',['Source','Medium','Recorded session starts','Distinct browser IDs'],sourceRows.length?sourceRows:['<tr><td colspan="4">No recorded session starts for these filters.</td></tr>'])}<p class="muted">Sources use recorded campaign parameters or referrer classification. Browser IDs may appear in more than one row; rows are not additive.</p>`;
        html += `<h3>Recorded stage activity</h3><p class="muted">Location → Listing details → Review are the public screens. Counts are recorded events, not people, exits, or a conversion funnel.</p>${table('Recorded listing events',['Recorded event','Count','Counting unit','What this records'],stages.map(([name,event,meaning])=>`<tr><th scope="row">${safe(name)}</th><td>${count(event)}</td><td>Event records</td><td>${safe(meaning)}</td></tr>`))}`;
        const ready=events.filter(row=>row.event_name==='step_ready'&&Number.isFinite(row.duration_ms));
        const uploads=events.filter(row=>row.event_name==='photo_upload'&&Number.isFinite(row.duration_ms));
        const active=events.filter(row=>['location_completed','listing_details_completed'].includes(row.event_name)&&Number.isFinite(row.active_ms));
        const errors=events.filter(row=>row.event_name==='journey_error'), errorGroups=new Map();
        for (const row of errors) { const key=JSON.stringify([row.error_code||'other',row.step||'Unknown',row.device_class||'Unknown']); if(!errorGroups.has(key))errorGroups.set(key,[]);errorGroups.get(key).push(row); }
        const timingRows=[['Step ready',ready,'duration_ms'],['Photo upload',uploads,'duration_ms'],['Active Location or Listing details',active,'active_ms']].map(([name,rows,field])=>`<tr><th scope="row">${safe(name)}</th><td>${seconds(median(rows.map(row=>row[field])))}</td><td>${rows.length}</td></tr>`);
        const errorRows=[...errorGroups].map(([key,rows])=>{const [code,step,kind]=JSON.parse(key),dates=rows.map(row=>row.created_at).filter(Boolean).sort();return `<tr><td>${safe(code)}</td><td>${safe(step)}</td><td>${safe(kind)}</td><td>${rows.length}</td><td>${dates.length?safe(utc(dates[0])):'—'}</td><td>${dates.length?safe(utc(dates.at(-1))):'—'}</td></tr>`});
        html += `<details class="admin-fold admin-marketing-diagnostics"><summary>Recorded timing and errors</summary><p class="muted">Browser timings are recorded samples, not a complete journey duration. A recorded error does not establish abandonment.</p>${table('Recorded timing samples',['Measurement','Median','Samples'],timingRows)}${table('Recorded error details',['Category','Step','Device','Occurrences','First · UTC','Last · UTC'],errorRows.length?errorRows:['<tr><td colspan="6">No recorded errors for these filters.</td></tr>'])}</details>`;
      }
      html += '<h3>Database-confirmed listing activity</h3><p class="muted">Filtered by date only. Publications are not linked to browser analytics. Available status history cannot prove first-ever publication if earlier history is missing.</p>';
      html += publicationsComplete ? `<div class="stat-grid admin-marketing-publications"><div class="stat"><strong>${distinct(data.publications,row=>row.vacancy_id).toLocaleString()}</strong>First recorded publications</div></div>` : publicationsValid ? '<p class="admin-marketing-warning" role="status">Publications reached their independent report limit. Their count is unavailable; narrow the date range.</p>' : '<p class="admin-marketing-warning" role="status">Publication data could not be validated. First recorded publications are unavailable. Refresh to try again.</p>';
      html += `<details class="admin-fold admin-marketing-definitions"><summary>How these numbers are counted</summary><p>Recorded events count stored event records. Distinct browser IDs are browser-stored identifiers, not verified people. Distinct sessions use recorded session IDs.</p><p>Ranges use UTC and include the start but exclude the end. Sources use recorded campaign parameters or referrer classification; missing attribution appears as Direct / Unknown. Collection is best effort.</p><p>Photos and Pricing completion events are emitted alongside Listing details completion, not on separate screens. Missing next events are not measured exits.</p><p>First recorded publications count distinct listings at their earliest qualifying transition to active in available status history, including transitions with an unknown previous status. Later reactivation does not count again. Only the date range applies; earlier history may be missing.</p></details>`;
      results.innerHTML=html;
      if (eventsComplete && events.length) {
        const sessionIds=[...new Set(events.map(row=>row.session_id).filter(Boolean))].slice(0,20);
        if (sessionIds.length) {
          const timeline=document.createElement('details');timeline.className='admin-fold admin-marketing-timeline';
          timeline.innerHTML='<summary>Inspect recorded session events</summary><label>Session <select data-journey-session></select></label><ol data-journey-timeline></ol>';
          const picker=timeline.querySelector('select');sessionIds.forEach((id,index)=>picker.add(new Option(`Session ${index+1}`,String(index))));
          const show=()=>{const list=timeline.querySelector('ol'),id=sessionIds[Number(picker.value)];list.replaceChildren();for(const row of events.filter(item=>item.session_id===id).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))){const item=document.createElement('li');item.textContent=`${utc(row.created_at)} · ${row.event_name||'Unknown event'}${row.step?` · ${row.step}`:''}${row.error_code?` · ${row.error_code}`:''}`;list.append(item)}};
          picker.onchange=show;show();results.querySelector('.admin-marketing-diagnostics')?.after(timeline);
        }
      }
    }

    async function load() {
      const id=++requestId;data=null;enableFilters(false);time.textContent='Report not loaded. Times use UTC.';
      let dates;
      try { dates=range(); } catch(error) { results.textContent=error.message; return; }
      if (!dates) { results.textContent='Choose From and To dates in UTC to load the report.'; return; }
      results.textContent='Loading recorded activity…';
      try {
        const response=await VACANCY_BACKEND.adminListerMarketing(...dates);
        if (id!==requestId) return;
        if (!response || typeof response !== 'object') throw Error('The report response is unavailable. Try refreshing.');
        data=response;
        const complete=validEvents(response.events)&&response.events.length<LIMIT_SENTINEL;
        if (complete) {setOptions(source,response.events.map(sourceOf));setOptions(campaign,response.events.map(row=>row.campaign));setOptions(device,response.events.map(row=>row.device_class));}
        else filters.forEach(filter=>filter.replaceChildren(new Option('All','')));
        enableFilters(complete);paint();
      } catch(error) {
        if (id!==requestId) return;
        data=null;enableFilters(false);results.innerHTML=`<p role="alert">Report unavailable: ${safe(error.message||'Could not load results.')}</p><button type="button" data-marketing-retry>Retry</button>`;
        results.querySelector('[data-marketing-retry]').onclick=load;
      }
    }
    period.onchange=()=>{panel.querySelectorAll('[data-custom-date]').forEach(item=>item.hidden=period.value!=='custom');void load()};
    from.onchange=to.onchange=()=>void load();
    filters.forEach(filter=>filter.onchange=paint);
    enableFilters(false);
    if(!window.VACANCY_ADMIN_CONSOLE) await import('./admin-console.js?v=20261006-orange');
    window.VACANCY_ADMIN_CONSOLE.mountShell(host,menu,select);
    const legacy=document.createElement('details');legacy.className='journey-details';
    const summary=document.createElement('summary');summary.textContent='Earlier activity, publication totals & session diagnostics';legacy.append(summary);
    section.append(legacy);legacy.append(panel);
    legacy.addEventListener('toggle',()=>{if(legacy.open&&!data)void load();});
    let connected=false;
    const showConnected=async()=>{if(connected)return;connected=true;try{if(!window.mountVacancyConnectedReport)await import('./admin-connected-report.js?v=20261006-orange');window.mountVacancyConnectedReport(section);}catch(error){connected=false;summary.textContent='Connected report unavailable; open recorded activity and diagnostics';}};
    button.addEventListener('click',()=>void showConnected());
    select.addEventListener('change',()=>{if(select.value==='marketing')void showConnected();});
    if(remembered==='marketing')void showConnected();
  };

  // Assemble all existing admin layers before presenting the final shell.
  let rendering=null;
  renderAdmin=function(...args){
    if(rendering)return rendering;
    const context=this;
    rendering=(async()=>{
      const loading=document.createElement('section');
      loading.className='loading-screen admin-render-loading';loading.setAttribute('role','status');loading.setAttribute('aria-label','Loading administration');
      loading.style.cssText='position:fixed;inset:0;z-index:1000;background:var(--paper)!important';
      loading.innerHTML='<span class="loading-logo-stack" role="img" aria-label="Vacancy"><img class="loading-logo" src="assets/vacancy-logo.png" alt=""></span><div class="loading-line"><i></i></div>';
      const leave=()=>{if(!location.hash.startsWith('#admin')){loading.remove();document.body.classList.remove('admin-render-pending');}};
      document.body.append(loading);addEventListener('hashchange',leave);
      try{
        let style=document.querySelector('[data-admin-console-style]');
        if(!style){
          style=document.createElement('link');style.rel='stylesheet';style.href='/admin-console.css?v=20261006-orange';style.dataset.adminConsoleStyle='true';
          const ready=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>{style.remove();reject(new Error('Could not load administration styles. Please retry.'));};});
          document.head.append(style);await ready;
        }
        document.body.classList.add('admin-render-pending');
        await buildAdmin.apply(context,args);
      }catch(error){
        if(location.hash.startsWith('#admin')){
          layout('<section class="panel"><h1>Administration unavailable</h1><p>'+safe(error.message)+'</p><button id="adminRetry" class="primary">Retry</button></section>');
          document.querySelector('#adminRetry').onclick=()=>renderAdmin();
        }
      }finally{loading.remove();document.body.classList.remove('admin-render-pending');removeEventListener('hashchange',leave);}
    })().finally(()=>{rendering=null;});
    return rendering;
  };
})();
