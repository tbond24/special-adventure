// DEV SERVER ONLY. Not referenced by application HTML or shipped in app/.
(async()=>{
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  for(let i=0;i<200&& (typeof booting==='undefined'||booting);i++)await pause(50);
  const controls=document.createElement('div');controls.className='visual-fixture-banner';
  controls.innerHTML='<strong>DEVELOPMENT · SYNTHETIC DATA</strong><span>No live users, tracking or production actions.</span><label>Test state <select id="visualScenario"><option value="normal">Missing outcome links</option><option value="complete">Complete recorded cohort</option><option value="incomplete">Incomplete dataset</option><option value="empty">No data</option><option value="error">Refresh failure</option></select></label>';
  document.body.prepend(controls);
  const fixtureLayout=document.createElement('style');fixtureLayout.textContent='.visual-fixture-banner{position:sticky!important;top:0}.admin-console .console-sidebar{top:var(--fixture-banner-height)!important}@media(max-width:700px){.visual-fixture-banner{z-index:80!important}.admin-console .console-sidebar{top:0!important}}';document.head.append(fixtureLayout);
  new ResizeObserver(()=>document.documentElement.style.setProperty('--fixture-banner-height',controls.offsetHeight+'px')).observe(controls);
  const style=document.createElement('style');style.textContent='.visual-fixture-banner{position:relative;z-index:120;background:#eaf2ff;border-bottom:1px solid #d4e3ff;color:#254a7c;padding:10px 24px;font:12px system-ui;display:flex;align-items:center;gap:16px;flex-wrap:wrap}.visual-fixture-banner strong{font-size:10px;letter-spacing:.09em;font-weight:700!important}.visual-fixture-banner label{margin-left:auto;display:flex;gap:8px;align-items:center}.visual-fixture-banner select{font:12px system-ui;background:white;border:1px solid #c5d5eb;padding:4px 8px;border-radius:5px}.admin-console .console-sidebar{top:45px}@media(max-width:700px){.visual-fixture-banner{padding:10px 16px;gap:6px}.visual-fixture-banner>span{width:100%}.visual-fixture-banner label{margin:0}.admin-console .console-sidebar{top:0}}';document.head.append(style);
  currentUser={id:'synthetic-admin',email:'admin@example.invalid'};
  VACANCY_BACKEND.adminMembership=async()=>true;VACANCY_BACKEND.assuranceLevel=()=> 'aal2';
  VACANCY_BACKEND.adminDashboard=async()=>({open_reports:3,oldest_report_hours:5,active_listings:48,users_total:96,properties:28,units:61,enquiries_7d:21,listings_7d:16,errors_24h:2});
  VACANCY_BACKEND.adminJourneyMap=async options=>({schemaVersion:1,generatedAt:new Date().toISOString(),from:options.p_from,to:options.p_to,device:options.p_device,total:120,nodes:[{id:'find',count:120},{id:'listing',count:80},{id:'create',count:40},{id:'step:0',count:40},{id:'step:1',count:30},{id:'step:2',count:20},{id:'step:3',count:10}],edges:[{from:'find',to:'listing',count:80},{from:'listing',to:'create',count:20},{from:'create',to:'step:0',count:40},{from:'step:0',to:'step:1',count:30},{from:'step:1',to:'step:2',count:20},{from:'step:2',to:'step:3',count:10}]});
  VACANCY_BACKEND.adminSearch=async(term='')=>({users:[{id:'synthetic-member',display_name:'Sample lister',account_status:'active'}].filter(x=>!term||x.display_name.toLowerCase().includes(term.toLowerCase())),listings:[{id:'synthetic-listing',name:'Sample studio',title:'Example property',suburb:'Example area',city:'Nairobi',status:'active'}].filter(x=>!term||x.name.toLowerCase().includes(term.toLowerCase()))});
  VACANCY_BACKEND.adminReports=async()=>[{id:'synthetic-report',reason:'Example: listing information needs review',status:'open',created_at:new Date().toISOString()}];
  VACANCY_BACKEND.adminAppearanceHistory=async()=>[{revision:2,published_at:new Date(Date.now()-120000).toISOString(),reason:'Synthetic example · Save button label and colour updated.'},{revision:1,published_at:new Date(Date.now()-3600000).toISOString(),reason:'Synthetic example · initial Save button style.'}];
  VACANCY_BACKEND.adminAuditLog=async()=>[{action:'report_resolved',target_type:'Synthetic listing',reason:'Development example only',created_at:new Date().toISOString()}];
  VACANCY_BACKEND.adminDailyMetrics=async(metric,days=7)=>{
    const length=Math.min(180,Math.max(1,Number(days))),base={accounts:12,listings:8,enquiries:23,messages:76,images:36}[metric]||1;
    const series=Array.from({length},(_,i)=>({date:new Date(Date.now()-(length-1-i)*864e5).toISOString().slice(0,10),value:Math.round(base+((i*7)%13-6)*base/10+i*base/180)}));
    return {metric,days:length,total:series.reduce((sum,row)=>sum+row.value,0),series};
  };
  const dailyReports=new Map();
  VACANCY_BACKEND.adminDailyMetricsLocal=async(metric,days,timeZone)=>{
    const report=await VACANCY_BACKEND.adminDailyMetrics(metric,days);
    const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const key=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
    const today=Date.parse(key+'T00:00:00Z'),last=report.series.at(-1)?.date;
    const offset=today-Date.parse(last+'T00:00:00Z');
    const localReport={...report,timeZone,series:report.series.map(p=>({...p,date:new Date(Date.parse(p.date+'T00:00:00Z')+offset).toISOString().slice(0,10)}))};dailyReports.set(metric,localReport);return localReport;
  };
  VACANCY_BACKEND.adminMetricComparison=async(metric,from,to,previousFrom,previousTo)=>{
    const report=dailyReports.get(metric);if(!report)throw Error('Synthetic daily report missing');
    // Synthetic counts occur at 00:01 local time; never used for real analytics.
    const sum=(lo,hi)=>report.series.reduce((total,p)=>{const stamp=new Date(p.date+'T00:01:00').getTime();return total+(stamp>=Date.parse(lo)&&stamp<Date.parse(hi)?p.value:0)},0);
    const first=new Date(report.series[0].date+'T00:00:00').getTime();
    return {metric,total:sum(from,to),previous:first>Date.parse(previousFrom)?null:sum(previousFrom,previousTo),from,to,previousFrom,previousTo};
  };
  VACANCY_BACKEND.elementTrackingPolicy=async()=>({enabled:false,noticeVersion:'20261021-elements-v1',retentionDays:30});
  VACANCY_BACKEND.adminElementTracking=async(from,to)=>{
    const report=await VACANCY_BACKEND.adminListerMarketing(from,to);
    return {coverageStart:new Date(Date.now()-180*864e5).toISOString(),generatedAt:to,events:report.events.filter(e=>VACANCY_TRACKING.catalog.some(p=>p.id===e.event_name)).map(e=>({event_id:e.id,event_name:e.event_name,visitor_id:e.visitor_id,session_id:e.session_id,journey_id:e.journey_id,occurred_at:e.created_at}))};
  };
  VACANCY_BACKEND.adminCardSeries=async(metric,buckets)=>({metric,series:buckets.map(b=>({at:b.end,value:2}))});
  VACANCY_BACKEND.adminVisitorPresence=async()=>({generatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10000).toISOString(),total:1,nodes:[{id:'find',count:1}]});
  VACANCY_BACKEND.adminTrafficMetrics=async buckets=>{
    const series=buckets.map((b,i)=>({at:b.end,visits:140+i%30,unique:100+i%20,registered:buckets.length===1?12:Math.min(40,i*3),nonRegistered:buckets.length===1?8:Math.min(24,i*2),unknown:0}));
    const registered=Math.max(...series.map(p=>p.registered)),nonRegistered=Math.max(...series.map(p=>p.nonRegistered));
    return {schemaVersion:1,source:'connected_v2',generatedAt:new Date().toISOString(),lastRecordedAt:buckets.at(-1).end,visits:Math.min(480,series.reduce((n,p)=>n+p.visits,0)),unique:Math.min(321,series.reduce((n,p)=>n+p.unique,0)),repeat:{total:registered+nonRegistered,registered,nonRegistered,unknown:0},unidentifiedEvents:0,series};
  };
  VACANCY_BACKEND.adminOperationalHealth=async()=>({email_sent:25,email_delivered:24,email_failed:1,email_bounced:0,email_complained:0,storage_bytes:144*1048576,client_errors:2});
  VACANCY_BACKEND.adminIconRevisions=async()=>[];
  VACANCY_BACKEND.adminListerMarketing=async(from,to)=>{
    const events=[];const add=(name,i,n=0)=>events.push({id:'event-'+name+'-'+i+'-'+n,event_name:name,created_at:new Date(Date.now()-60000-(i%12)*864e5).toISOString(),visitor_id:'sample-browser-'+(i%9),session_id:'sample-session-'+i,journey_id:'sample-journey-'+i});
    for(let i=0;i<12;i++){add('location_started',i);add('location_started',i,1);if(i<8)add('listing_details_started',i);if(i<5)add('listing_previewed',i);if(i<6){add('contact_button_pressed',i);add('text_button_pressed',i);}}
    return {generated_at:new Date().toISOString(),events:events.filter(e=>(!from||e.created_at>=from)&&(!to||e.created_at<to)),eventCoverage:['contact_button_pressed','text_button_pressed'],publications:[]};
  };
  for(const key of Object.keys(VACANCY_BACKEND))if(/^admin(Set|Resolve|Deactivate|Suspend|Restore|Update|Delete)/.test(key))VACANCY_BACKEND[key]=async()=>{throw Error('Write actions are disabled in this synthetic visual preview.');};

  VACANCY_BACKEND.recentActivity=async()=>({generated_at:new Date().toISOString(),browsers_recent:86,accounts_created:12,sources:[],actions:[],recent:[]});
  VACANCY_BACKEND.adminVacancies=async()=>Array.from({length:24},(_,i)=>({id:'synthetic-city-listing-'+i,status:i<21?'active':'paused',rooms:{properties:{city:i<12?'Nairobi':i<18?'Mombasa':'Kisumu'}}}));
  VACANCY_BACKEND.adminRenterJourneys=async()=>({schemaVersion:1,complete:true,generatedAt:new Date().toISOString(),searches:120,withOpen:84,withEnquiry:32,withReply:18,conversations:35,repliedConversations:19,directOpens:9,detailTotal:0,coverage:'Synthetic example only. Collection is not enabled by this preview.',details:[]});
  const sources=['Search','Tagged link','Referral','Unknown'];
  const journeys=Array.from({length:120},(_,i)=>({label:`Sample journey ${i+1}`,source:sources[i%4],campaign:i%4===1?'Sample launch link':'Unspecified',device:i%3?'mobile':'desktop',age:2+i%28,reached:i<48?4:i<76?3:i<103?2:1,confirmed:i<36,unknown:i>=40&&i<56,errors:i%9===0,returned:i%7===0,observing:(2+i%28)<=8}));
  async function provider(filters){
    await pause(180);const scenario=document.querySelector('#visualScenario').value;
    if(scenario==='error')throw Error('Synthetic connection failure. Choose another test state, then retry.');
    let rows=journeys.filter(r=>(!filters.source||r.source===filters.source)&&(!filters.campaign||r.campaign===filters.campaign)&&(!filters.device||r.device===filters.device)&&r.age<=Number(filters.period));
    if(scenario==='empty')rows=[];
    const mature=rows.filter(r=>!r.observing),confirmed=rows.filter(r=>r.confirmed).length;
    const unknown=scenario==='complete'?0:rows.filter(r=>r.unknown).length;
    const colours=['#347ef0','#6e6ce5','#2fa586','#94a0b4'];
    return {complete:scenario!=='incomplete',generatedAt:new Date().toISOString(),latestLabel:'synthetic fixture · just now',facets:{source:sources,campaign:['Sample launch link','Unspecified']},total:rows.length,arrivals:rows.length*3,intentSessions:rows.length,stages:['Location','Listing details','Review','Submission'].map((label,i)=>({label,count:rows.filter(r=>r.reached>i).length})),sources:sources.map((name,i)=>({name,count:rows.filter(r=>r.source===name).length,colour:colours[i]})).filter(s=>s.count),confirmed,listings:confirmed+rows.filter(r=>r.confirmed&&r.reached===4&&r.label.endsWith('1')).length,unknown,observing:rows.filter(r=>r.observing).length,mature:mature.length,matureSuccess:mature.filter(r=>r.confirmed).length,linkageComplete:unknown===0,errors:rows.filter(r=>r.errors).length,returned:rows.filter(r=>r.returned).length,inactive:rows.filter(r=>!r.confirmed&&!r.observing&&!r.unknown).length,samples:rows.filter((r,i)=>i<7||i===rows.length-1).map(r=>({...r,outcome:r.confirmed?'Confirmed publication':r.unknown&&scenario!=='complete'?'Publication linkage unknown':r.observing?'Still observing':'No linked confirmation · not abandonment'}))};
  }
  // This fixture supplies its own synthetic journey; do not also mount the connected report.
  window.mountVacancyConnectedReport=()=>{};
  const before=renderAdmin;let panel;
  renderAdmin=async function(){await before();const section=document.querySelector('[data-admin-section=overview]');if(!section)return;const content=document.createElement('div');section.querySelector(':scope > .journey-details').replaceWith(content);panel=VACANCY_ADMIN_CONSOLE.mountJourney(content,provider);};
  sessionStorage.setItem('vacancy-admin-section',new URLSearchParams(location.search).get('section')==='overview'?'overview':'marketing');
  history.replaceState(null,'','#admin');route=parseHash();await renderAdmin();
  document.querySelector('#visualScenario').onchange=()=>panel.refresh();
  window.__visualReady=true;
})();
