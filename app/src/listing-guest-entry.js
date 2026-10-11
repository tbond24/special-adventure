// Listing-only guest handoff. Account, messaging and normal sign-in routes keep
// their existing behavior; this module never submits a listing after login.
(() => {
  let resuming,resumingOwner,cancelGeneration=0;
  function cancelIntent(){cancelGeneration++;VACANCY_GUEST_DRAFT.clearPending()}
  function cancelIfLeavingAuth(){const callback=new URLSearchParams(location.hash.slice(1));if(callback.has('access_token')||callback.has('error')||callback.has('error_code'))return;if(!['#auth','#forgot-password','#reset-password'].includes(location.hash))cancelIntent()}
  cancelIfLeavingAuth();window.addEventListener('hashchange',cancelIfLeavingAuth);
  async function resumeAfterAuth() {
    if (!VACANCY_GUEST_DRAFT.pending() || !currentUser || currentUser.is_anonymous) return false;
    if (resuming) return resuming;
    const generation=cancelGeneration,ownerId=currentUser.id;resumingOwner=ownerId;
    resuming = (async () => {
      const result = await VACANCY_GUEST_DRAFT.adopt({user:currentUser, deferCompletion:true, verifyAccount:()=>VACANCY_BACKEND.verifyListingAccount(ownerId)});
      if(generation!==cancelGeneration||location.hash!=='#auth')return true;
      await VACANCY_BACKEND.verifyListingAccount(ownerId);
      if(generation!==cancelGeneration||location.hash!=='#auth')return true;
      const transferred=await VACANCY_ACCOUNT_DRAFT_UI.transferGuest(result);
      if(generation!==cancelGeneration||location.hash!=='#auth')return true;
      sessionStorage.setItem('vacancy-opening-draft',transferred?.draftKey||result.draftKey);
      sessionStorage.setItem('vacancy-guest-review',transferred?.draftKey||result.draftKey);
      nav('list','new');
      return true;
    })();
    try { return await resuming; } catch(error){if(generation===cancelGeneration&&location.hash==='#auth'&&currentUser?.id===ownerId)restoringAuth(error);throw error} finally { resuming=null;resumingOwner=null; }
  }
  function authNotice() {
    if (!VACANCY_GUEST_DRAFT.pending()) return;
    const form=document.querySelector('#authUnified');
    if (!form || document.querySelector('#returnToListingDraft')) return;
    const back=document.createElement('button');back.type='button';back.id='returnToListingDraft';back.className='ghost wide';back.textContent='Back to your listing';
    back.onclick=()=>{cancelIntent();nav('list','new')};form.append(back);
  }
  function restoringAuth(initialError) {
    layout('<section class="panel"><h1>Restore your listing</h1><p id="listingResumeStatus" role="status">Checking your account and restoring your saved listing…</p><button type="button" id="retryListingResume" class="primary" hidden>Try again</button><button type="button" id="cancelListingResume" class="ghost">Continue to your account</button></section>');
    document.querySelector('#cancelListingResume').onclick=()=>{cancelIntent();nav('account')};
    const attempt=async()=>{const status=document.querySelector('#listingResumeStatus'),retry=document.querySelector('#retryListingResume');retry.hidden=true;try{await resumeAfterAuth()}catch(error){if(status?.isConnected){status.textContent='Your saved listing is still on this device. '+error.message;retry.hidden=false}}};
    if(initialError?.code==='LEGACY_DRAFT_REVIEW'&&VACANCY_LISTING_STORAGE.isLegacy(initialError.draftKey,currentUser?.id)){
      const open=document.createElement('button');open.type='button';open.className='primary';open.textContent='Open saved account draft';open.onclick=()=>{const key=initialError.draftKey;cancelIntent();sessionStorage.setItem('vacancy-opening-draft',key);nav('list','new')};document.querySelector('#retryListingResume').before(open);
    }
    document.querySelector('#retryListingResume').onclick=attempt;if(initialError){document.querySelector('#listingResumeStatus').textContent='Your saved listing is still on this device. '+initialError.message;document.querySelector('#retryListingResume').hidden=false}else void attempt();
  }
  const beforeAuth=renderAuth;
  renderAuth=function(...args){
    // Existing anonymous-chat upgrade must finish its existing account process.
    if(currentUser&&!currentUser.is_anonymous&&VACANCY_GUEST_DRAFT.pending()&&!localStorage.getItem('vacancy-guest-upgrade-pending')){restoringAuth();return}
    const result=beforeAuth.apply(this,args);authNotice();return result;
  };
  const beforeList=renderList;
  renderList=async function(...args){
    const result=await beforeList.apply(this,args);
    const host=document.querySelector('#listingHost'),start=host?.querySelector('.listing-start');
    let form=host?.querySelector('#listingForm');
    if(start&&currentUser&&!currentUser.is_anonymous&&VACANCY_GUEST_DRAFT.recoveryInfo){
      const ownerId=currentUser.id;
      const recovery=await VACANCY_GUEST_DRAFT.recoveryInfo({user:currentUser,verifyAccount:()=>VACANCY_BACKEND.verifyListingAccount(ownerId)}).catch(()=>null);
      if(recovery&&host.isConnected){const recover=document.createElement('button');recover.type='button';recover.className='ghost';recover.id='resumeClaimedListingDraft';recover.textContent=recovery.ownerId?'Resume saved listing':'Continue device draft as '+(currentUser.email||'this account');start.prepend(recover);recover.onclick=async()=>{recover.disabled=true;try{await VACANCY_GUEST_DRAFT.recoverPending({user:currentUser,verifyAccount:()=>VACANCY_BACKEND.verifyListingAccount(ownerId)});nav('auth')}catch(error){toast(error.message);recover.disabled=false}};}
    }
    if(form?.dataset.guestDraftId&&start&&!start.classList.contains('complete')){
      const bundle=await VACANCY_GUEST_DRAFT.load(form).catch(error=>{toast('Saved draft could not be loaded. '+error.message);return null});
      if(bundle?.data&&host.isConnected){
        const type=String(bundle.data.units?.[0]?.unitType||bundle.data.shared?.propertyType||'').toLowerCase();
        const category=/shop|retail|commercial/.test(type)?'Shop':/house|maisonette|villa/.test(type)?'House':'Residential';
        start.querySelector(`[data-listing-type="${category}"]`)?.click();
        if(category==='Residential')start.querySelector(`[data-preset="${/2\s*(bed|bdrm)/.test(type)?'2 bedroom apartment':/1\s*(bed|bdrm)/.test(type)?'1 bedroom apartment':/studio/.test(type)?'Studio':'Room'}"]`)?.click();
        start.querySelector('[data-add-mode="new"]')?.click();
      }
    }
    return result;
  };
  // Never leave account-owned fields exposed after another tab signs out or
  // switches account. Its saved draft stays under the original account key.
  window.addEventListener('storage',event=>{
    if(event.key!=='vacancy-session-v01')return;
    const form=document.querySelector('form[data-draft-owner-id]');if(!form&&!resuming)return;
    let next;try{const value=JSON.parse(event.newValue||'null');next=value?.user?.id;if(!next&&value?.access_token)next=JSON.parse(atob(value.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub}catch{}
    if(next===(form?.dataset.draftOwnerId||resumingOwner))return;
    cancelGeneration++;
    if(form){clearTimeout(listingDraftTimers.get(form));form.dataset.accountChanged='true';form.hidden=true;}
    currentUser=null;nav('auth');toast('The account changed in another tab. Sign in again to continue your saved draft.');
  });
  window.VACANCY_LISTING_GUEST_ENTRY={resumeAfterAuth};
})();
