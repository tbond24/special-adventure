// Reusable, bounded aggregate map. No animation loop, presence polling or graph library.
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
  host.innerHTML='<div class="journey-map-heading"><h3>Visitor journey map</h3><div class="journey-map-controls"><label>Period<select data-map-period><option value="today">Today</option><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label><label>Device<select data-map-device><option value="">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option></select></label><button type="button" data-map-refresh>Refresh map</button></div></div><div class="journey-map-toolbar"><button type="button" data-map-reset disabled>All pages</button><span data-map-focus>Unique browsers · recorded paths</span><label class="journey-map-switch"><input type="checkbox" role="switch" data-analytics-enabled>Analytics in this browser</label></div><p data-map-status role="status">Loading recorded journeys…</p><div data-map-canvas></div><small>Recorded transitions, not live presence. Browsers can appear on several paths. No next recorded step does not prove abandonment.</small>';
  const canvas=host.querySelector('[data-map-canvas]'),status=host.querySelector('[data-map-status]'),period=host.querySelector('[data-map-period]'),device=host.querySelector('[data-map-device]'),toggle=host.querySelector('[data-analytics-enabled]'),reset=host.querySelector('[data-map-reset]');
  toggle.checked=!window.VACANCY_ANALYTICS_PREFERENCES?.disabled;toggle.onchange=()=>{try{VACANCY_ANALYTICS_PREFERENCES.setDisabled(!toggle.checked)}catch{toggle.checked=!toggle.checked;status.textContent='Browser storage unavailable. Analytics setting was not changed.'}};
  toggle.title='Reloads this browser with analytics enabled or disabled. Other visitors are unaffected.';
  let data=null,focus=null,controller=null,cycle=0,stopped=false;
  const valid=()=>!stopped&&host.isConnected&&location.hash==='#admin'&&actor&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
  function clear(){++cycle;controller?.abort();data=null;canvas.replaceChildren();status.textContent='Journey map unavailable.'}
  function paint(){
   reset.disabled=!focus;host.querySelector('[data-map-focus]').textContent=focus?labels[focus]+' · next recorded steps':'Unique browsers · recorded paths';
   const all=data.nodes,branches=focus?data.edges.filter(e=>e.from===focus).map(e=>({...all.find(n=>n.id===e.to),count:e.count})):all;
   canvas.innerHTML='';if(!data.total){canvas.textContent='No recorded journeys in this period.';return}
   const graph=document.createElement('div');graph.className='journey-map-graph';
   const centre=document.createElement('div');centre.className='journey-map-centre';centre.innerHTML='<strong>'+Number(focus?all.find(n=>n.id===focus).count:data.total).toLocaleString()+'</strong><span>'+safe(focus?labels[focus]:'Visitors')+'</span>';graph.append(centre);
   const positions=branches.map((n,i)=>{const angle=-Math.PI/2+i*2*Math.PI/branches.length;return {n,x:50+38*Math.cos(angle),y:50+36*Math.sin(angle)}});
   const max=Math.max(...branches.map(n=>n.count),1);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
   svg.innerHTML=positions.map(({n,x,y})=>'<path d="M50 50 Q50 '+y+' '+x+' '+y+'" fill="none" stroke="#ccd5df" stroke-width="'+(.2+1.1*n.count/max)+'"/>').join('');graph.prepend(svg);
   for(const {n,x,y} of positions){const button=document.createElement('button');button.type='button';button.className='journey-map-node';button.style.left=x+'%';button.style.top=y+'%';button.innerHTML='<strong>'+n.count.toLocaleString()+'</strong><span>'+safe(labels[n.id])+'</span>';button.setAttribute('aria-label',labels[n.id]+': '+n.count+' browsers. Explore next steps');button.onclick=()=>{focus=n.id;paint();reset.focus()};graph.append(button)}
   canvas.append(graph);if(!branches.length){const note=document.createElement('p');note.textContent='No next transition recorded for this page.';canvas.append(note)}
   const details=document.createElement('details');details.innerHTML='<summary>View transition counts</summary><div class="journey-map-table"><table><thead><tr><th>From</th><th>To</th><th>Browsers</th></tr></thead><tbody>'+data.edges.filter(e=>!focus||e.from===focus).map(e=>'<tr><td>'+safe(labels[e.from])+'</td><td>'+safe(labels[e.to])+'</td><td>'+e.count+'</td></tr>').join('')+'</tbody></table></div>';canvas.append(details);
  }
  async function refresh(){
   if(!valid()||document.hidden||section?.hidden)return;controller?.abort();controller=new AbortController();const signal=controller.signal,id=++cycle;data=null;canvas.replaceChildren();status.textContent='Loading recorded journeys…';focus=null;reset.disabled=true;
   const end=new Date(),start=new Date(end);start.setHours(0,0,0,0);if(period.value!=='today')start.setDate(start.getDate()-Number(period.value)+1);
   const deadline=setTimeout(()=>controller?.signal===signal&&controller.abort(),15000);
   try{const report=await VACANCY_BACKEND.adminJourneyMap({p_from:start.toISOString(),p_to:end.toISOString(),p_device:device.value||null},{signal});if(id!==cycle||!valid()||signal.aborted)return;
    data=validate(report);if(Date.parse(data.from)!==+start||Date.parse(data.to)!==+end||data.device!==(device.value||null))throw Error('Wrong map period');paint();status.textContent='Recorded through '+end.toLocaleString();
   }catch{if(id===cycle&&valid()){canvas.replaceChildren();status.textContent='Journey map unavailable. Refresh to retry.'}}finally{clearTimeout(deadline)}
  }
  reset.onclick=()=>{focus=null;paint()};period.onchange=device.onchange=refresh;host.querySelector('[data-map-refresh]').onclick=refresh;
  function sync(){if(!valid()){clear();stopped=true;observer.disconnect();intersection?.disconnect();window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync)}}
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
  let intersection=null;if('IntersectionObserver'in window){intersection=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){intersection.disconnect();void refresh()}});intersection.observe(host)}else void refresh();
  return {refresh,destroy(){clear();stopped=true;observer.disconnect();intersection?.disconnect();window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);host.remove()}};
 }
 window.VACANCY_JOURNEY_MAP=Object.freeze({mount,validate});
})();
