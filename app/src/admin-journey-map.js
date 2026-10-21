// Historical journeys and separately expiring active-page presence.
(() => {
 const labels={find:'Find',listing:'Listing',list:'Your listings',create:'Create listing',auth:'Account',other:'Other pages','step:0':'Location','step:1':'Details','step:2':'Review','step:3':'Publish attempt'};
 const safe=s=>escapeHtml(String(s)),count=n=>Number.isSafeInteger(n)&&n>=0;
 function validate(data){
  if(data?.schemaVersion!==1||!count(data.total)||!Number.isFinite(Date.parse(data.generatedAt))||!Array.isArray(data.nodes)||data.nodes.length>10||!Array.isArray(data.edges)||data.edges.length>100)throw Error('Invalid map');
  const nodes=new Map();for(const n of data.nodes){if(!Object.hasOwn(labels,n.id)||nodes.has(n.id)||!count(n.count)||n.count>data.total)throw Error('Invalid node');nodes.set(n.id,n)}
  const edges=new Set();for(const e of data.edges){const key=e.from+'>'+e.to;if(!nodes.has(e.from)||!nodes.has(e.to)||e.from===e.to||!count(e.count)||e.count>Math.min(nodes.get(e.from).count,nodes.get(e.to).count)||edges.has(key))throw Error('Invalid transition');edges.add(key)}
  if((data.total===0&&nodes.size)||[...nodes.values()].reduce((sum,n)=>sum+n.count,0)<data.total)throw Error('Missing nodes');return data;
 }
 function mount(after){
  const actor=currentUser?.id,section=after.closest('[data-admin-section]'),host=document.createElement('section');host.className='overview-journey-map';host.setAttribute('aria-label','Visitor journey map');after.after(host);
  host.innerHTML='<div class="journey-map-heading"><h3>Visitor journey map</h3><div class="journey-map-controls"><label>Period<select data-map-period><option value="today">Today</option><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label><label>Device<select data-map-device><option value="">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select></label><button type="button" data-map-refresh>Refresh map</button></div></div><div class="journey-map-toolbar"><button type="button" data-map-reset disabled>All pages</button><span data-map-focus>Visitors</span><label class="journey-map-switch"><input type="checkbox" role="switch" data-analytics-enabled>Exclude this browser</label></div><p data-map-status role="status">Loading recorded journeys…</p><div data-map-canvas></div>';
  const canvas=host.querySelector('[data-map-canvas]'),status=host.querySelector('[data-map-status]'),period=host.querySelector('[data-map-period]'),device=host.querySelector('[data-map-device]'),toggle=host.querySelector('[data-analytics-enabled]'),reset=host.querySelector('[data-map-reset]');
  toggle.checked=!!window.VACANCY_ANALYTICS_PREFERENCES?.disabled;toggle.onchange=()=>{try{VACANCY_ANALYTICS_PREFERENCES.setDisabled(toggle.checked)}catch{toggle.checked=!toggle.checked;status.textContent='Browser storage unavailable. Analytics setting was not changed.'}};
  toggle.checked=true;toggle.disabled=true;toggle.title='Admin browsers are always excluded, including after sign-out.';
  let data=null,focus=null,controller=null,cycle=0,stopped=false,presence=null,presenceTimer=null,expiryTimer=null,presenceCycle=0;
  const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&actor&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
  function clear(){++presenceCycle;clearTimeout(presenceTimer);clearTimeout(expiryTimer);presence=null;++cycle;controller?.abort();data=null;canvas.replaceChildren();status.textContent='Journey map unavailable.'}
  function paint(){
   reset.disabled=!focus;host.querySelector('[data-map-focus]').textContent=focus?labels[focus]:'Visitors';
   const live=presence&&Date.parse(presence.expiresAt)>Date.now()?presence:{total:0,nodes:[]};
   const all=data.nodes.map(n=>({...n}));for(const n of live.nodes)if(!all.some(p=>p.id===n.id))all.push({id:n.id,count:0});
   const branches=focus?data.edges.filter(e=>e.from===focus).map(e=>({...all.find(n=>n.id===e.to),count:e.count})):all;
   canvas.innerHTML='';if(!data.total&&!live.total){canvas.textContent='No recorded journeys in this period.';return}
   const graph=document.createElement('div');graph.className='journey-map-graph';
   const centre=document.createElement('div');centre.className='journey-map-centre';const centreActive=focus?(live.nodes.find(n=>n.id===focus)?.count||0):live.total;centre.classList.toggle('is-active',centreActive>0);centre.title=centreActive+' active now';centre.innerHTML='<strong>'+Number(focus?all.find(n=>n.id===focus).count:data.total).toLocaleString()+'</strong><span>'+safe(focus?labels[focus]:'Visitors')+'</span>';graph.append(centre);
   const positions=branches.map((n,i)=>{const angle=-Math.PI/2+i*2*Math.PI/branches.length;return {n,x:50+38*Math.cos(angle),y:50+36*Math.sin(angle)}});
   const max=Math.max(...branches.map(n=>n.count),1);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
   svg.innerHTML=positions.map(({n,x,y})=>'<path d="M50 50 Q50 '+y+' '+x+' '+y+'" fill="none" stroke="#ccd5df" stroke-width="'+(.2+1.1*n.count/max)+'"/>').join('');graph.prepend(svg);
   for(const {n,x,y} of positions){const button=document.createElement('button');button.type='button';button.className='journey-map-node';const active=live.nodes.find(p=>p.id===n.id)?.count||0;button.classList.toggle('is-active',active>0);button.title=active?active+' active now':'';button.style.left=x+'%';button.style.top=y+'%';button.innerHTML='<strong>'+n.count.toLocaleString()+'</strong><span>'+safe(labels[n.id])+'</span>';button.setAttribute('aria-label',labels[n.id]+': '+n.count+' browsers. Explore next steps');button.onclick=()=>{focus=n.id;paint();reset.focus()};graph.append(button)}
   canvas.append(graph);if(!branches.length){const note=document.createElement('p');note.textContent='No next transition recorded for this page.';canvas.append(note)}
   const details=document.createElement('details');details.innerHTML='<summary>View transition counts</summary><div class="journey-map-table"><table><thead><tr><th>From</th><th>To</th><th>Browsers</th></tr></thead><tbody>'+data.edges.filter(e=>!focus||e.from===focus).map(e=>'<tr><td>'+safe(labels[e.from])+'</td><td>'+safe(labels[e.to])+'</td><td>'+e.count+'</td></tr>').join('')+'</tbody></table></div>';canvas.append(details);
  }
  async function refresh(){
   if(!valid()||document.hidden||section?.hidden)return;controller?.abort();controller=new AbortController();const signal=controller.signal,id=++cycle;data=null;canvas.replaceChildren();status.textContent='Loading recorded journeys…';focus=null;reset.disabled=true;
   ++presenceCycle;clearTimeout(presenceTimer);clearTimeout(expiryTimer);presence=null;const end=new Date(),start=new Date(end);start.setHours(0,0,0,0);if(period.value!=='today')start.setDate(start.getDate()-Number(period.value)+1);
   const deadline=setTimeout(()=>controller?.signal===signal&&controller.abort(),15000);
   try{const report=await VACANCY_BACKEND.adminJourneyMap({p_from:start.toISOString(),p_to:end.toISOString(),p_device:device.value||null},{signal});if(id!==cycle||!valid()||signal.aborted)return;
    data=validate(report);if(Date.parse(data.from)!==+start||Date.parse(data.to)!==+end||data.device!==(device.value||null))throw Error('Wrong map period');paint();status.textContent='';void refreshPresence();
   }catch{if(id===cycle&&valid()){canvas.replaceChildren();status.textContent='Journey map unavailable. Refresh to retry.'}}finally{clearTimeout(deadline)}
  }
  async function refreshPresence(){
   clearTimeout(presenceTimer);clearTimeout(expiryTimer);const request=++presenceCycle;
   presence=null;if(data)paint();if(!valid()||document.hidden||section?.hidden)return;
   try{const report=await Promise.race([VACANCY_BACKEND.adminVisitorPresence(device.value||null),new Promise((_,reject)=>setTimeout(()=>reject(Error('Presence timeout')),5000))]);if(request!==presenceCycle||!valid()||document.hidden)return;
    if(!count(report?.total)||!Array.isArray(report.nodes)||report.nodes.length>10||report.nodes.some(n=>!Object.hasOwn(labels,n.id)||!count(n.count)||n.count>report.total)||!Number.isFinite(Date.parse(report.expiresAt)))throw Error('Invalid presence');
    const lifetime=Math.min(10000,Date.parse(report.expiresAt)-Date.now());if(lifetime>0){presence=report;if(data)paint();expiryTimer=setTimeout(()=>{presence=null;if(data&&valid())paint()},lifetime)}
   }catch{if(request!==presenceCycle)return;presence=null;if(data&&valid())paint()}
   if(valid()&&!document.hidden&&!section?.hidden)presenceTimer=setTimeout(refreshPresence,10000);
  }
  function visibility(){if(document.hidden||section?.hidden){++presenceCycle;clearTimeout(presenceTimer);clearTimeout(expiryTimer);presence=null;if(data&&valid())paint()}else void refreshPresence()}
  const sharedRefresh=()=>void refresh();window.addEventListener('vacancy:refresh-data',sharedRefresh);document.addEventListener('visibilitychange',visibility);
  reset.onclick=()=>{focus=null;paint()};period.onchange=device.onchange=refresh;host.querySelector('[data-map-refresh]').onclick=refresh;
  function sync(){if(!valid()){clear();stopped=true;observer.disconnect();intersection?.disconnect();window.removeEventListener('vacancy:refresh-data',sharedRefresh);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync)}}
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
  let intersection=null;if('IntersectionObserver'in window){intersection=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){intersection.disconnect();void refresh()}});intersection.observe(host)}else void refresh();
  return {refresh,destroy(){clear();stopped=true;observer.disconnect();intersection?.disconnect();window.removeEventListener('vacancy:refresh-data',sharedRefresh);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.remove()}};
 }
 window.VACANCY_JOURNEY_MAP=Object.freeze({mount,validate});
})();
