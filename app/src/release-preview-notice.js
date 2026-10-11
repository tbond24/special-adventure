// This notice is preview-host-only and does not alter the live site's layout.
(() => {
  const host=location.hostname;
  if(!host.endsWith('.vercel.app')||host==='vacancy-tbond24s-projects.vercel.app')return;
  const note=document.createElement('aside');note.setAttribute('aria-label','Preview information');note.setAttribute('role','note');
  note.style.cssText='padding:10px 16px;background:#fff3d6;color:#3d3015;font:14px/1.5 system-ui;border-bottom:1px solid #dac99c';
  note.textContent='Review preview · Uses Vacancy’s live accounts and database. Signed-in drafts are real account drafts; Publish creates a live listing. Existing email/password sign-in stays here. Google or email links may return to the live site.';
  document.body.prepend(note);
})();
