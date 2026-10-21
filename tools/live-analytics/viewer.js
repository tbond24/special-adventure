(() => {
 const names=['signIn','signOut','currentUser','mfaFactors','mfaVerify','adminMembership','session','assuranceLevel','adminTrafficMetrics','adminDailyMetricsLocal','adminMetricComparison','adminJourneyMap'];
 const original=VACANCY_BACKEND;window.VACANCY_BACKEND=Object.freeze(Object.fromEntries(names.map(n=>[n,n.startsWith('admin')&&n!=='adminMembership'?async(...args)=>{try{return await original[n](...args)}catch(error){if(error.status===401||error.status===403){hide();status.textContent='Your admin session is no longer authorized. Sign in to retry.'}throw error}}:original[n]])));
 const status=document.querySelector('#status'),login=document.querySelector('#login'),signin=document.querySelector('#signin'),mfa=document.querySelector('#mfa'),dashboard=document.querySelector('#dashboard'),charts=document.querySelector('#charts'),signout=document.querySelector('#signout');let cards=null,map=null;
 function hide(){currentUser=null;dashboard.hidden=true;cards?.cleanup();map?.destroy();charts.replaceChildren();cards=map=null;login.hidden=false;}
 async function enter(){
  currentUser=await VACANCY_BACKEND.currentUser();if(!currentUser){signin.hidden=false;mfa.hidden=true;signout.hidden=true;return}
  signout.hidden=false;
  if(VACANCY_BACKEND.assuranceLevel()!=='aal2'){
   const factors=(await VACANCY_BACKEND.mfaFactors()).filter(f=>f.status==='verified'&&f.factor_type==='totp');
   if(!factors.length){status.textContent='Use the live site to set up admin MFA, then return here. No account settings have been changed.';return}
   mfa.elements.factor.replaceChildren(...factors.map((f,i)=>new Option(f.friendly_name||'Authenticator '+(i+1),f.id)));signin.hidden=true;mfa.hidden=false;status.textContent='Enter your authenticator code.';return;
  }
  if(!await VACANCY_BACKEND.adminMembership())throw Error('An active Vacancy admin account is required.');
  login.hidden=true;dashboard.hidden=false;charts.replaceChildren();const row=document.createElement('div');charts.append(row);cards=VACANCY_OVERVIEW_CARDS.mount(row);map=VACANCY_JOURNEY_MAP.mount(row);charts.querySelector('.journey-map-switch').hidden=true;
  status.textContent='Connected to Vacancy production · read-only reports · your browser timezone.';
 }
 function action(form,work){form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await work();await enter()}catch(error){status.textContent=error.message||'Sign-in failed.'}finally{form.querySelector('input[type=password]')?.value&&(form.querySelector('input[type=password]').value='');if(form.elements.code)form.elements.code.value='';button.disabled=false}}}
 action(signin,()=>VACANCY_BACKEND.signIn({email:signin.elements.email.value.trim(),password:signin.elements.password.value}));action(mfa,()=>VACANCY_BACKEND.mfaVerify(mfa.elements.factor.value,mfa.elements.code.value));
 signout.onclick=async()=>{hide();try{await VACANCY_BACKEND.signOut()}finally{sessionStorage.removeItem('vacancy-live-analytics-session-v1');location.reload()}};
 addEventListener('pagehide',hide);void enter().catch(()=>{hide();status.textContent='Unable to verify your session. Sign in to retry.'});
})();
