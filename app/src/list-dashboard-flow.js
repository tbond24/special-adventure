(() => {
  const homeBeforeMetrics = renderHome;
  renderHome = function () {
    homeBeforeMetrics();
    const rail = document.querySelector('#cards');
    if (!rail || !('IntersectionObserver' in window)) return;
    const observed = new WeakSet();
    const viewport = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < .5) continue;
        const id = entry.target.dataset.openCard;
        viewport.unobserve(entry.target);
        if (!id) continue;
        const key = 'vacancy-impression:' + id;
        const now = Date.now();
        try {
          if (now - Number(sessionStorage.getItem(key) || 0) < 30 * 60 * 1000) continue;
          sessionStorage.setItem(key,String(now));
        } catch {}
        VACANCY_BACKEND.trackEvent('listing_impression',id,'#home');
      }
    },{threshold:.5});
    const watch = () => rail.querySelectorAll('.listing-card[data-open-card]').forEach(card => {
      if (observed.has(card)) return;
      observed.add(card);
      viewport.observe(card);
    });
    watch();
    new MutationObserver(watch).observe(rail,{childList:true});
  };
  const before = renderList;
  renderList = async function () {
    try { await before(); }
    catch (error) {
      console.error('Listing page failed to load',error);
      layout('<section class="not-found" role="alert"><h1>Listings could not load</h1><p>Your work is still saved. Check your connection and try again.</p><button type="button" class="primary" id="retryListings">Try again</button></section>');
      document.querySelector('#retryListings').onclick = () => renderList();
      const kind=error?.status>=400&&error?.status<=599?`http_${error.status}`:error instanceof TypeError?'type':'other';
      VACANCY_BACKEND.recordError?.(`list_load_${kind}`,'#list');
      return;
    }
    const host = document.querySelector('#listingHost');
    const heading = document.querySelector('main:has(#listingHost) .section-head');
    if (!host || !heading || parseHash().name !== 'list') return;
    const creating = parseHash().id === 'new';
    host.dataset.mode = creating ? 'create' : 'dashboard';
    const manager = document.querySelector('.vacancy-manager-head');
    const mine = document.querySelector('#mine');
    const summary = document.querySelector('#ownerListSummary');
    if (creating) {
      heading.hidden = true;
      host.hidden = false;
      if (manager) manager.hidden = true;
      if (mine) mine.hidden = true;
      if (summary) summary.hidden = true;
      const openingKey = sessionStorage.getItem('vacancy-opening-draft');
      if (openingKey) {
        sessionStorage.removeItem('vacancy-opening-draft');
        let draft;try{draft=JSON.parse(localStorage.getItem(openingKey)||'null')}catch{}
        const start=host.querySelector('.listing-start');
        if(draft&&start){
          if(draft.scope?.startsWith('property-') && !window.__listingProperties?.some(property=>property.id===draft.scope.slice(9))){
            toast('This draft’s property is no longer available. The draft is still saved on this device.');
            return;
          }
          const type=String(draft.units?.[0]?.unitType||draft.shared?.propertyType||'').toLowerCase();
          const category=/shop|retail|commercial/.test(type)?'Shop':/house|maisonette|villa/.test(type)?'House':'Residential';
          start.querySelector(`[data-listing-type="${category}"]`)?.click();
          if(category==='Residential'){
            const preset=/2\s*(bed|bdrm)/.test(type)?'2 bedroom apartment':/1\s*(bed|bdrm)/.test(type)?'1 bedroom apartment':/studio/.test(type)?'Studio':'Room';
            start.querySelector(`[data-preset="${preset}"]`)?.click();
          }
          start.querySelector(`[data-add-mode="${draft.scope==='new-property'?'new':'existing'}"]`)?.click();
          if(draft.scope?.startsWith('property-')){
            const choice=host.querySelector('#propertyChoice');
            if(choice&&[...choice.options].some(option=>option.value===draft.scope.slice(9))){choice.value=draft.scope.slice(9);choice.dispatchEvent(new Event('change',{bubbles:true}))}
          }
          toast('Draft opened. Confirm the location and add photos before publishing.');
        }
      }
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    heading.hidden = false;
    heading.innerHTML = '<h1>Dashboard</h1><button type="button" class="primary" id="createNewListing">Create new listing</button>';
    heading.querySelector('#createNewListing').onclick = () => nav('list','new');
    host.hidden = true;
    if (summary) summary.remove();
    if (manager) {
      manager.hidden = false;
      const title = manager.querySelector('h2');
      if (title) title.innerHTML = 'Listings <strong id="vacancyCount">' + (document.querySelector('#vacancyCount')?.textContent || '0') + '</strong>';
    }
    if (mine) mine.hidden = false;
    const metrics = document.createElement('div');
    metrics.className = 'stat-grid owner-list-metrics';
    metrics.innerHTML = '<div class="stat"><strong>—</strong><span>Impressions</span></div><div class="stat"><strong>—</strong><span>Clicks</span></div><div class="stat"><strong>—</strong><span>Unread messages</span></div>';
    const range = document.createElement('div');
    range.className = 'owner-metric-range';
    range.innerHTML = '<label>Show activity for <select aria-label="Metrics period"><option value="today" selected>Today</option><option value="7">7 days</option><option value="30">30 days</option><option value="custom">Custom</option></select></label><label class="owner-custom-dates" hidden>From <input type="date" aria-label="Metrics from"></label><label class="owner-custom-dates" hidden>To <input type="date" aria-label="Metrics to"></label>';
    heading.after(range,metrics);
    const period=range.querySelector('select'),dates=range.querySelectorAll('input[type="date"]');
    const localDate=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const today=new Date();dates[0].value=localDate(new Date(today.getFullYear(),today.getMonth(),1));dates[1].value=localDate(today);
    let request=0;
    const load=()=>{
      const custom=period.value==='custom';range.querySelectorAll('.owner-custom-dates').forEach(label=>label.hidden=!custom);
      const end=custom?new Date(`${dates[1].value}T00:00:00`):new Date();
      if(!custom)end.setHours(0,0,0,0);
      end.setDate(end.getDate()+1);
      const start=custom?new Date(`${dates[0].value}T00:00:00`):new Date(end);
      if(!custom)start.setDate(start.getDate()-(period.value==='today'?1:Number(period.value)));
      if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end){metrics.title='Choose a valid date range';return}
      const current=++request;
      VACANCY_BACKEND.ownerDashboardMetrics(start.toISOString(),end.toISOString()).then(data=>{
        if(current!==request||!metrics.isConnected||!data||data.error)return;
        metrics.title='';
        for(const [index,key] of ['impressions','clicks','messages'].entries()){
          const value=Number(data[key]);
          if(Number.isFinite(value))metrics.children[index].querySelector('strong').textContent=value.toLocaleString();
        }
      }).catch(()=>{if(current===request)metrics.title='Metrics are temporarily unavailable'});
    };
    period.onchange=load;dates.forEach(input=>input.onchange=load);load();
  };
})();
