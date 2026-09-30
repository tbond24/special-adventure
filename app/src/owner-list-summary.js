// Keep the owner overview with the existing listing manager, using its current data source.
(() => {
  const before = renderList;
  renderList = async function () {
    const app = document.querySelector('#app');
    app?.classList.add('listing-page-loading');
    try {
      await before();
      const manager = document.querySelector('.vacancy-manager-head');
      if (!manager || !currentUser || currentUser.is_anonymous) return;
      const rows = await VACANCY_BACKEND.myVacancies();
      if (!manager.isConnected || document.querySelector('#ownerListSummary')) return;
      const summary = document.createElement('div');
      summary.id = 'ownerListSummary';
      summary.className = 'owner-list-summary';
      const active = rows.filter(row => row.status === 'active').length;
      const paused = rows.filter(row => row.status === 'paused').length;
      summary.innerHTML = `<h2>Your dashboard</h2><div><span><strong>${rows.length}</strong> listings</span><span><strong>${active}</strong> active</span><span><strong>${paused}</strong> paused</span></div>`;
      manager.before(summary);
    } catch { /* The listing manager already presents load errors. */ }
    finally { app?.classList.remove('listing-page-loading'); }
  };
})();
