// Injected by the isolated server only; never included in product assets.
(() => {
  if (document.querySelector('#vacancy-preview-tools')) return;
  const host = document.createElement('div');
  host.id = 'vacancy-preview-tools';
  const ui = host.attachShadow({mode:'open'});
  ui.innerHTML = `<style>
    :host{position:fixed;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483647;font:12px/1.4 system-ui;color:#fff;max-width:calc(100vw - 16px)}
    @media(max-width:820px){:host{bottom:calc(80px + env(safe-area-inset-bottom))}}
    details{border:1px solid #657184;border-radius:10px;background:#19212e;box-shadow:0 2px 12px #0003;max-width:310px}
    summary{padding:8px 10px;cursor:pointer;overflow-wrap:anywhere}section{padding:0 10px 10px;display:grid;gap:8px}p{margin:0;overflow-wrap:anywhere}
    button{font:inherit;min-height:36px;padding:7px 10px;background:#fff;color:#19212e;border:0;border-radius:6px;cursor:pointer}button[hidden]{display:none}
  </style><details><summary><span id="revision">Preview · connecting</span></summary><section>
    <p id="source"></p><p id="status" role="status">Connecting to this workspace…</p>
    <button id="pause" type="button" aria-pressed="false">Pause updates</button>
    <button id="apply" type="button" hidden>Apply update</button>
  </section></details>`;
  document.body.append(host);
  const label = ui.querySelector('#revision'), status = ui.querySelector('#status');
  const pause = ui.querySelector('#pause'), apply = ui.querySelector('#apply');
  let viewed, latest, paused = false, dirty = false, busy = false, timer;
  const editable = element => element instanceof Element && element.matches('input,textarea,select,[contenteditable="true"]');
  const editing = () => dirty || editable(document.activeElement);
  function message(text) { if (status.textContent !== text) status.textContent = text; }
  function applied(snapshot) {
    viewed = snapshot;
    label.textContent = 'Preview · ' + snapshot.revision;
    apply.hidden = true;
    message(paused ? 'Updates paused.' : 'Up to date · sample data only.');
  }
  function offerReload() {
    apply.hidden = false;
    apply.textContent = editing() ? 'Reload — clears unsaved input' : 'Reload preview';
    message('Code update ready. Reload when you’re ready.');
    ui.querySelector('details').open = true;
  }
  async function update() {
    if (!latest || latest.revision === viewed?.revision) return;
    if (paused) {
      message('Update ready · automatic updates paused.'); apply.hidden = false;
      apply.textContent = latest.reloadRevision !== viewed.reloadRevision && editing() ? 'Reload — clears unsaved input' : 'Apply update';
      return;
    }
    if (latest.reloadRevision !== viewed.reloadRevision) {
      if (editing()) { offerReload(); return; }
      location.reload(); return;
    }
    const snapshot = latest;
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].filter(link => new URL(link.href).origin === location.origin);
    const changed = links.filter(link => {
      const pathname = new URL(link.href).pathname;
      return snapshot.styles[pathname] !== viewed.styles[pathname];
    });
    if (changed.some(link => !snapshot.styles[new URL(link.href).pathname])) { offerReload(); return; }
    const replacements = [];
    try {
      await Promise.all(changed.map(link => new Promise((resolve, reject) => {
        const next = link.cloneNode(), url = new URL(link.href);
        url.searchParams.set('__preview', snapshot.styles[url.pathname]);
        next.href = url.href;
        const timeout = setTimeout(() => reject(Error('Style update timed out')), 10000);
        next.onload = () => { clearTimeout(timeout); resolve(); };
        next.onerror = () => { clearTimeout(timeout); reject(Error('Style update failed')); };
        replacements.push({link, next});
        // Keep the old stylesheet active until every replacement has loaded.
        link.after(next);
      })));
      for (const {link} of replacements) link.remove();
      applied(snapshot);
    } catch {
      for (const {next} of replacements) next.remove();
      message('Style update failed. Keeping the current page; retrying.');
    }
  }
  async function check() {
    clearTimeout(timer);
    if (document.hidden || busy) return;
    busy = true;
    try {
      const response = await fetch('/__preview/status', {cache:'no-store', signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw Error('Preview unavailable');
      latest = await response.json();
      ui.querySelector('#source').textContent = latest.source;
      if (!viewed) {
        // The page's initial HTML snapshot closes the save-during-load race.
        const initial = document.querySelector('meta[name="vacancy-preview-revision"]')?.content;
        viewed = initial && initial !== latest.revision ? {revision:initial, reloadRevision:'initial', styles:{}} : latest;
        label.textContent = 'Preview · ' + viewed.revision;
      }
      if (latest.revision === viewed.revision) applied(viewed);
      else await update();
    } catch { message('Preview disconnected · reconnecting when available.'); }
    finally { busy = false; if (!document.hidden) timer = setTimeout(check, 1000); }
  }
  document.addEventListener('input', event => { if (editable(event.target)) dirty = true; }, true);
  document.addEventListener('change', event => { if (editable(event.target)) dirty = true; }, true);
  pause.onclick = () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'Resume updates' : 'Pause updates';
    if (paused) message('Updates paused.');
    else if (!busy) { busy = true; update().finally(() => { busy = false; check(); }); }
  };
  apply.onclick = () => {
    if (latest?.reloadRevision !== viewed?.reloadRevision) location.reload();
    else { paused = false; pause.setAttribute('aria-pressed', 'false'); pause.textContent = 'Pause updates'; check(); }
  };
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden) check(); });
  addEventListener('pagehide', () => clearTimeout(timer));
  check();
})();
