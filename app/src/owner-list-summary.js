// Keep intermediate listing layouts covered until the final page is ready.
(() => {
  const before = renderList;
  renderList = async function () {
    const loading=document.createElement('section');
    loading.className='loading-screen listing-transition-loading';
    loading.setAttribute('role','status');
    loading.setAttribute('aria-label','Loading your listings');
    loading.innerHTML='<span class="loading-logo-stack" role="img" aria-label="Vacancy"><img class="loading-logo" src="assets/vacancy-logo.png" alt=""></span><div class="loading-line"><i></i></div>';
    document.body.append(loading);
    try {
      await before();
    }
    finally { loading.remove(); }
  };
})();
