// Development only. Feed sample records through the real Find renderer.
(() => {
  document.documentElement.setAttribute('data-preview-grid', '');
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#home');
  let backend, scenario = 'normal', firstRead = true;
  const source = fetch('/__preview/find-listings.json').then(response => {
    if (!response.ok) throw Error('Sample listings unavailable');
    return response.json();
  });
  function rowsFrom(records) {
    if (scenario === 'empty') return [];
    const first = structuredClone(records[0]);
    if (scenario === 'long') {
      first.room.name = 'A very long sample room name for checking text growth';
      first.property.suburb = 'AnUnbrokenSampleLocationThatMustNeverWidenTheCardOrThePage';
    }
    return scenario === 'one' ? [first] : [first, {...structuredClone(records[0]), id:'60000000-0000-4000-8000-000000000009', room:{...structuredClone(records[0].room), name:'Synthetic second room'}}];
  }
  Object.defineProperty(window, 'VACANCY_BACKEND', {configurable:true, get:() => backend, set(value) {
    backend = value;
    // Fail closed for every unspecified method, including Auth and writes.
    for (const [name, method] of Object.entries(backend)) if (typeof method === 'function') {
      backend[name] = async () => { throw Error('Unavailable in sample Find: ' + name); };
    }
    for (const name of ['trackEvent','recordError','recordListerJourney','recordConnectedJourney','recordRenterJourney','recordElementTracking','recordVisitorPresence','recordSiteEngagement','consumeOAuthCallback']) backend[name] = () => {};
    for (const name of ['siteIconOverrides','siteIconSlots','faviconConfig','listingDisplayOptions','siteAppearancePublished','savedIds','blockedUsers']) backend[name] = async () => [];
    for (const name of ['renterAnalyticsPolicy','elementTrackingPolicy']) backend[name] = async () => ({enabled:false});
    backend.currentUser = async () => null;
    backend.adminMembership = async () => false;
    backend.session = () => null;
    backend.assuranceLevel = () => 'aal1';
    backend.googleProviderReady = () => false;
    backend.activeVacancies = async () => {
      const records = await source;
      if (firstRead) { marketCode = 'KE'; displayCurrency = 'KES'; firstRead = false; }
      return rowsFrom(records);
    };
  }});
  window.VACANCY_FIND_PREVIEW = Object.freeze({
    async setScenario(next) {
      if (!['normal','long','one','empty'].includes(next)) throw Error('Unknown sample scenario');
      scenario = next;
      await refreshVacancies();
      applySearch();
    }
  });
})();
