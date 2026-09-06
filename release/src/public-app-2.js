async function renderMessages(){
  if(!currentUser){nav('auth');return}
  layout('<div class="section-head"><h1>Messages</h1></div><div id="conversationHost" class="empty">Loading conversations…</div>')
  const host=document.querySelector('#conversationHost');
  try{const rows=await VACANCY_BACKEND.conversations();if(!rows.length){host.outerHTML='<div class="empty">No conversations yet.</div>';return}
    const selected=route.id?rows.find(r=>r.id===route.id)||rows[0]:rows[0];
    const threadItems=rows.map(r=>`<div class="thread-item ${r.id===selected.id?'active':''}" data-thread="${r.id}"><strong>${escapeHtml(r.vacancies.rooms.name)}</strong><div class="muted">${escapeHtml(r.vacancies.rooms.properties.suburb)}</div></div>`).join('');
    const ownerId=selected.vacancies.rooms.properties.owner_id; const firstSender=selected.messages[0]?.sender_id; const otherId=currentUser.id===ownerId?firstSender:ownerId;
    const bubbles=selected.messages.map(m=>`<div class="bubble ${m.sender_id===currentUser.id?'me':''}">${escapeHtml(m.body)}</div>`).join('');
    host.outerHTML=`<section class="conversation"><aside class="thread-list">${threadItems}</aside><div class="chat"><div class="muted">Move-in ${selected.requested_move_in||'not specified'}${selected.stay_weeks?` · ${selected.stay_weeks} weeks`:''}</div>${selected.renter_intro?`<div class="notice">${escapeHtml(selected.renter_intro)}</div>`:''}<div class="chat-log">${bubbles}</div><form id="chatForm" class="chat-form"><input name="body" required maxlength="1200" placeholder="Write a message"><button class="primary">Send</button></form>${otherId?`<div class="row"><button class="danger" id="blockConversation">Block user</button></div>`:''}</div></section>`;
    document.querySelectorAll('[data-thread]').forEach(x=>x.onclick=()=>nav('messages',x.dataset.thread));
    document.querySelector('#chatForm').onsubmit=async e=>{e.preventDefault();const body=new FormData(e.target).get('body');try{await VACANCY_BACKEND.sendMessage(selected.id,body);await renderMessages()}catch(err){toast(err.message)}};
    const bb=document.querySelector('#blockConversation');if(bb)bb.onclick=async()=>{if(!confirm('Block this user? You will no longer be able to message each other.'))return;try{await VACANCY_BACKEND.blockUser(otherId);toast('User blocked');await renderMessages()}catch(err){toast(err.message)}};
  }catch(err){host.textContent=err.message}
}
function renderSaved(){if(!currentUser){nav('auth');return}const rows=vacancies.filter(v=>saved.has(v.id));layout(`<div class="section-head"><h1>Saved rooms</h1><span class="muted">${rows.length}</span></div><section class="grid">${rows.length?rows.map(card).join(''):'<div class="empty wide">Nothing saved yet.</div>'}</section>`);bindCards()}
