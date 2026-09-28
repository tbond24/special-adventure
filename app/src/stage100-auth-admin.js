(() => {
  const icon=name=>'<svg class="control-icon" aria-hidden="true"><use href="#icon-'+name+'"></use></svg>';
  function enhanceForm(form) {
    if (!form || form.dataset.credentialEnhanced) return;
    form.dataset.credentialEnhanced='true';
    const fields=[...form.querySelectorAll('input[type="email"],input[type="password"],input[name="name"]')];
    const refresh=input=>{
      const label=input.closest('label');
      if(!label)return;
      const active=input.dataset.touched==='true';
      const complete=active&&input.value.trim()!==''&&input.checkValidity();
      label.classList.toggle('credential-complete',complete);
      label.classList.toggle('credential-error',active&&input.value.trim()!==''&&!input.checkValidity()&&document.activeElement!==input);
    };
    const password=form.querySelector('input[name="password"]');
    const confirmation=form.querySelector('input[name="confirmation"]');
    function checkMatch(){
      if(!confirmation)return;
      confirmation.setCustomValidity(confirmation.value&&password.value!==confirmation.value?'Passwords do not match':'');
      refresh(confirmation);
    }
    for(const input of fields){
      input.addEventListener('input',()=>{input.dataset.touched='true';if(input===password)checkMatch();else if(input===confirmation)checkMatch();refresh(input)});
      input.addEventListener('blur',()=>{input.dataset.touched='true';refresh(input)});
      input.addEventListener('focus',()=>refresh(input));
      if(input.type!=='password')continue;
      const wrap=document.createElement('span');wrap.className='password-control';
      input.before(wrap);wrap.append(input);
      const button=document.createElement('button');button.type='button';button.className='password-eye';button.setAttribute('aria-label','Show password');button.setAttribute('aria-pressed','false');button.innerHTML=icon('eye');
      wrap.append(button);
      button.onclick=()=>{
        const visible=input.type==='text';
        input.type=visible?'password':'text';
        button.setAttribute('aria-label',visible?'Show password':'Hide password');
        button.setAttribute('aria-pressed',String(!visible));
        button.innerHTML=icon(visible?'eye':'eye-off');
        input.focus({preventScroll:true});
      };
    }
    if(form.id==='authUnified'){
      form.querySelector('.auth-mode-switch')?.addEventListener('click',()=>{
        for(const field of fields){delete field.dataset.touched;field.closest('label')?.classList.remove('credential-complete','credential-error')}
      });
    }
  }
  const priorAuth=renderAuth;
  renderAuth=function(){priorAuth();enhanceForm(document.querySelector('#authUnified'))};
  const priorRequest=VACANCY_RECOVERY.renderRequest;
  VACANCY_RECOVERY.renderRequest=function(){priorRequest();enhanceForm(document.querySelector('#recoveryRequest'))};
  const priorReset=VACANCY_RECOVERY.renderReset;
  VACANCY_RECOVERY.renderReset=async function(){await priorReset();enhanceForm(document.querySelector('#resetPassword'))};

  const priorAdmin=renderAdmin;
  renderAdmin=async function(){
    await priorAdmin();
    const host=document.querySelector('#adminHost');
    if(!host||host.classList.contains('empty')||document.querySelector('#adminSectionMenu'))return;
    const sections=[
      ['overview','Overview'],['activity','Activity'],['people','People & listings'],
      ['reports','Reports'],['system','System'],['icons','Appearance']
    ];
    const buckets=new Map(sections.map(([key])=>[key,[]]));
    for(const child of [...host.children]){
      const title=child.querySelector('h2')?.textContent?.trim()||'';
      const bucket=child.id==='siteIconLibrary'?'icons':
        child.id==='operationalHealth'?'system':
        child.classList.contains('admin-metrics-panel')?'activity':
        child.classList.contains('admin-search-panel')?'people':
        title==='Report queue'||title==='Moderation history'?'reports':'overview';
      buckets.get(bucket).push(child);
    }
    const menu=document.createElement('nav');menu.id='adminSectionMenu';menu.className='admin-section-menu';menu.setAttribute('aria-label','Admin sections');
    const select=document.createElement('select');select.className='admin-section-select';select.setAttribute('aria-label','Choose admin section');
    for(const [key,label] of sections){
      const button=document.createElement('button');button.type='button';button.dataset.section=key;button.textContent=label;menu.append(button);
      const option=document.createElement('option');option.value=key;option.textContent=label;select.append(option);
      const group=document.createElement('section');group.className='admin-section';group.dataset.adminSection=key;group.setAttribute('aria-label',label);
      const children=buckets.get(key);
      if(children.length){
        if(key==='overview'){
          const fold=document.createElement('details');fold.className='admin-fold';fold.open=true;
          const summary=document.createElement('summary');summary.textContent='Marketplace snapshot';
          fold.append(summary,...children);group.append(fold);
        }else if(key==='reports'||key==='system'){
          for(const child of children){
            const fold=document.createElement('details');fold.className='admin-fold';fold.open=true;
            const summary=document.createElement('summary');
            summary.textContent=child.querySelector('h2')?.textContent?.trim()||({overview:'Marketplace snapshot',system:'System status',reports:'Activity'}[key]);
            fold.append(summary,child);group.append(fold);
          }
        }else group.append(...children);
      }else group.innerHTML='<p class="muted">Nothing to show in this section yet.</p>';
      host.append(group);
    }
    host.before(menu,select);
    let selected='overview';
    try{selected=sessionStorage.getItem('vacancy-admin-section')||'overview'}catch{}
    if(!buckets.has(selected))selected='overview';
    const show=key=>{
      for(const group of host.querySelectorAll('.admin-section'))group.hidden=group.dataset.adminSection!==key;
      for(const button of menu.querySelectorAll('button'))button.setAttribute('aria-current',button.dataset.section===key?'page':'false');
      select.value=key;
      try{sessionStorage.setItem('vacancy-admin-section',key)}catch{}
    };
    menu.onclick=event=>{const button=event.target.closest('button[data-section]');if(button)show(button.dataset.section)};
    select.onchange=()=>show(select.value);
    show(selected);
  };
})();

