// Browser favourites are separate from listing-composer drafts. Only public
// listing IDs are kept; failed account transfers remain bound to that account.
window.VACANCY_FAVOURITES=(()=>{
  const KEY='vacancy-browser-favourites-v1',INTENT='vacancy-favourite-auth-intent-v1',TTL=30*60*1000;
  const valid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const unique=ids=>[...new Set((Array.isArray(ids)?ids:[]).filter(valid))];
  const permanent=user=>Boolean(user&&!user.is_anonymous);
  const supportsTransfer=()=>typeof navigator.locks?.request==='function';
  const unsupportedMessage='This browser can’t safely transfer your guest saves. They’re still stored here.';
  function unsupported(user){const request=intent();return permanent(user)&&!supportsTransfer()&&Boolean(guest().length||pending(user.id).length||(request&&!request.claimed&&(!request.owner||request.owner===user.id)));}
  let revision=0;const changed=()=>++revision;
  function tokenAccount(){try{const claims=JSON.parse(atob(VACANCY_BACKEND.session().access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return claims.is_anonymous?null:claims.sub}catch{return null}}
  const accountQueues=new Map();
  async function accountAction(owner,action){const run=async()=>{assertOwner(owner);return action()};if(navigator.locks?.request)return navigator.locks.request(KEY+':'+owner,run);const previous=accountQueues.get(owner)||Promise.resolve(),operation=previous.catch(()=>{}).then(run);accountQueues.set(owner,operation);try{return await operation}finally{if(accountQueues.get(owner)===operation)accountQueues.delete(owner)}}
  function read(){const raw=localStorage.getItem(KEY);if(!raw)return {version:1,guest:[],accounts:{}};const data=JSON.parse(raw);if(data?.version!==1||!Array.isArray(data.guest)||!data.accounts||typeof data.accounts!=='object')throw Error('Browser favourites could not be read.');return {version:1,guest:unique(data.guest).slice(0,3),accounts:Object.fromEntries(Object.entries(data.accounts).filter(([id])=>valid(id)).map(([id,ids])=>[id,unique(ids)]))};}
  async function update(change){const run=()=>{const data=read(),before=JSON.stringify(data),result=change(data),after=JSON.stringify(data);if(before!==after)localStorage.setItem(KEY,after);return result};return navigator.locks?.request?navigator.locks.request(KEY,run):run();}
  function guest(){try{return read().guest}catch{return []}}
  function pending(owner){try{return read().accounts[owner]||[]}catch{return []}}
  function ownerNow(id){try{const s=VACANCY_BACKEND.session(),claims=JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return claims.sub===id&&currentUser?.id===id&&!currentUser.is_anonymous}catch{return false}}
  function assertOwner(id){if(!ownerNow(id))throw Error('The account changed. Your browser favourites have not been transferred to another account.');}
  function intent(){try{const value=JSON.parse(sessionStorage.getItem(INTENT)||'null');if(!value||!valid(value.id)||Date.now()-value.at<0||Date.now()-value.at>TTL)return null;return value}catch{return null}}
  function clearIntent(){try{sessionStorage.removeItem(INTENT)}catch{}}
  function takeReturn(){const value=intent();if(!value)return null;if(value.claimed)clearIntent();else{try{sessionStorage.setItem(INTENT,JSON.stringify({...value,returned:true}))}catch{}}const target=/^(home|saved|detail\/[0-9a-f-]{36}|detail-classic\/[0-9a-f-]{36}|detail-quiet\/[0-9a-f-]{36})$/i.test(value.route)?value.route:'saved';return target;}
  async function toggleGuest(id){if(!valid(id)||!vacancies.some(row=>row.id===id))throw Error('This listing is not currently available.');changed();const result=await update(data=>{if(permanent(currentUser)||tokenAccount())throw Error('Your account is changing. Please try saving again.');if(data.guest.includes(id)){data.guest=data.guest.filter(value=>value!==id);return 'removed'}if(data.guest.length===3)return 'limit';data.guest.push(id);return 'saved'});saved=new Set(guest());if(result==='limit'){try{sessionStorage.setItem(INTENT,JSON.stringify({id,at:Date.now(),route:location.hash.slice(1)||'home'}))}catch{throw Error('Your three favourites are kept, but this browser cannot remember the fourth. Sign in, then save it again.');}nav('auth');toast('Sign in or create an account to save more. Your three favourites are kept.');}else toast(result==='saved'?'Saved in this browser':'Removed from saved');return result;}
  async function removeLocal(id,owner){await update(data=>{if(owner){assertOwner(owner);data.accounts[owner]=(data.accounts[owner]||[]).filter(value=>value!==id)}else data.guest=data.guest.filter(value=>value!==id)});}
  async function claim(user){if(!permanent(user)||!supportsTransfer())return;const owner=user.id,candidate=intent();if(!guest().length&&!(candidate&&!candidate.claimed&&(!candidate.owner||candidate.owner===owner)))return;assertOwner(owner);
    const request=candidate&&!candidate.claimed&&(!candidate.owner||candidate.owner===owner)?candidate:null;if(request)sessionStorage.setItem(INTENT,JSON.stringify({...request,owner}));await update(data=>{assertOwner(owner);data.accounts[owner]=unique([...(data.accounts[owner]||[]),...data.guest,...(request?[request.id]:[])]);data.guest=[];});
    // Claim is persisted before network I/O. Account switches cannot adopt it.
    if(request){if(request.returned)clearIntent();else sessionStorage.setItem(INTENT,JSON.stringify({...request,owner,claimed:true}));}
  }
  let merging=null;
  async function merge(user,accountIds){if(!permanent(user))return guest();const owner=user.id;assertOwner(owner);if(merging?.owner===owner)return merging.promise;
    const operation={owner,promise:null};operation.promise=accountAction(owner,async()=>{
      await claim(user);
      // Another tab may have completed this transfer while this one waited.
      // Its ACK can clear pending IDs, so the pre-lock account snapshot is stale.
      const latest=await VACANCY_BACKEND.savedIds(owner);assertOwner(owner);
      const known=new Set(latest),available=new Set(vacancies.map(row=>row.id));
      for(const id of pending(owner)){assertOwner(owner);if(!available.has(id)&&!known.has(id))continue;
        if(!known.has(id)){await VACANCY_BACKEND.saveVacancy(id,owner);assertOwner(owner);const acknowledged=await VACANCY_BACKEND.savedIds(owner);assertOwner(owner);if(!acknowledged.includes(id))throw Error('Your browser favourites are kept, but account sync has not been confirmed.');known.add(id);}
        await removeLocal(id,owner);
      }
      assertOwner(owner);return [...new Set([...known,...pending(owner)])];
    });merging=operation;try{return await operation.promise}finally{if(merging===operation)merging=null}
  }
  async function identity(user,accountIds){if(!permanent(user))return guest();if(unsupported(user)){toast(unsupportedMessage);return accountIds;}const request=intent();if(!guest().length&&!pending(user.id).length&&!(request&&!request.claimed&&(!request.owner||request.owner===user.id)))return accountIds;try{return await merge(user,accountIds)}catch(error){if(ownerNow(user.id)){toast('Some favourites are still saved on this browser and have not synced. Open Saved to retry.');return [...new Set([...accountIds,...pending(user.id)])]}throw error}}
  function syncButtons(){document.querySelectorAll('[data-save]').forEach(button=>{const selected=saved.has(button.dataset.save);button.classList.toggle('saved',selected);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',selected?'Remove from saved':'Save listing')});const detail=document.querySelector?.('.quiet-save'),id=parseHash().id;if(detail&&id){detail.setAttribute('aria-pressed',String(saved.has(id)));detail.setAttribute('aria-label',saved.has(id)?'Remove from saved':'Save listing')}}
  function retry(){return refreshIdentity().then(()=>{if(parseHash().name==='saved')renderSaved();syncButtons()}).catch(error=>toast(error.message))}
  window.addEventListener('hashchange',()=>{const callback=new URLSearchParams(location.hash.slice(1));if(callback.has('access_token')||callback.has('error'))return;const value=intent();if(!value)return;if(!['#auth','#forgot-password','#reset-password'].includes(location.hash)){if(value.owner||!permanent(currentUser))clearIntent();}});
  window.addEventListener('storage',event=>{if(event.key!==KEY&&event.key!=='vacancy-session-v01'&&event.key!==null)return;changed();if(typeof currentUser==='undefined')return;if(event.key==='vacancy-session-v01'||event.key===null){saved.clear();syncButtons();void retry();return}if(!permanent(currentUser)){saved=new Set(guest());syncButtons();if(parseHash().name==='saved')renderSaved()}else{void retry()}});
  return {version:()=>revision,changed,accountAction,claim,unsupported,unsupportedMessage,guest,pending,identity,removeLocal,toggleGuest,syncButtons,permanent,takeReturn,retry,clearIntent};
})();
