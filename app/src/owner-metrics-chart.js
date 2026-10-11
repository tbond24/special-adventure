/* Owner activity only. One aggregate request; no raw events or new trackers. */
(function(root) {
  'use strict';
  const HOUR = 3600000, DAY = 24 * HOUR;
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const localDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const count = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
  function rangeFor(period, from, to, now = new Date()) {
    const end = period === 'custom' ? new Date(`${to}T00:00:00`) : new Date(now);
    end.setDate(end.getDate()+1); end.setHours(0,0,0,0);
    const start = period === 'custom' ? new Date(`${from}T00:00:00`) : new Date(end);
    if (period !== 'custom') {start.setDate(start.getDate() - (period === 'today' ? 1 : Number(period)));start.setHours(0,0,0,0);}
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || +start >= +end) throw new Error('Choose a valid date range.');
    if (+end - +start > 366 * DAY) throw new Error('Choose a date range of no more than 366 days.');
    if (+start > +now) throw new Error('Choose a start date that is today or earlier.');
    const next = new Date(start); next.setDate(next.getDate()+1); next.setHours(0,0,0,0);
    return {from:start.toISOString(),to:end.toISOString(),granularity:+next===+end?'hour':'day',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'};
  }
  function readSeries(data, range) {
    if (!data || data.error || Date.parse(data.from) !== Date.parse(range.from) || Date.parse(data.to) !== Date.parse(range.to) || data.timezone !== range.timezone || data.granularity !== range.granularity || data.clicks_are_unique !== true || !Array.isArray(data.buckets)) throw new Error('Activity graph is temporarily unavailable.');
    const until = Math.min(Date.parse(range.to), Date.parse(data.observed_until));
    if (!Number.isFinite(until) || until < Date.parse(range.from) || data.buckets.length > 366) throw new Error('Activity graph is temporarily unavailable.');
    let cursor = Date.parse(range.from);
    const buckets = data.buckets.map((row,index) => {
      const start = Date.parse(row.from), end = Date.parse(row.to);
      const expected = new Date(cursor);
      if (range.granularity === 'hour') expected.setTime(cursor + HOUR); else {expected.setTime(Date.parse(range.from));expected.setDate(expected.getDate()+index+1);}
      if (start !== cursor || end !== Math.min(+expected,until) || end <= start || count(row.impressions) === null || count(row.clicks) === null || count(row.message_arrivals) === null) throw new Error('Activity graph is temporarily unavailable.');
      cursor = end;
      return {from:row.from,to:row.to,impressions:row.impressions,clicks:row.clicks,message_arrivals:row.message_arrivals};
    });
    if (cursor !== until) throw new Error('Activity graph is temporarily unavailable.');
    return {buckets,until,unidentified:count(data.unidentified_click_events)};
  }
  let chartId = 0;
  function mount(heading) {
    const messageDescription = 'owner-message-description-' + (++chartId);
    const card = document.createElement('section');
    card.className = 'owner-activity-card'; card.setAttribute('aria-label','Listing activity');
    card.innerHTML = `<div class="owner-activity-head"><div class="owner-metric-range"><label><span class="owner-period-label">Period</span><select aria-label="Metrics period"><option value="today">Today</option><option value="7">7 days</option><option value="30">30 days</option><option value="custom">Custom</option></select></label></div></div>
      <div class="owner-custom-range" hidden><label>From <input type="date" aria-label="Metrics from"></label><label>To <input type="date" aria-label="Metrics to"></label></div>
      <div class="owner-chart-host" aria-busy="true"><p class="owner-chart-status" role="status">Loading activity…</p></div>
      <div class="stat-grid owner-list-metrics"><button type="button" class="stat owner-metric-impressions" data-series="impressions" aria-pressed="true" title="Hide or show impressions"><span class="owner-metric-label"><i aria-hidden="true"></i>Impressions</span><strong>—</strong><small class="owner-period-caption">Selected period</small></button><button type="button" class="stat owner-metric-clicks" data-series="clicks" aria-pressed="true" title="Hide or show unique clicks"><span class="owner-metric-label"><i aria-hidden="true"></i><span class="owner-click-label">Unique clicks</span></span><strong>—</strong><small class="owner-period-caption">Selected period</small></button><button type="button" class="stat owner-metric-messages" data-series="message_arrivals" aria-pressed="true" aria-describedby="${messageDescription}" title="Hide or show incoming message arrivals in the selected period"><span class="owner-metric-label"><i aria-hidden="true"></i>Unread messages</span><strong>—</strong><small>Now<span class="owner-arrival-hint">Graph: arrivals</span></small></button></div>
      <p class="owner-metrics-status muted" role="status"></p><p class="owner-click-coverage muted" hidden></p>
      <p id="${messageDescription}" class="sr-only">Unread messages is the current unread count, regardless of the selected period. The purple graph shows incoming message arrivals in the selected period, including messages you have since read.</p>`;
    heading.after(card);
    const select = card.querySelector('select'), dates = card.querySelectorAll('input[type="date"]'), host = card.querySelector('.owner-chart-host'), metrics = card.querySelector('.owner-list-metrics'), status = card.querySelector('.owner-metrics-status'), coverage = card.querySelector('.owner-click-coverage');
    const today = new Date(); dates[0].value = localDate(new Date(today.getFullYear(),today.getMonth(),1)); dates[1].value = localDate(today);
    let generation = 0, latest = null, selection = 0, observer, lastWidth = 0;
    const visible=new Set(['impressions','clicks','message_arrivals']);
    metrics.querySelectorAll('button[data-series]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.series;if(visible.has(key))visible.delete(key);else visible.add(key);button.setAttribute('aria-pressed',String(visible.has(key)));if(latest)renderChart();}));
    const owner = typeof currentUser !== 'undefined' ? currentUser?.id : null;
    function showStatus(message, retry = false) {
      latest = null; host.setAttribute('aria-busy','false');
      host.innerHTML = `<p class="owner-chart-status" role="status">${safe(message)}${retry?'<button type="button" class="owner-chart-retry">Try again</button>':''}</p>`;
      host.querySelector('button')?.addEventListener('click',load);
    }
    function renderChart() {
      if (!latest || !card.isConnected) return;
      const {range,buckets,until} = latest;
      if(!visible.size){host.innerHTML='<p class="owner-chart-status" role="status">Choose a metric below to show its activity line.</p>';return;}
      if (!buckets.length) {showStatus('No recorded activity yet in this period.');return;}
      const w = Math.max(270,Math.round(host.clientWidth)), h=224, left=36, right=14, top=22, bottom=36, pw=w-left-right, ph=h-top-bottom;
      const maximum = Math.max(1,...buckets.flatMap(b=>[...visible].map(key=>b[key])));
      const power = 10 ** Math.floor(Math.log10(maximum));
      const step = Math.max(1,Math.ceil(maximum / power / 4) * power), ceiling = Math.max(step,Math.ceil(maximum/step)*step);
      const start = Date.parse(range.from), span = Math.max(1,until-start);
      const x = value => left+(value-start)/span*pw, y = value => top+ph-value/ceiling*ph;
      const tickFormat = new Intl.DateTimeFormat(undefined,range.granularity==='hour'?{timeZone:range.timezone,hour:'numeric',hour12:true}:{timeZone:range.timezone,month:'short',day:'numeric'});
      const detailFormat = new Intl.DateTimeFormat(undefined,{timeZone:range.timezone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'shortOffset'});
      const times=buckets.map(b=>Date.parse(b.from));
      let grid='';for(let value=0;value<=ceiling;value+=step)grid+=`<line x1="${left}" y1="${y(value)}" x2="${w-right}" y2="${y(value)}" class="owner-chart-grid"/><text x="${left-8}" y="${y(value)+4}" text-anchor="end">${safe(value.toLocaleString())}</text>`;
      const tickCount=w<440?3:5,indices=[...new Set(Array.from({length:Math.min(tickCount,buckets.length)},(_,i)=>Math.round(i*(buckets.length-1)/Math.max(1,Math.min(tickCount,buckets.length)-1))))];
      const minorTicks=times.map(time=>`<line x1="${x(time)}" x2="${x(time)}" y1="${h-bottom}" y2="${h-bottom+4}" class="owner-chart-grid"/>`).join('');
      const ticks=indices.map(i=>`<text x="${x(times[i])}" y="${h-12}" text-anchor="${i===0?'start':i===buckets.length-1?'end':'middle'}">${safe(tickFormat.format(times[i]))}</text>`).join('');
      const points=key=>buckets.map((b,i)=>`${x(times[i])},${y(b[key])}`).join(' ');
      const allZero=buckets.every(b=>[...visible].every(key=>b[key]===0));
      const lineClasses={impressions:'impressions',clicks:'clicks',message_arrivals:'messages'};
      const lines=[...visible].map(key=>`<polyline points="${points(key)}" class="owner-series-${lineClasses[key]}"/>${buckets.length===1?`<circle cx="${x(times[0])}" cy="${y(buckets[0][key])}" r="3" class="owner-point-${lineClasses[key]}"/>`:''}`).join('');
      host.setAttribute('aria-busy','false');
      host.innerHTML=`<svg class="owner-activity-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${safe((range.granularity==='hour'?'Hourly':'Daily')+' impressions, unique clicks, and message arrivals. Time on the horizontal axis; count on the vertical axis. '+(allZero?'No recorded activity in this period.':'Use the arrow keys or tap the graph for exact values. The data table follows the graph.'))}">${grid}${minorTicks}${ticks}${lines}<line class="owner-chart-cursor" x1="0" x2="0" y1="${top}" y2="${h-bottom}" hidden/></svg><div class="owner-chart-readout" aria-live="polite">${allZero?'No recorded activity in this period.':''}</div><div class="owner-chart-data sr-only"><table><caption>${safe(range.timezone)} · ${range.granularity==='hour'?'Hourly':'Daily'} counts</caption><thead><tr><th scope="col">Time</th><th scope="col">Impressions</th><th scope="col">Unique clicks</th><th scope="col">Message arrivals</th></tr></thead><tbody>${buckets.map(b=>`<tr><th scope="row">${safe(detailFormat.format(Date.parse(b.from)))}</th><td>${b.impressions.toLocaleString()}</td><td>${b.clicks.toLocaleString()}</td><td>${b.message_arrivals.toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`;
      const svg=host.querySelector('svg'),readout=host.querySelector('.owner-chart-readout'),cursor=host.querySelector('.owner-chart-cursor');
      function inspect(index) {selection=Math.max(0,Math.min(buckets.length-1,index));const b=buckets[selection];cursor.removeAttribute('hidden');cursor.setAttribute('x1',x(times[selection]));cursor.setAttribute('x2',x(times[selection]));readout.textContent=`${detailFormat.format(times[selection])}: ${[...visible].map(key=>b[key].toLocaleString()+' '+({impressions:'impressions',clicks:'unique clicks',message_arrivals:'message arrivals'}[key])).join(' · ')}${Date.parse(b.to)===until&&until<Date.parse(range.to)?' · Latest interval may be incomplete':''}`;}
      svg.setAttribute('tabindex','0');svg.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home End');
      svg.addEventListener('pointermove',event=>{const rect=svg.getBoundingClientRect(),target=start+((event.clientX-rect.left)/rect.width*w-left)/pw*span;inspect(times.reduce((best,time,i)=>Math.abs(time-target)<Math.abs(times[best]-target)?i:best,0));});
      svg.addEventListener('click',event=>{const rect=svg.getBoundingClientRect(),target=start+((event.clientX-rect.left)/rect.width*w-left)/pw*span;inspect(times.reduce((best,time,i)=>Math.abs(time-target)<Math.abs(times[best]-target)?i:best,0));});
      svg.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();inspect(event.key==='Home'?0:event.key==='End'?buckets.length-1:selection+(event.key==='ArrowRight'?1:-1));});
    }
    async function load() {
      const token=++generation;latest=null;selection=0;
      card.querySelector('.owner-custom-range').hidden=select.value!=='custom';
      metrics.querySelectorAll('strong').forEach(node=>node.textContent='—'); status.textContent='';coverage.hidden=true;
      let range;try{range=rangeFor(select.value,dates[0].value,dates[1].value);}catch(error){showStatus(error.message);status.textContent='Metrics have not been loaded for this range.';return;}
      card.querySelectorAll('.owner-period-caption').forEach(node=>node.textContent=select.value==='today'?'Today':select.value==='custom'?'Selected dates':`Last ${select.value} days`);
      host.innerHTML='<p class="owner-chart-status" role="status">Loading activity…</p>';host.setAttribute('aria-busy','true');
      const alive=()=>token===generation&&card.isConnected&&(typeof currentUser==='undefined'||currentUser?.id===owner);
      // One existing endpoint returns both totals and bounded time/count points.
      const response=Promise.resolve().then(()=>root.VACANCY_BACKEND.ownerDashboardMetrics(range.from,range.to,range));
      const totals=response.then(data=>{
        if(!alive())return;if(!data||data.error)throw new Error('Totals unavailable');
        card.querySelector('.owner-click-label').textContent=data.clicks_are_unique?'Unique clicks':'Clicks';
        let missing=false;['impressions','clicks','messages'].forEach((key,index)=>{const n=count(data[key]);metrics.children[index].querySelector('strong').textContent=n===null?'—':n.toLocaleString();missing=missing||n===null;});
        status.textContent=missing?'Some metric totals are unavailable.':'';
        coverage.textContent=!data.clicks_are_unique?'Unique-click reporting is unavailable. The click total shows recorded opens.':count(data.unidentified_click_events)>0?`${data.unidentified_click_events.toLocaleString()} older anonymous click events cannot be deduplicated and are excluded.`:'';coverage.hidden=!coverage.textContent;
      }).catch(()=>{if(alive())status.textContent='Metric totals are temporarily unavailable. Try again.';});
      response.then(data=>{if(!alive())return;if(!data?.series){showStatus('Activity history is not available yet. Your totals are shown below.');return;}const parsed=readSeries(data.series,range);latest={range,...parsed};renderChart();}).catch(()=>{if(alive())showStatus('Activity graph is temporarily unavailable. Your totals may still be available below.',true);});
      await totals;
    }
    select.addEventListener('change',load); dates.forEach(input=>input.addEventListener('change',load));
    if(root.ResizeObserver){observer=new ResizeObserver(()=>{if(!card.isConnected){observer.disconnect();return;}const width=Math.round(host.clientWidth);if(width!==lastWidth){lastWidth=width;if(latest)renderChart();}});observer.observe(host);}
    load();return {reload:load,destroy:()=>{generation++;observer?.disconnect();card.remove();}};
  }
  const api={mount,rangeFor,readSeries,count};root.VACANCY_OWNER_METRICS=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
