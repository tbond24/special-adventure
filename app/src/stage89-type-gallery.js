(() => {
  function enhanceTypeSelector() {
    const control = document.querySelector('.map-type-filter');
    const current = control?.querySelector('.map-type-current');
    const choices = control?.querySelector('.map-type-choices');
    if (!current || !choices || choices.dataset.stage89Ready) return;
    choices.dataset.stage89Ready = 'true';

    const setSelected = value => {
      choices.querySelectorAll('[data-map-type]').forEach(button => {
        const selected = button.dataset.mapType === value;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      current.classList.toggle('has-selection', value !== 'all');
      current.dataset.mapType = value;
    };

    setSelected('all');
    choices.addEventListener('click', event => {
      const button = event.target.closest('[data-map-type]');
      if (button) setSelected(button.dataset.mapType);
    });
  }

  function enhanceGallery(gallery) {
    if (gallery.dataset.stage89Swipe) return;
    gallery.dataset.stage89Swipe = 'true';
    let pointerId = null;
    let startX = 0;
    let startLeft = 0;
    let startIndex = 0;
    let dragged = false;

    gallery.addEventListener('pointerdown', event => {
      if (event.button !== 0 || gallery.children.length < 2) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startLeft = gallery.scrollLeft;
      startIndex = Math.round(startLeft / Math.max(1, gallery.clientWidth));
      dragged = false;
      gallery.classList.add('is-swiping');
      try { gallery.setPointerCapture(pointerId); } catch {}
    });

    gallery.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 6) dragged = true;
      if (!dragged) return;
      gallery.scrollLeft = startLeft - delta;
      if (event.cancelable) event.preventDefault();
    });

    const finish = event => {
      if (pointerId !== event.pointerId) return;
      const delta = event.clientX - startX;
      const width = Math.max(1, gallery.clientWidth);
      let index = Math.round(gallery.scrollLeft / width);
      if (Math.abs(delta) > 28) index = startIndex + (delta < 0 ? 1 : -1);
      index = Math.max(0, Math.min(gallery.children.length - 1, index));
      try { gallery.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      gallery.classList.remove('is-swiping');
      gallery.scrollTo({left: index * width, behavior: 'smooth'});
    };
    gallery.addEventListener('pointerup', finish);
    gallery.addEventListener('pointercancel', finish);
    gallery.addEventListener('dragstart', event => event.preventDefault());
  }

  function enhanceGalleries() {
    document.querySelectorAll('.listing-card [data-gallery]').forEach(enhanceGallery);
  }

  const bindCardsBefore89 = bindCards;
  bindCards = function() {
    bindCardsBefore89();
    enhanceGalleries();
  };

  const renderHomeBefore89 = renderHome;
  renderHome = function() {
    renderHomeBefore89();
    enhanceTypeSelector();
    enhanceGalleries();
  };
})();
