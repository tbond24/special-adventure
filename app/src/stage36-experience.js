(() => {
  const icon=(name,klass='control-icon')=>`<svg class="${klass}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

  const baseDetail=renderDetail;
  renderDetail=function(id){
    baseDetail(id);
    const v=vacancies.find(item=>item.id===id),gallery=document.querySelector('.detail-gallery'),summary=document.querySelector('.detail-summary');
    if(!v||!gallery||!summary)return;
    const oldSave=document.querySelector('#saveDetail'),oldReport=document.querySelector('#reportListing'),oldBlock=document.querySelector('#blockLister');
    oldSave?.closest('.row')?.remove();
    oldReport?.closest('.row')?.remove();
    gallery.insertAdjacentHTML('beforeend',`<button class="detail-heart${saved.has(v.id)?' active':''}" id="saveDetail" aria-label="${saved.has(v.id)?'Remove from saved':'Save listing'}">${icon('saved','nav-icon nav-icon--fillable')}</button>`);
    summary.querySelector('.panel')?.insertAdjacentHTML('beforeend',`<div class="detail-primary-action"><button class="primary" id="enquire">Enquire</button></div>`);
    const facts=document.querySelector('.property-facts');
    const map=document.querySelector('.detail-map-card');
    if(facts&&map){const group=document.createElement('div');group.className='property-facts-map';facts.parentElement.insertBefore(group,facts);group.append(facts,map)}
    summary.insertAdjacentHTML('afterend',`<button class="detail-flag" id="listingSafetyToggle" aria-label="Listing safety options" aria-expanded="false">${icon('flag')}</button><div class="sheet-backdrop" id="listingSafetyBackdrop" hidden></div><section class="action-sheet" id="listingSafetySheet" hidden role="dialog" aria-modal="true" aria-labelledby="listingSafetyTitle"><div class="sheet-handle"></div><h2 id="listingSafetyTitle">Listing safety</h2><button id="reportListing" aria-label="Report listing"><strong>Report listing</strong><span>Tell Vacancy about a scam, inaccurate details or unsafe behaviour</span>${icon('chevron')}</button><button id="blockLister" aria-label="Block lister"><strong>Block this lister</strong><span>Hide contact and prevent further messaging</span>${icon('chevron')}</button><button class="ghost" id="closeListingSafety">Cancel</button></section>`);
    const heart=document.querySelector('#saveDetail');
    heart.onclick=async()=>{await toggleSave(v.id);heart.classList.toggle('active',saved.has(v.id));heart.setAttribute('aria-label',saved.has(v.id)?'Remove from saved':'Save listing')};
    document.querySelector('#enquire').onclick=()=>currentUser?nav('enquire',v.id):nav('auth');
    const sheet=document.querySelector('#listingSafetySheet'),backdrop=document.querySelector('#listingSafetyBackdrop'),toggle=document.querySelector('#listingSafetyToggle');
    const setSheet=open=>{sheet.hidden=!open;backdrop.hidden=!open;toggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('sheet-open',open)};
    toggle.onclick=()=>setSheet(true);backdrop.onclick=()=>setSheet(false);document.querySelector('#closeListingSafety').onclick=()=>setSheet(false);
    document.querySelector('#reportListing').onclick=async()=>{if(!currentUser){nav('auth');return}const reason=prompt('What is wrong with this listing?');if(!reason)return;try{await VACANCY_BACKEND.reportVacancy(v.id,v.owner.id,reason);setSheet(false);toast('Report submitted')}catch(error){toast(error.message)}};
    document.querySelector('#blockLister').onclick=async()=>{if(!currentUser){nav('auth');return}if(v.owner.id===currentUser.id){toast('This is your listing');return}if(!confirm('Block this lister and stop further messaging?'))return;try{await VACANCY_BACKEND.blockUser(v.owner.id);setSheet(false);toast('Lister blocked')}catch(error){toast(error.message)}};
  };

  renderAccount=function(){
    if(!currentUser){nav('auth');return}
    const row=(id,label,value,type='open')=>`<button class="settings-row" id="${id}"><span><strong>${label}</strong><small>${value}</small></span>${type==='toggle'?`<i class="settings-switch ${value==='On'?'on':''}" aria-hidden="true"></i>`:icon('chevron')}</button>`;
    layout(`<section class="account-page"><div class="section-head"><div><h1>You</h1><p class="muted">${escapeHtml(currentUser.email||'Signed-in Vacancy member')}</p></div></div><section class="settings-group"><h2>Your activity</h2>${row('yourListings','Properties and listings','Manage properties, units and availability')}</section><section class="settings-group"><h2>Privacy and security</h2>${row('blockedAccounts','Blocked accounts','Review and unblock members')}${row('accountSecurity','Password and sessions','Reset password or sign out every session')}${row('adminEntry','Admin','Available only to authorised operators')}</section><section class="settings-group settings-danger"><button class="settings-row" id="signout"><span><strong>Sign out</strong></span></button><button class="settings-row" id="deleteEntry"><span><strong>Delete account</strong><small>Permanently remove your Vacancy account</small></span></button></section></section><div class="sheet-backdrop" id="accountSheetBackdrop" hidden></div><section class="action-sheet account-sheet" id="accountSheet" hidden role="dialog" aria-modal="true" aria-labelledby="accountSheetTitle"></section>`);
    document.querySelector('#yourListings').onclick=()=>nav('list');
    document.querySelector('#blockedAccounts').onclick=renderBlockedAccounts;
    document.querySelector('#accountSecurity').onclick=renderSecurityActions;
    document.querySelector('#adminEntry').onclick=async()=>{try{const access=await VACANCY_BACKEND.adminOverview();if(access?.error)throw new Error('Admin access required');nav('admin')}catch(error){toast(error.message)}};
    document.querySelector('#signout').onclick=async()=>{await VACANCY_BACKEND.signOut();currentUser=null;saved.clear();toast('Signed out');nav('home')};
    document.querySelector('#deleteEntry').onclick=async()=>{if(!confirm('Permanently delete your Vacancy account and associated data?'))return;try{await VACANCY_BACKEND.deleteAccount();currentUser=null;saved.clear();toast('Account deleted');nav('home')}catch(error){toast(error.message)}};
    const adminEntry=document.querySelector('#adminEntry');adminEntry.hidden=true;
    VACANCY_BACKEND.adminOverview().then(data=>{if(!data?.error)adminEntry.hidden=false}).catch(()=>{});
  };

  function closeAccountSheet(){document.querySelector('#accountSheet').hidden=true;document.querySelector('#accountSheetBackdrop').hidden=true;document.body.classList.remove('sheet-open')}
  function openAccountSheet(markup){const sheet=document.querySelector('#accountSheet'),backdrop=document.querySelector('#accountSheetBackdrop');sheet.innerHTML=`<div class="sheet-handle"></div>${markup}<button class="ghost" id="closeAccountSheet">Done</button>`;sheet.hidden=false;backdrop.hidden=false;document.body.classList.add('sheet-open');backdrop.onclick=closeAccountSheet;document.querySelector('#closeAccountSheet').onclick=closeAccountSheet}
  async function renderBlockedAccounts(){
    openAccountSheet('<h2 id="accountSheetTitle">Blocked accounts</h2><p class="muted">Loading…</p>');
    try{const rows=await VACANCY_BACKEND.blockedUsers(),sheet=document.querySelector('#accountSheet');sheet.innerHTML=`<div class="sheet-handle"></div><h2 id="accountSheetTitle">Blocked accounts</h2>${rows.length?rows.map(item=>`<div class="blocked-row"><span><strong>${escapeHtml(item.profiles?.display_name||'Blocked member')}</strong><small>${new Date(item.created_at).toLocaleDateString()}</small></span><button class="ghost" data-unblock="${item.blocked_id}">Unblock</button></div>`).join(''):'<p class="muted">You have not blocked anyone.</p>'}<button class="ghost" id="closeAccountSheet">Done</button>`;document.querySelector('#closeAccountSheet').onclick=closeAccountSheet;document.querySelectorAll('[data-unblock]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await VACANCY_BACKEND.unblockUser(button.dataset.unblock);toast('Member unblocked');await renderBlockedAccounts()}catch(error){button.disabled=false;toast(error.message)}})}catch(error){document.querySelector('#accountSheet').querySelector('p').textContent=error.message}
  }
  function renderSecurityActions(){openAccountSheet(`<h2 id="accountSheetTitle">Password and sessions</h2><button id="resetPasswordAction"><strong>Reset password</strong><span>Send a secure reset link to your account email</span>${icon('chevron')}</button><button id="signoutAllAction"><strong>Sign out every session</strong><span>Revoke this account on all signed-in devices</span>${icon('chevron')}</button>`);document.querySelector('#resetPasswordAction').onclick=()=>nav('forgot-password');document.querySelector('#signoutAllAction').onclick=async()=>{if(!confirm('Sign out this account on every device?'))return;await VACANCY_BACKEND.signOut();currentUser=null;saved.clear();closeAccountSheet();toast('All sessions signed out');nav('home')}}

  renderAdmin=async function(){
    if(!currentUser){nav('auth');return}
    layout(`<section class="admin-page"><div class="section-head"><div><h1>Admin operations</h1><p class="muted">Marketplace health and work requiring attention.</p></div><button class="ghost" id="adminRefresh">Refresh</button></div><div id="adminHost" class="empty">Loading secure operations…</div></section>`);
    document.querySelector('#adminRefresh').onclick=renderAdmin;
    const host=document.querySelector('#adminHost');
    try{
      const [dashboard,search,reports,audit]=await Promise.all([VACANCY_BACKEND.adminDashboard(),VACANCY_BACKEND.adminSearch(''),VACANCY_BACKEND.adminReports(),VACANCY_BACKEND.adminAuditLog()]);
      if(dashboard?.error)throw new Error('Admin access required');
      const conversion=dashboard.listings_7d?Math.round((dashboard.enquiries_7d/dashboard.listings_7d)*100):0;
      const stat=(value,label,attention=false)=>`<div class="stat${attention?' attention-stat':''}"><strong>${typeof value==='number'?value.toLocaleString():escapeHtml(String(value??0))}</strong>${label}</div>`;
      host.className='stack';host.innerHTML=`
        <div class="admin-health"><span class="health-dot"></span><strong>Core services reporting</strong><span>Client errors: ${dashboard.errors_24h||0} in 24h</span></div>
        <div class="stat-grid admin-stat-grid">${stat(dashboard.open_reports,'Open reports',dashboard.open_reports>0)}${stat(dashboard.oldest_report_hours,'Oldest report · hours',dashboard.oldest_report_hours>24)}${stat(dashboard.active_listings,'Active listings')}${stat(dashboard.users_total,'Users')}${stat(dashboard.properties,'Properties')}${stat(dashboard.units,'Units')}${stat(dashboard.enquiries_7d,'Enquiries · 7 days')}${stat(conversion+'%','Listings → enquiries')}</div>
        <section class="panel admin-search-panel"><h2>Find people and listings</h2><form id="adminSearchForm" class="admin-search"><input id="adminSearchInput" aria-label="Search users and listings" placeholder="Name, listing, suburb or ID"><button class="primary">Search</button></form><div id="adminSearchResults">${adminSearchMarkup(search)}</div></section>
        <section class="panel"><div class="section-head"><div><h2>Report queue</h2><p class="muted">Resolve the oldest reports first.</p></div></div><div id="adminReports">${adminReportsMarkup(reports)}</div></section>
        <section class="panel"><h2>Moderation history</h2><div class="admin-audit">${audit.length?audit.map(row=>`<div><strong>${escapeHtml(row.action.replaceAll('_',' '))}</strong><span>${escapeHtml(row.target_type)} · ${new Date(row.created_at).toLocaleString()}</span><small>${escapeHtml(row.reason)}</small></div>`).join(''):'<p class="muted">No moderation actions recorded.</p>'}</div></section>`;
      bindAdminActions();
      document.querySelector('#adminSearchForm').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{const result=await VACANCY_BACKEND.adminSearch(document.querySelector('#adminSearchInput').value);document.querySelector('#adminSearchResults').innerHTML=adminSearchMarkup(result);bindAdminActions()}catch(error){toast(error.message)}finally{button.disabled=false}};
    }catch(error){host.className='empty';host.textContent=error.message}
  };

  function adminSearchMarkup(data){
    const users=data?.users||[],listings=data?.listings||[];
    return `<div class="admin-results"><div><h3>People</h3>${users.length?users.map(user=>`<article class="admin-result"><span><strong>${escapeHtml(user.display_name||'Unnamed member')}</strong><small>${escapeHtml(user.id)} · ${user.account_status}</small></span><button class="ghost" data-admin-user="${user.id}" data-next-status="${user.account_status==='suspended'?'active':'suspended'}">${user.account_status==='suspended'?'Restore':'Suspend'}</button></article>`).join(''):'<p class="muted">No people found.</p>'}</div><div><h3>Listings</h3>${listings.length?listings.map(item=>`<article class="admin-result"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml([item.title,item.suburb,item.city].filter(Boolean).join(' · '))} · ${item.status}</small></span><button class="ghost" data-admin-listing="${item.id}" data-next-status="${item.status==='paused'?'active':'paused'}">${item.status==='paused'?'Reactivate':'Pause'}</button></article>`).join(''):'<p class="muted">No listings found.</p>'}</div></div>`;
  }
  function adminReportsMarkup(reports){return reports.length?reports.map(report=>`<article class="admin-report"><span><strong>${escapeHtml(report.reason)}</strong><small>${new Date(report.created_at).toLocaleString()} · ${report.status}</small></span>${report.status==='open'?`<span class="row"><button class="ghost" data-report-action="resolved" data-report-id="${report.id}">Resolve</button><button class="ghost" data-report-action="dismissed" data-report-id="${report.id}">Dismiss</button></span>`:''}</article>`).join(''):'<p class="muted">No reports.</p>'}
  function moderationReason(action){const reason=prompt(`Reason for ${action}`);return reason&&reason.trim().length>=3?reason.trim():null}
  function bindAdminActions(){
    document.querySelectorAll('[data-report-action]').forEach(button=>button.onclick=async()=>{const reason=moderationReason(button.dataset.reportAction);if(!reason)return;button.disabled=true;try{await VACANCY_BACKEND.adminResolveReport(button.dataset.reportId,button.dataset.reportAction,reason);toast('Report updated');await renderAdmin()}catch(error){button.disabled=false;toast(error.message)}});
    document.querySelectorAll('[data-admin-listing]').forEach(button=>button.onclick=async()=>{const reason=moderationReason(button.textContent);if(!reason)return;button.disabled=true;try{await VACANCY_BACKEND.adminSetVacancyStatus(button.dataset.adminListing,button.dataset.nextStatus,reason);toast('Listing updated');await renderAdmin()}catch(error){button.disabled=false;toast(error.message)}});
    document.querySelectorAll('[data-admin-user]').forEach(button=>button.onclick=async()=>{const reason=moderationReason(button.textContent);if(!reason)return;if(!confirm(`${button.textContent} this member?`))return;button.disabled=true;try{await VACANCY_BACKEND.adminSetUserStatus(button.dataset.adminUser,button.dataset.nextStatus,reason);toast('Member access updated');await renderAdmin()}catch(error){button.disabled=false;toast(error.message)}});
  }
})();
