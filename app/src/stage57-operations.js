(() => {
  const baseAdmin=renderAdmin;
  renderAdmin=async function(){
    await baseAdmin();
    const host=document.querySelector('#adminHost');
    if(!host||host.classList.contains('empty'))return;
    const panel=document.createElement('section');
    panel.className='panel admin-metrics-panel';
    panel.innerHTML=`<div class="admin-metrics-head"><div><h2>Activity</h2><p class="muted">Daily marketplace activity from the live database.</p></div><div class="admin-metric-controls"><select id="adminMetric" aria-label="Activity metric"><option value="accounts">Accounts created</option><option value="listings">Listings added</option><option value="images">Images uploaded</option><option value="enquiries">Enquiries started</option><option value="messages">Messages sent</option></select><select id="adminMetricDays" aria-label="Activity period"><option value="7">7 days</option><option value="30">30 days</option></select></div></div><div id="adminMetricChart" class="admin-metric-chart" aria-live="polite">Loading activity…</div>`;
    host.insertBefore(panel,host.children[2]||null);
    const metric=panel.querySelector('#adminMetric'),days=panel.querySelector('#adminMetricDays'),chart=panel.querySelector('#adminMetricChart');
    const draw=async()=>{chart.textContent='Loading activity…';try{const data=await VACANCY_BACKEND.adminDailyMetrics(metric.value,days.value);if(data?.error)throw new Error(data.error);const series=data.series||[],max=Math.max(1,...series.map(point=>Number(point.value)||0)),label=metric.options[metric.selectedIndex].text;chart.innerHTML=`<div class="metric-total"><strong>${Number(data.total||0).toLocaleString()}</strong><span>${escapeHtml(label.toLowerCase())} · ${data.days} days</span></div><div class="metric-bars" role="img" aria-label="${escapeHtml(label)} over ${data.days} days">${series.map(point=>`<div class="metric-column" title="${escapeHtml(point.date)}: ${Number(point.value||0)}"><span class="metric-value">${Number(point.value||0)}</span><i style="height:${Math.max(3,Math.round((Number(point.value||0)/max)*100))}%"></i><small>${new Date(point.date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></div>`).join('')}</div>`}catch(error){chart.textContent=error.message}};
    metric.onchange=draw;days.onchange=draw;draw();
  };
})();
