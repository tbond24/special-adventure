(() => {
  const factorStatus=factor=>factor?.status||factor?.factor_status||'';
  const verifiedFactor=factors=>factors.find(factor=>factor.factor_type==='totp'&&factorStatus(factor)==='verified');

  function closeDialog(dialog){dialog.close();dialog.remove()}
  function createDialog(){const dialog=document.createElement('dialog');dialog.className='vacancy-tour security-dialog';document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});return dialog}
  async function verifyFactor(dialog,factor,onSuccess){const form=dialog.querySelector('[data-mfa-code-form]');form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]'),code=new FormData(form).get('code');button.disabled=true;try{await VACANCY_BACKEND.mfaVerify(factor.id,code);toast('Authenticator verified');closeDialog(dialog);await refreshIdentity();await onSuccess?.()}catch(error){toast(error.message);button.disabled=false}}}
  async function showMfa(options={}){
    const dialog=createDialog();dialog.innerHTML='<button class="tour-close" aria-label="Close">×</button><h2>Authenticator app</h2><p class="muted">Loading security status…</p>';dialog.querySelector('.tour-close').onclick=()=>dialog.close();dialog.showModal();
    try{
      const factors=await VACANCY_BACKEND.mfaFactors(),verified=verifiedFactor(factors),aal=VACANCY_BACKEND.assuranceLevel();
      if(verified&&aal!=='aal2'){
        dialog.innerHTML='<button class="tour-close" aria-label="Close">×</button><h2>Verify it is you</h2><p>Enter the six-digit code from your authenticator app.</p><form data-mfa-code-form><label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="primary" type="submit">Continue</button></form>';
        dialog.querySelector('.tour-close').onclick=()=>dialog.close();await verifyFactor(dialog,verified,options.onSuccess);dialog.querySelector('input').focus();return;
      }
      if(verified){
        dialog.innerHTML='<button class="tour-close" aria-label="Close">×</button><h2>Authenticator app</h2><p class="security-state">Enabled and verified</p><p class="muted">Admin access is protected for this session.</p><button class="danger" data-remove-factor>Remove authenticator</button>';
        dialog.querySelector('.tour-close').onclick=()=>dialog.close();dialog.querySelector('[data-remove-factor]').onclick=async event=>{if(!confirm('Remove this authenticator from your account?'))return;event.currentTarget.disabled=true;try{await VACANCY_BACKEND.mfaUnenroll(verified.id);toast('Authenticator removed');closeDialog(dialog)}catch(error){toast(error.message);event.currentTarget.disabled=false}};return;
      }
      const unverified=factors.filter(factor=>factor.factor_type==='totp');for(const factor of unverified)await VACANCY_BACKEND.mfaUnenroll(factor.id).catch(()=>{});
      const enrolled=await VACANCY_BACKEND.mfaEnroll(),factor=enrolled?.id?enrolled:enrolled?.factor,totp=enrolled?.totp||factor?.totp;if(!factor?.id||!totp?.qr_code)throw new Error('Authenticator setup could not start');
      const qr=String(totp.qr_code);dialog.innerHTML=`<button class="tour-close" aria-label="Close">×</button><h2>Set up authenticator</h2><ol><li>Scan this code with Google Authenticator, Microsoft Authenticator, Authy or your password manager.</li><li>Enter the six-digit code to finish.</li></ol><img class="mfa-qr" src="${escapeHtml(qr)}" alt="Authenticator QR code"><details><summary>Enter a setup key instead</summary><code class="mfa-secret">${escapeHtml(totp.secret||'')}</code></details><form data-mfa-code-form><label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="primary" type="submit">Enable authenticator</button></form>`;
      dialog.querySelector('.tour-close').onclick=async()=>{await VACANCY_BACKEND.mfaUnenroll(factor.id).catch(()=>{});dialog.close()};await verifyFactor(dialog,factor,options.onSuccess);
    }catch(error){dialog.innerHTML=`<button class="tour-close" aria-label="Close">×</button><h2>Authenticator app</h2><p>${escapeHtml(error.message)}</p>`;dialog.querySelector('.tour-close').onclick=()=>dialog.close()}
  }

  const accountBeforeMfa=renderAccount;
  renderAccount=async function(){await accountBeforeMfa();const security=[...document.querySelectorAll('.settings-group')].find(group=>group.querySelector('h2')?.textContent==='Privacy and security');if(!security||document.querySelector('#authenticatorSecurity'))return;const button=document.createElement('button');button.className='settings-row';button.id='authenticatorSecurity';button.innerHTML='<span><strong>Authenticator app</strong><small>Protect sensitive account and admin actions</small></span><b aria-hidden="true">›</b>';security.querySelector('#blockedAccounts,#accountSecurity')?.before(button);button.onclick=()=>showMfa();const admin=document.querySelector('#adminEntry');if(admin){admin.hidden=true;VACANCY_BACKEND.adminMembership().then(isAdmin=>{admin.hidden=!isAdmin;if(isAdmin)admin.onclick=()=>nav('admin')}).catch(()=>{})}}

  const adminBeforeMfa=renderAdmin;
  renderAdmin=async function(){if(!currentUser){nav('auth');return}const member=await VACANCY_BACKEND.adminMembership().catch(()=>false);if(!member){layout('<section class="panel"><h1>Admin</h1><p>This account is not an authorised operator.</p></section>');return}if(VACANCY_BACKEND.assuranceLevel()!=='aal2'){layout('<section class="panel admin-security-gate"><h1>Admin verification</h1><p>Use your authenticator app before opening customer, listing or moderation data.</p><button class="primary" id="verifyAdminMfa">Continue securely</button></section>');document.querySelector('#verifyAdminMfa').onclick=()=>showMfa({onSuccess:()=>renderAdmin()});return}await adminBeforeMfa()}
})();
