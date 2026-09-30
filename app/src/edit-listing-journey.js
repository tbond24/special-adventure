(() => {
  const beforeEdit = renderEdit;
  renderEdit = async function (id) {
    await beforeEdit(id);
    const form = document.querySelector('#editListingForm');
    if (!form || form.dataset.editRestart) return;
    form.dataset.editRestart = 'true';
    form.classList.add('edit-restart');

    const shell = form.closest('.panel');
    shell?.classList.add('edit-restart-page');
    if (shell?.querySelector('h1')) shell.querySelector('h1').textContent = 'Edit listing';
    shell?.querySelector(':scope > .muted')?.remove();
    shell?.querySelectorAll('.edit-property-pill,.edit-add-unit').forEach(node => node.remove());

    const sections = [...form.querySelectorAll(':scope > .unified-edit-section')];
    const actions = form.querySelector('#cancelEdit')?.closest('.row');
    if (!sections.length || !actions) return;
    form.querySelector(':scope > .edit-listing-stepper')?.remove();

    const stages = ['Location', 'Listing details', 'Review'].map((name, index) => {
      const stage = document.createElement('section');
      stage.className = 'edit-restart-stage';
      stage.dataset.editRestartStep = String(index);
      stage.innerHTML = `<div class="journey-stage-heading"><button type="button" class="journey-back" aria-label="Previous step">←</button><h2 class="journey-current-title">${name}</h2></div><div class="edit-restart-body"></div>`;
      form.append(stage);
      return stage;
    });
    const location = stages[0].querySelector('.edit-restart-body');
    const details = stages[1].querySelector('.edit-restart-body');
    const review = stages[2].querySelector('.edit-restart-body');
    const locationFields = new Set(['region','city','locality','landmark','postal','marketCode','country','address','publicLatitude','publicLongitude']);
    const propertyOptions = document.createElement('details');
    propertyOptions.className = 'edit-restart-options';
    propertyOptions.innerHTML = '<summary>Property options</summary><div></div>';

    sections.forEach(section => {
      const body = section.querySelector(':scope > .composer-section-body');
      for (const child of [...body.children]) {
        if (child.matches('.section-continue')) continue;
        const nodes = child.matches('.edit-form-group') ? [...child.querySelector('.edit-form-group-body').children] : [child];
        for (const node of nodes) {
          const names = [...node.querySelectorAll('[name]')].map(field => field.name);
          if (node.matches('[name]')) names.push(node.name);
          if (section.dataset.editSection === 'property') {
            (names.some(name => locationFields.has(name)) ? location : propertyOptions.lastElementChild).append(node);
          } else details.append(node);
        }
      }
      section.remove();
    });
    if (propertyOptions.lastElementChild.children.length) details.append(propertyOptions);
    const comparison = form.querySelector(':scope > .listing-compare-editor');
    if (comparison) details.append(comparison);
    review.append(actions);
    const reviewSummary = document.createElement('div');
    reviewSummary.className = 'edit-restart-summary';
    review.prepend(reviewSummary);

    for (const [index, stage] of stages.entries()) {
      const back = stage.querySelector('.journey-back');
      back.hidden = index === 0;
      back.onclick = () => show(index - 1);
      if (index < 2) {
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'primary edit-restart-next';
        next.textContent = 'Continue';
        next.onclick = () => {
          const invalid = [...stage.querySelectorAll('[required]')].find(field => !field.checkValidity());
          if (invalid) { invalid.closest('details')?.setAttribute('open',''); invalid.reportValidity(); return; }
          show(index + 1);
        };
        stage.append(next);
      }
    }
    let current = 0;
    function show(index) {
      current = index;
      stages.forEach((stage, position) => { stage.hidden = position !== index; });
      if (index === 0) requestAnimationFrame(() => form.querySelector('#editPropertyMap')?._vacancyInvalidateSize?.());
      if (index === 2) {
        const value = name => form.elements[name]?.value?.trim() || '';
        const title = value('roomName') || 'Untitled listing';
        const place = [value('locality'),value('city')].filter(Boolean).join(', ');
        const amount = Number(value('rentAmount').replace(/,/g,''));
        const photos = form.querySelectorAll('.media-manager [data-media-id]').length + selectedPhotoFiles(form.elements.images).length;
        reviewSummary.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(place)}</p><p>${escapeHtml(value('rentCurrency'))} ${Number.isFinite(amount) ? amount.toLocaleString() : '0'} / ${escapeHtml(value('rentPeriod'))}</p><p>${photos} ${photos === 1 ? 'photo' : 'photos'}</p>`;
      }
      window.scrollTo({top:0,behavior:'instant'});
    }
    form.addEventListener('invalid', event => {
      const stage = event.target.closest('.edit-restart-stage');
      if (stage && stage !== stages[current]) {
        show(stages.indexOf(stage));
        event.target.closest('details')?.setAttribute('open','');
        requestAnimationFrame(() => event.target.focus());
      }
    }, true);
    form.addEventListener('submit', event => {
      if (current === 2) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    show(0);
  };
})();
