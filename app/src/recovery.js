// Recovery credentials stay in memory and never replace the normal session.
window.VACANCY_RECOVERY = (() => {
  const API = 'https://xtutkwiivqkgkqjpkxvj.supabase.co';
  const KEY = 'sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
  const params = new URLSearchParams(location.hash.slice(1));
  const callback = params.has('access_token') || params.has('error') || params.has('error_code');
  let token = params.get('type') === 'recovery' ? params.get('access_token') : null;
  let valid = false;
  let busy = false;
  if (callback) history.replaceState(null, '', location.pathname + location.search + '#reset-password');

  async function request(path, body, accessToken) {
    const response = await fetch(API + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(response.status === 429 ? 'Too many attempts. Please wait before trying again.' : data.message || data.msg || data.error_description || 'Unable to complete this request. Please try again.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function submit(form, action) {
    if (busy) return;
    busy = true;
    const button = form.querySelector('button');
    const status = form.querySelector('[role=status]');
    button.disabled = true;
    status.textContent = 'Please wait…';
    try { await action(status); }
    catch (error) { status.textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? 'Connection unavailable. Please try again.' : error.message; }
    finally { busy = false; button.disabled = false; }
  }

  function renderRequest() {
    layout('<section class="panel"><h1>Reset your password</h1><p>Enter your account email to request a reset link.</p><form id="recoveryRequest" class="form-grid"><label class="wide">Email<input name="email" type="email" required autocomplete="email"></label><button class="primary wide">Send reset link</button><p class="wide" role="status" aria-live="polite"></p></form><a href="#auth">Back to sign in</a></section>');
    const form = document.querySelector('#recoveryRequest');
    form.onsubmit = event => { event.preventDefault(); submit(form, async status => {
      // Only the current origin/path is used; no user-controlled redirect target.
      const redirect = location.origin + location.pathname + '#reset-password';
      await request('/auth/v1/recover?redirect_to=' + encodeURIComponent(redirect), { email: form.elements.email.value.trim() });
      status.textContent = 'If an account exists for that email, a reset link will be sent. Check your inbox.';
    }); };
  }

  async function renderReset() {
    layout('<section class="panel"><h1>Choose a new password</h1><p id="resetStatus" role="status">Checking your reset link…</p><div id="resetHost"></div></section>');
    const status = document.querySelector('#resetStatus');
    const host = document.querySelector('#resetHost');
    if (!token) { status.textContent = 'This reset link is invalid or expired. Request a new link.'; host.innerHTML = '<a href="#forgot-password">Request a new link</a>'; return; }
    try {
      await request('/auth/v1/user', undefined, token);
      valid = true;
    } catch (error) {
      valid = false;
      if (error.status === 401 || error.status === 403) token = null;
      status.textContent = token ? 'Unable to check this link. Check your connection and retry.' : 'This reset link is invalid or expired. Request a new link.';
      host.innerHTML = token ? '<button id="retryReset">Retry</button>' : '<a href="#forgot-password">Request a new link</a>';
      if (token) host.querySelector('button').onclick = renderReset;
      return;
    }
    if (!host.isConnected) return;
    status.textContent = 'Use at least 12 characters with upper and lowercase letters and a number.';
    host.innerHTML = '<form id="resetPassword" class="form-grid"><label class="wide">New password<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}"></label><label class="wide">Confirm password<input name="confirmation" type="password" required autocomplete="new-password"></label><button class="primary wide">Save new password</button><p class="wide" role="status" aria-live="polite"></p></form>';
    const form = host.querySelector('form');
    form.onsubmit = event => { event.preventDefault(); submit(form, async feedback => {
      if (!valid || !token) throw new Error('Request a new reset link.');
      if (form.elements.password.value !== form.elements.confirmation.value) throw new Error('Passwords do not match.');
      await request('/functions/v1/secure-password-reset', { password: form.elements.password.value }, token);
      token = null; valid = false; form.reset();
      host.innerHTML = '<p role="status">Password updated. Sign in with your new password.</p><a href="#auth">Sign in</a>';
    }); };
  }
  return { renderRequest, renderReset };
})();
