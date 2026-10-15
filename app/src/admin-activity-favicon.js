(() => {
 const safe=value=>escapeHtml(String(value??''));
 const time=value=>new Date(value).toLocaleString();
 const table=(heads,rows)=>'<div class="admin-metric-table" tabindex="0"><table><thead><tr>'+heads.map(x=>'<th scope="col">'+safe(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+safe(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 function activity(section){if(!section||section.querySelector('[data-recent-activity]'))return;
 const panel=document.createElement('div');panel.className='panel';panel.dataset.recentActivity='';panel.innerHTML='<div class="section-head"><h2>Recent activity</h2><button type="button" class="ghost">Refresh</button></div><p class="muted">Refreshes every 30 seconds while this section is visible. Recorded activity is not a count of people online. Sources describe referrals and campaigns, not visitors’ physical locations.</p><p role="status"></p><div data-activity-body></div>';section.prepend(panel);
 const status=panel.querySelector('[role=status]'),body=panel.querySelector('[data-activity-body]'),button=panel.querySelector('button');let busy=false;
 async function refresh(){if(busy||!panel.isConnected)return;busy=true;button.disabled=true;try{const data=await VACANCY_BACKEND.recentActivity();if(!Array.isArray(data.sources)||!Array.isArray(data.actions)||!Array.isArray(data.recent)||!Number.isFinite(Date.parse(data.generated_at)))throw Error('Invalid activity response');if(!panel.isConnected)return;
 status.textContent='Report generated '+time(data.generated_at)+' · preceding 24 hours';body.innerHTML='<div class="stat-grid"><div class="stat"><strong>'+safe(data.browsers_recent)+'</strong>Browser IDs seen in the last 5 minutes</div><div class="stat"><strong>'+safe(data.accounts_created)+'</strong>Non-guest accounts created · 24h</div></div><h3>Arrival sources</h3>'+table(['Source','Recorded sessions'],data.sources.map(r=>[r.source,r.sessions]))+'<h3>Actions · 24h</h3>'+table(['Recorded action','Events'],data.actions.map(r=>[r.event_name.replaceAll('_',' '),r.events]))+'<h3>Latest recorded actions</h3>'+table(['Action','Area','Time'],data.recent.map(r=>[r.event_name.replaceAll('_',' '),r.route,time(r.created_at)]));
 }catch(error){status.textContent=(body.textContent?'Previous results are stale. ':'Activity unavailable. ')+error.message;}finally{busy=false;button.disabled=false;}}
 button.onclick=refresh;
 function tick(){if(!panel.isConnected)return;if(!document.hidden&&!section.hidden)refresh();setTimeout(tick,30000)}
 new MutationObserver(()=>{if(!section.hidden&&!document.hidden)refresh()}).observe(section,{attributes:true,attributeFilter:['hidden']});tick();
 }
 async function favicon(section){
  if(!section||section.querySelector('[data-favicon-editor]'))return;
  const panel=document.createElement('div');panel.className='panel';panel.dataset.faviconEditor='';panel.textContent='Loading favicon editor.';section.prepend(panel);
  try{if(!window.mountVacancyReviewedFavicon)await import('./admin-favicon-editor.js?v=20261016');if(panel.isConnected)await window.mountVacancyReviewedFavicon(panel);}
  catch(error){if(panel.isConnected)panel.textContent='Favicon editor unavailable: '+(error.message||'Reload to retry');}
 }

 window.mountVacancyAdminTools=host=>{activity(host.querySelector('[data-admin-section="activity"]'));favicon(host.querySelector('[data-admin-section="icons"]'));};
})();
