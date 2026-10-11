// Preserve only the listing composer destination across sign-in in this tab.
// No URL supplied by storage or a query string is ever used as a destination.
window.VACANCY_LISTING_AUTH_RETURN = (() => {
  const key = 'vacancy-listing-auth-return-v1';
  const lifetime = 30 * 60 * 1000;
  function clear() { try { sessionStorage.removeItem(key); } catch {} }
  function remember() {
    if (location.hash !== '#list/new') return;
    try { sessionStorage.setItem(key, String(Date.now())); } catch {}
  }
  function take() {
    let started = 0;
    try { started = Number(sessionStorage.getItem(key)); } catch {}
    clear();
    const age = Date.now() - started;
    return started > 0 && age >= 0 && age < lifetime ? 'list/new' : 'home';
  }
  // Leaving sign-in deliberately cancels the pending composer destination.
  function cancelIfLeaving() {
    const callback = new URLSearchParams(location.hash.slice(1));
    if (callback.has('access_token') || callback.has('error') || callback.has('error_code')) return;
    if (!['#list/new', '#auth', '#forgot-password', '#reset-password'].includes(location.hash)) clear();
  }
  cancelIfLeaving();
  window.addEventListener('hashchange', cancelIfLeaving);
  return {remember, take};
})();
