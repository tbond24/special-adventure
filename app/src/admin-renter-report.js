// Manual, bounded and account-bound. Never substitutes sample or zero results.
window.mountVacancyRenterReport=function(section){
 const actor=currentUser?.id,root=document.createElement('section');root.className='panel';root.dataset.renterReport='';
 root.innerHTML='<h2>Prospective renter journey</h2><p>Recorded search → listing open → enquiry → first owner reply. Searches, browser sessions and conversations are different units.</p><label>Period<select data-period><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label> <button type="button" data-refresh>Refresh renter report</button><p data-status role="status"></p><div data-body></div>';
 section.append(root);let request=null,offset=0,stopped=false,visible=true;const $=s=>root.querySelector(s),safe=x=>escapeHtml(String(x??''));
 const valid=()=>!stopped&&root.isConnected&&location.hash==='#admin'&&currentUser?.id===actor&&VACANCY_BACKEND.assuranceLevel()==='aal2'&&(!VACANCY_BACKEND.session?.()?.user?.id||VACANCY_BACKEND.session().user.id===actor);
 function cancel(){request?.abort();request=null;}
 function cleanup(){if(stopped)return;stopped=true;cancel();observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('hashchange',sync);window.removeEventListener('storage',sync);root.replaceChildren();}
 function sync(){if(!valid()){cleanup();return;}const next=!document.hidden&&!section.hidden;if(!next&&visible){visible=false;cancel();$('[data-status]').textContent='Previous results are stale. Refresh when visible.';$('[data-body]').replaceChildren();$('[data-refresh]').disabled=false;}else if(next)visible=true;}
 async function load(){
  if(!valid()||document.hidden||section.hidden)return;cancel();const controller=new AbortController();request=controller;const deadline=setTimeout(()=>controller.abort(),15000);
  const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('Report cancelled or timed out')),{once:true}));
  $('[data-refresh]').disabled=true;$('[data-status]').textContent='Loading recorded renter evidence…';$('[data-body]').replaceChildren();
  try{const end=new Date(),days=Number($('[data-period]').value),options={p_from:new Date(end.getTime()-days*86400000+1000).toISOString(),p_to:end.toISOString(),p_offset:offset};
   const r=await Promise.race([VACANCY_BACKEND.adminRenterJourneys(options,{signal:controller.signal}),aborted]);if(request!==controller||!valid())return;
   if(r?.schemaVersion!==1||typeof r.complete!=='boolean'||!Number.isFinite(Date.parse(r.generatedAt)))throw Error('Report response is unavailable');
   $('[data-status]').textContent='Generated '+new Date(r.generatedAt).toLocaleString()+' · manual refresh · 30-day renter retention target';
   if(!r.complete){$('[data-body]').textContent=r.reason||'Renter evidence is unavailable, not zero.';return;}
   const keys=['searches','withOpen','withEnquiry','withReply','conversations','repliedConversations','directOpens','detailTotal'];
   if(keys.some(k=>!Number.isSafeInteger(r[k])||r[k]<0)||r.withOpen>r.searches||r.withEnquiry>r.withOpen||r.withReply>r.withEnquiry||r.repliedConversations>r.conversations||!Array.isArray(r.details)||r.details.length>50)throw Error('Report totals do not reconcile');
   $('[data-body]').innerHTML='<p>'+safe(r.searches)+' recorded searches · '+safe(r.withOpen)+' with an open · '+safe(r.withEnquiry)+' with an enquiry · '+safe(r.withReply)+' with a first reply</p><p>'+safe(r.conversations)+' distinct linked conversations · '+safe(r.repliedConversations)+' with an owner reply · '+safe(r.directOpens)+' direct opens without a search link</p><p>Conversion rate unavailable. '+safe(r.coverage)+'</p><table><thead><tr><th>Search</th><th>Opened</th><th>Conversations</th><th>Replied</th></tr></thead><tbody>'+r.details.map(d=>'<tr><td>'+safe(d.label)+'</td><td>'+safe(d.opens)+'</td><td>'+safe(d.enquiries)+'</td><td>'+safe(d.replies)+'</td></tr>').join('')+'</tbody></table><button type="button" data-prev '+(offset===0?'disabled':'')+'>Previous</button> <button type="button" data-next '+(offset+50>=r.detailTotal?'disabled':'')+'>Next</button>';
   $('[data-prev]').onclick=()=>{offset=Math.max(0,offset-50);load()};$('[data-next]').onclick=()=>{offset+=50;load()};
  }catch(error){if(request===controller&&valid()){$('[data-status]').textContent='Renter report unavailable: '+error.message+'. Counts are not zero.';$('[data-body]').replaceChildren();}}
  finally{clearTimeout(deadline);if(request===controller){request=null;if(valid())$('[data-refresh]').disabled=false;}}
 }
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',sync);window.addEventListener('hashchange',sync);window.addEventListener('storage',sync);
 $('[data-refresh]').onclick=load;$('[data-period]').onchange=()=>{offset=0;load()};load();return {refresh:load,cleanup};
};
