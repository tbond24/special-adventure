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
  VACANCY_BACKEND.adminSearch=async(term='')=>({users:[{id:'synthetic-member',display_name:'Sample lister',account_status:'active'}].filter(x=>!term||x.display_name.toLowerCase().includes(term.toLowerCase())),listings:[{id:'synthetic-listing',name:'Sample studio',title:'Example property',suburb:'Example area',city:'Nairobi',status:'active'}].filter(x=>!term||x.name.toLowerCase().includes(term.toLowerCase()))});
  VACANCY_BACKEND.adminReports=async()=>[{id:'synthetic-report',reason:'Example: listing information needs review',status:'open',created_at:new Date().toISOString()}];
  VACANCY_BACKEND.adminAuditLog=async()=>[{action:'report_resolved',target_type:'Synthetic listing',reason:'Development example only',created_at:new Date().toISOString()}];
  VACANCY_BACKEND.adminDailyMetrics=async(metric,days=7)=>({total:84,days:Number(days),series:Array.from({length:Number(days)},(_,i)=>({date:new Date(Date.now()-(Number(days)-i)*864e5).toISOString(),value:(i*7)%18+2}))});
  VACANCY_BACKEND.adminOperationalHealth=async()=>({email_sent:25,email_delivered:24,email_failed:1,email_bounced:0,email_complained:0,storage_bytes:144*1048576,client_errors:2});
  VACANCY_BACKEND.adminIconRevisions=async()=>[];
  VACANCY_BACKEND.adminListerMarketing=async()=>({generated_at:new Date().toISOString(),events:[],publications:[]});
  for(const key of Object.keys(VACANCY_BACKEND))if(/^admin(Set|Resolve|Deactivate|Suspend|Restore|Update|Delete)/.test(key))VACANCY_BACKEND[key]=async()=>{throw Error('Write actions are disabled in this synthetic visual preview.');};
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
  const before=renderAdmin;let panel;
  renderAdmin=async function(){await before();const section=document.querySelector('[data-admin-section=marketing]');if(!section)return;panel=VACANCY_ADMIN_CONSOLE.mountJourney(section,provider);};
  sessionStorage.setItem('vacancy-admin-section','marketing');
  history.replaceState(null,'','#admin');route=parseHash();await renderAdmin();
  document.querySelector('#visualScenario').onchange=()=>panel.refresh();
  window.__visualReady=true;
})();
