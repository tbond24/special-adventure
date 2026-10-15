// Visibility switches apply only to existing listing elements; icon artwork remains in the icon library.
(() => {
  const options = new Map();
  const isVisible = slot => options.get(slot) !== false;
  const apply = () => { document.documentElement.dataset.cardServices = isVisible('card-services') ? 'on' : 'off'; };
  async function refresh() {
    try {
      const rows = await VACANCY_BACKEND.listingDisplayOptions();
      options.clear();
      rows.forEach(row => options.set(row.slot, row.enabled));
      apply();
      return rows;
    } catch { return []; }
  }
  window.VACANCY_LISTING_OPTIONS = {isVisible, refresh, ready:refresh()};

  const beforeAdmin = renderAdmin;
  renderAdmin = async function () {
    await beforeAdmin();
    if (!currentUser || VACANCY_BACKEND.assuranceLevel() !== 'aal2') return;
    const host = document.querySelector('#adminHost');
    if (!host || host.classList.contains('empty') || host.querySelector('#listingDisplayOptions')) return;
    const panel = document.createElement('section');
    panel.id = 'listingDisplayOptions';
    panel.className = 'panel listing-display-options';
    (host.querySelector('[data-admin-section="icons"]') || host).append(panel);
    await window.mountVacancyListingDisplay(panel);

  };

  window.mountVacancyPriceComparison = async function (id, form) {
    if (!form || form.querySelector('.listing-compare-editor')) return;
    try {
      const record = await VACANCY_BACKEND.listingComparePrice(id);
      if (!record || !form.isConnected || form.querySelector('.listing-compare-editor')) return;
      if (form.dataset.editVacancy && form.dataset.editVacancy !== id) return;
      const editor = document.createElement('section');
      editor.className = 'listing-compare-editor wide';
      editor.innerHTML = `<h2>Previous price</h2><p class="muted">Save the current rent first. Then enter a higher former price in the same currency and rent period.</p><label>Former rent<input type="number" min="0" step="0.01" value="${Number(record.compare_price) > 0 ? Number(record.compare_price) : ''}"></label><label class="listing-compare-toggle"><input type="checkbox" ${record.show_compare_price ? 'checked' : ''}> Show crossed-out former price</label><button type="button" class="ghost">Save price comparison</button><p role="status"></p>`;
      (form.querySelector('.unit-editor') || form).append(editor);
      editor.querySelector('button').onclick = async () => {
        const amount = Number(editor.querySelector('input[type="number"]').value);
        const enabled = editor.querySelector('input[type="checkbox"]').checked;
        const status = editor.querySelector('[role="status"]');
        if (enabled && (!Number.isFinite(amount) || amount <= Number(record.rent_amount))) { status.textContent = 'Former rent must be higher than the saved current rent.'; return; }
        const button = editor.querySelector('button');
        button.disabled = true;
        try {
          const result = await VACANCY_BACKEND.setListingComparePrice(id, amount || null, enabled);
          if (!Array.isArray(result) || !result.length) throw new Error('Could not update this listing.');
          status.textContent = 'Price comparison saved.';
        } catch (error) { status.textContent = error.message || 'Could not save comparison price.'; }
        finally { button.disabled = false; }
      };
    } catch { /* The existing edit flow remains available if this optional control fails. */ }
  };

  const beforeEdit = renderEdit;
  renderEdit = async function (id) {
    await beforeEdit(id);
    await window.mountVacancyPriceComparison(id, document.querySelector('#editListingForm'));
  };
})();
