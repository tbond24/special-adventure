// The guest dashboard reads only the active, unclaimed device draft. Account
// inventory and analytics continue through their existing signed-in renderer.
(() => {
  const beforeList = renderList;
  renderList = async function (...args) {
    const route = parseHash();
    if (currentUser && !currentUser.is_anonymous || route.name !== 'list' || route.id === 'new') {
      return beforeList.apply(this, args);
    }
    const ownerAtStart = currentUser?.id || null;
    layout('<section><div class="section-head"><h1>Dashboard</h1></div><div id="listingHost" data-mode="dashboard" hidden></div><div id="mine"><div class="empty" role="status">Loading draft…</div></div></section>');
    const host = document.querySelector('#mine');
    const current = () => host.isConnected && parseHash().name === 'list' && parseHash().id !== 'new' && (!currentUser || currentUser.is_anonymous) && (currentUser?.id || null) === ownerAtStart;
    try {
      const draft = await VACANCY_GUEST_DRAFT.dashboardDraft();
      if (!current()) return;
      if (!draft) {
        host.innerHTML = '<div class="empty">No device-saved drafts.</div><button type="button" class="primary" id="createGuestListing">Create new listing</button>';
        host.querySelector('#createGuestListing').onclick = () => nav('list', 'new');
        return;
      }
      host.innerHTML = '<article class="room-manage local-draft-row"><div class="room-manage-copy"><strong>' + escapeHtml(draft.title) + '</strong><div class="muted">Draft saved on this device</div></div><div class="room-manage-actions"><button type="button" class="ghost" data-resume-guest-draft>Resume</button></div></article>';
      host.querySelector('[data-resume-guest-draft]').onclick = () => nav('list', 'new');
    } catch (error) {
      if (!current()) return;
      host.innerHTML = '<div class="empty" role="alert">' + escapeHtml(error.message) + '</div><button type="button" class="ghost" id="retryGuestDraft">Try again</button>';
      host.querySelector('#retryGuestDraft').onclick = () => renderList();
    }
  };
})();
