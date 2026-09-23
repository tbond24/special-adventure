(() => {
  function avatarMarkup(owner, sizeClass = '') {
    const name = String(owner?.displayName || 'Vacancy member').trim() || 'Vacancy member';
    const initial = escapeHtml(name.charAt(0).toUpperCase());
    const image = owner?.avatarUrl ? '<img src="' + escapeHtml(owner.avatarUrl) + '" alt="">' : '';
    return '<span class="lister-avatar ' + sizeClass + '" aria-hidden="true"><span>' + initial + '</span>' + image + '</span>';
  }

  function bindAvatarFallbacks(scope = document) {
    scope.querySelectorAll('.lister-avatar img').forEach(image => {
      image.addEventListener('error', () => image.remove(), {once: true});
    });
  }

  function listerRows(ownerId) {
    return vacancies.filter(item => String(item?.owner?.id || '') === String(ownerId || ''));
  }

  window.renderListerProfile = function(ownerId) {
    const rows = listerRows(ownerId);
    const owner = rows[0]?.owner;
    if (!owner) {
      layout('<div class="empty">This lister has no current published vacancies.</div>');
      return;
    }
    const name = owner.displayName || 'Vacancy member';
    layout('<section class="lister-profile-page"><header class="lister-profile-header">' +
      avatarMarkup(owner, 'lister-avatar-large') +
      '<div><h1>' + escapeHtml(name) + '</h1><p class="muted">Lister on Vacancy</p></div></header>' +
      '<div class="lister-rating-status"><span>Ratings</span><span>Not available yet</span></div>' +
      '<div class="section-head"><h2>Current listings</h2><span class="muted">' + rows.length + '</span></div>' +
      '<section class="grid" id="listerListings">' + rows.map(card).join('') + '</section></section>');
    bindAvatarFallbacks();
    bindCards();
  };

  const detailBefore90 = renderDetail;
  renderDetail = function(id) {
    detailBefore90(id);
    const vacancy = vacancies.find(item => item.id === id);
    const locationSection = document.querySelector('#listingLocationSection');
    if (!vacancy || !locationSection) return;
    const owner = vacancy.owner || {};
    const name = owner.displayName || 'Vacancy member';
    const profile = document.createElement('button');
    profile.type = 'button';
    profile.className = 'listing-lister-card';
    profile.setAttribute('aria-label', 'View listings from ' + name);
    profile.innerHTML = avatarMarkup(owner) +
      '<span class="listing-lister-copy"><small>Listed by</small><span>' + escapeHtml(name) + '</span></span>' +
      '<svg class="control-icon" aria-hidden="true"><use href="#icon-chevron"></use></svg>';
    profile.onclick = () => nav('lister', owner.id);
    locationSection.insertAdjacentElement('afterend', profile);
    bindAvatarFallbacks(profile);
    const message = document.querySelector('#enquire');
    if (message) {
      message.textContent = 'Message';
      message.setAttribute('aria-label', 'Message lister');
    }
  };
})();
