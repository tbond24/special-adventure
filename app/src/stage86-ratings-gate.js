(() => {
  // The You page does not show an unavailable-ratings placeholder.
  const adminBeforeRatings=renderAdmin;
  renderAdmin=async function(){await adminBeforeRatings();const host=document.querySelector('#adminHost');if(!host||host.classList.contains('empty'))return;try{const data=await VACANCY_BACKEND.ratingReadiness(),notice=document.createElement('section');notice.className='admin-health ratings-readiness';notice.innerHTML=`<span class="health-dot"></span><strong>Ratings ${data.enabled?'enabled':'safely off'}</strong><span>${escapeHtml(data.public_message||'')}</span>`;host.prepend(notice)}catch{}}
})();
