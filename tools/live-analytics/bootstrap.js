var currentUser=null;
window.escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// No optional collectors or unsupported custom metrics in this viewer.
window.VACANCY_TRACKING={catalog:[]};
window.VACANCY_ANALYTICS_PREFERENCES=Object.freeze({disabled:true});
if(location.hash!=='#admin')history.replaceState(null,'','#admin');
