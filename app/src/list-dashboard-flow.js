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
      layout('<section class="not-found" role="alert"><h1>Listings could not load</h1><p>Your work is still saved. Check your connection and try again.</p><button type="button" class="primary" id="retryListings">Try again</button></section>');
      document.querySelector('#retryListings').onclick = () => renderList();
      VACANCY_BACKEND.recordError?.('list_load_failed','#list');
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
    metrics.innerHTML = '<div class="stat"><strong>—</strong><span>Impressions</span></div><div class="stat"><strong>—</strong><span>Clicks</span></div><div class="stat"><strong>—</strong><span>Messages</span></div>';
    heading.after(metrics);
    VACANCY_BACKEND.ownerDashboardMetrics().then(data => {
      if (!metrics.isConnected || !data || data.error) return;
      for (const [index,key] of ['impressions','clicks','messages'].entries()) {
        const value = Number(data[key]);
        if (Number.isFinite(value)) metrics.children[index].querySelector('strong').textContent = value.toLocaleString();
      }
    }).catch(() => { metrics.title = 'Metrics are temporarily unavailable'; });
  };
})();
