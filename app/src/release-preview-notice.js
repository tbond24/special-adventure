// Dedicated isolated preview branch only. Never announce real accounts here.
(() => {
  const note = document.createElement('aside');
  note.setAttribute('role', 'note');
  note.setAttribute('aria-label', 'Isolated synthetic preview');
  note.style.cssText = 'padding:12px 20px;background:#fff3d6;color:#3d3015;font:14px/1.5 system-ui;border-bottom:1px solid #dac99c';
  note.textContent = 'ISOLATED VISUAL PREVIEW — Synthetic data and mock editor changes only. No production accounts, database access or real publishing. Do not enter passwords or customer information.';
  document.body.prepend(note);
})();
