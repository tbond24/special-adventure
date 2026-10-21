// Read-only event exploration; collection policy and instrumentation are unchanged.
(() => {
 const targets=[
  ['location_started','Location page'],['listing_details_started','Listing details page'],['listing_previewed','Review page'],
  ['list_property_clicked','Create listing button'],['publish_clicked','Publish button'],
  ['contact_button_pressed','Contact button'],['text_button_pressed','Text button']
 ];
 const modes=[['events','Total events'],['browsers','Distinct browsers'],['sessions','Distinct sessions'],['journeys','Distinct listing journeys']];
 const safe=x=>escapeHtml(String(x??''));
 const dayKey=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 const count=(rows,mode)=>{
  if(mode==='events')return rows.length;
  const key={browsers:'visitor_id',sessions:'session_id',journeys:'journey_id'}[mode];
  if(rows.some(row=>typeof row[key]!=='string'||!row[key]))return null;
  return new Set(rows.map(row=>row[key])).size;
 };
 window.mountVacancyEventExplorer=function(root){
  const actor=currentUser?.id,section=root.closest('[data-admin-section]');
  const panel=document.createElement('section');panel.className='overview-event-explorer';panel.setAttribute('aria-label','Button and page activity');
  panel.innerHTML='<div class="section-head"><h3>Button & page activity</h3><button type="button" data-event-refresh>Refresh activity</button></div><div class="event-explorer-controls"><label>Track<select data-event-target aria-label="Activity to track">'+targets.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select></label><label>Count<select data-event-count aria-label="Activity counting method">'+modes.map(([id,label])=>'<option value="'+id+'"'+(id==='browsers'?' selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Period<select data-event-period aria-label="Activity period"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label></div><div data-event-body aria-live="polite"></div><details><summary>Counting rules</summary><p>Total events counts recorded presses or visits. Distinct browsers counts browser IDs, not verified people. Sessions count visits; listing journeys count separate creation attempts. Daily distinct counts cannot be added to get a period total. Page opens are not page completions, and a lower next-stage count does not prove abandonment.</p></details>';
  root.querySelector('.overview-insight-grid').after(panel);
  const body=panel.querySelector('[data-event-body]'),target=panel.querySelector('[data-event-target]'),mode=panel.querySelector('[data-event-count]'),period=panel.querySelector('[data-event-period]');
  let report=null,range=null,pending=null,stopped=false,version=0;
  const valid=()=>!stopped&&panel.isConnected&&location.hash==='#admin'&&!!actor&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
  const visible=()=>!document.hidden&&!section.hidden;
  function paint(){
   if(!report)return;
   if(['contact_button_pressed','text_button_pressed'].includes(target.value)&&!(Array.isArray(report.eventCoverage)&&report.eventCoverage.includes(target.value))&&!report.events.some(row=>row.event_name===target.value)){
    body.innerHTML='<p role="status">Not collected yet. This button needs a dedicated click event before its activity can be counted.</p>';return;
   }
   const rows=report.events.filter(row=>row.event_name===target.value),total=count(rows,mode.value);
   if(total===null){body.innerHTML='<p role="status">Distinct count unavailable: some recorded events are missing the required identifier. Choose Total events.</p>';return;}
   const buckets=[];
   for(let date=new Date(range.start);date<range.end;date.setDate(date.getDate()+1))buckets.push({key:dayKey(date),date:new Date(date),rows:[]});
   const byDay=new Map(buckets.map(bucket=>[bucket.key,bucket]));for(const row of rows)byDay.get(dayKey(new Date(row.created_at)))?.rows.push(row);
   const values=buckets.map(bucket=>count(bucket.rows,mode.value)),max=Math.max(...values,1),x=i=>buckets.length===1?400:40+i*730/(buckets.length-1),y=n=>186-n/max*164;
   let grid='';for(let i=1;i<4;i++)grid+='<line x1="40" x2="770" y1="'+(22+i*41)+'" y2="'+(22+i*41)+'" stroke="#e5e7eb"/><line y1="22" y2="186" x1="'+(40+i*182.5)+'" x2="'+(40+i*182.5)+'" stroke="#e5e7eb"/>';
   const label=targets.find(([id])=>id===target.value)[1],unit=modes.find(([id])=>id===mode.value)[1],tick=d=>d.toLocaleDateString(undefined,{day:'numeric',month:'short'});
   const stages=targets.slice(0,3).map(([id,label])=>({id,label,value:count(report.events.filter(r=>r.event_name===id),mode.value)}));
   const stageMax=Math.max(...stages.map(s=>s.value||0),1);
   const gaps=stages.slice(1).map((s,i)=>({from:stages[i],to:s,gap:stages[i].value!==null&&s.value!==null?stages[i].value-s.value:0})).sort((a,b)=>b.gap-a.gap);
   body.innerHTML='<div class="event-explorer-total"><strong>'+total.toLocaleString()+'</strong><span>'+safe(unit)+' · '+safe(label)+'</span></div><div class="event-explorer-plot"><svg viewBox="0 0 800 220" role="img" aria-label="'+safe(label+' over time, '+unit)+'"><title>'+safe(label+' · '+unit)+'</title>'+grid+'<text x="34" y="25" text-anchor="end" font-size="11" fill="#737b89">'+new Intl.NumberFormat(undefined,{notation:'compact'}).format(max)+'</text><text x="34" y="190" text-anchor="end" font-size="11" fill="#737b89">0</text><polyline points="'+values.map((n,i)=>x(i)+','+y(n)).join(' ')+'" fill="none" stroke="#347ef0" stroke-width="2.5"/><text x="40" y="214" font-size="11" fill="#737b89">'+safe(tick(buckets[0].date))+'</text><text x="770" y="214" text-anchor="end" font-size="11" fill="#737b89">'+safe(tick(buckets.at(-1).date))+'</text></svg></div><details><summary>View daily counts</summary><div class="journey-table-wrap"><table><thead><tr><th>Date</th><th>'+safe(unit)+'</th></tr></thead><tbody>'+buckets.map((b,i)=>'<tr><td>'+safe(tick(b.date))+'</td><td>'+values[i]+'</td></tr>').join('')+'</tbody></table></div></details><h4>Listing page reach</h4><ol class="event-stage-reach">'+stages.map(s=>'<li><span>'+safe(s.label)+'</span>'+(s.value===null?'<span>Unavailable</span>':'<meter min="0" max="'+stageMax+'" value="'+s.value+'" aria-label="'+safe(s.label)+'">'+s.value+'</meter><strong>'+s.value+'</strong>')+'</li>').join('')+'</ol>'+(gaps[0].gap>0?'<p>Largest stage difference: '+safe(gaps[0].from.label)+' to '+safe(gaps[0].to.label)+' ('+gaps[0].gap+' fewer). Review journey evidence before treating this as a bottleneck.</p>':'<p>No lower next-stage count in this range.</p>');
  }
  async function load(){
   if(!valid()||!visible())return;pending?.abort();const controller=new AbortController();pending=controller;const id=++version;report=null;body.textContent='Loading activity…';
   const end=new Date(),start=new Date(end);start.setHours(0,0,0,0);start.setDate(start.getDate()-Number(period.value)+1);range={start,end};
   let timer;
   try{
    if(end-start>90*86400000)throw Error('Choose a shorter range');
    const result=await Promise.race([VACANCY_BACKEND.adminListerMarketing(start.toISOString(),end.toISOString()),new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(Error('Cancelled')),{once:true});timer=setTimeout(()=>controller.abort(),15000);})]);
    if(id!==version||!valid()||!visible())return;
    if(!Array.isArray(result?.events)||result.events.length>=5001||result.events.some(r=>!r||!['string','number'].includes(typeof r.id)||typeof r.created_at!=='string'||typeof r.event_name!=='string'||!Number.isFinite(Date.parse(r.created_at))||Date.parse(r.created_at)<start.getTime()||Date.parse(r.created_at)>=end.getTime()))throw Error('Incomplete activity');
    report={...result,events:[...new Map(result.events.map(row=>[String(row.id),row])).values()]};paint();
   }catch{if(id===version&&valid()&&visible())body.textContent='Activity unavailable or incomplete. Narrow the period or refresh; missing counts are not zero.';}
   finally{clearTimeout(timer);if(pending===controller)pending=null;}
  }
  function cleanup(){if(stopped)return;stopped=true;++version;pending?.abort();report=null;panel.replaceChildren();observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);}
  let wasVisible=visible();function sync(){if(!valid()){cleanup();return;}const next=visible();if(!next&&wasVisible){++version;pending?.abort();report=null;body.textContent='Refresh when visible';}else if(next&&!wasVisible)void load();wasVisible=next;}
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
  target.onchange=mode.onchange=paint;period.onchange=load;panel.querySelector('[data-event-refresh]').onclick=load;void load();
 };
})();
