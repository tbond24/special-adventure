// Local state demonstrations only: no backend, storage or network actions.
(() => {
  const button = document.querySelector('#loading-example');
  const feedback = document.querySelector('#action-feedback');
  button.onclick = () => {
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    feedback.textContent = 'Loading preview…';
    setTimeout(() => {
      button.disabled = false; button.setAttribute('aria-busy', 'false');
      feedback.textContent = 'Ready. The button kept its shape.';
    }, 1800);
  };
  document.querySelector('#secondary-example').onclick = () => { feedback.textContent = 'Secondary action preview.'; };
  const save = document.querySelector('#save-example');
  save.onclick = () => {
    const on = save.getAttribute('aria-pressed') !== 'true';
    save.setAttribute('aria-pressed', String(on));
    save.setAttribute('aria-label', on ? 'Unsave sample listing' : 'Save sample listing');
  };
  const stress = document.querySelector('#long-content');
  stress.onclick = () => {
    const on = stress.getAttribute('aria-pressed') !== 'true';
    stress.setAttribute('aria-pressed', String(on));
    stress.querySelectorAll('span')[1].textContent = on ? 'Use the shorter title' : 'Try a long title';
    document.querySelector('#sample-listing-title').textContent = on
      ? 'A bright studio with a private balcony, generous storage and an exceptionallylongunbrokenwordthatmuststayinsidethecard'
      : 'Bright studio with a private balcony';
  };
})();
