let vacancyMessagesPollTimer=null;
let vacancyMessagesPollBusy=false;
let vacancyMessagesSignature='';
const vacancyBaseRenderMessages=renderMessages;

function vacancyMessageSignature(rows){
  return rows.map(r=>`${r.id}:${(r.messages||[]).map(m=>`${m.id}:${m.created_at}`).join(',')}`).join('|');
}

function stopMessagesPolling(){
  if(vacancyMessagesPollTimer){clearInterval(vacancyMessagesPollTimer);vacancyMessagesPollTimer=null}
  vacancyMessagesPollBusy=false;
}

async function pollMessagesOnce(force=false){
  if(vacancyMessagesPollBusy)return;
  if(parseHash().name!=='messages'){stopMessagesPolling();return}
  vacancyMessagesPollBusy=true;
  try{
    const rows=await VACANCY_BACKEND.conversations();
    const next=vacancyMessageSignature(rows);
    if(force||next!==vacancyMessagesSignature){
      const oldInput=document.querySelector('#chatForm [name="body"]');
      const draft=oldInput?.value||'';
      const hadFocus=document.activeElement===oldInput;
      vacancyMessagesSignature=next;
      await vacancyBaseRenderMessages();
      const newInput=document.querySelector('#chatForm [name="body"]');
      if(newInput&&draft){newInput.value=draft;if(hadFocus)newInput.focus()}
    }
  }catch{
    // Normal renderer already exposes actionable errors; polling stays silent.
  }finally{
    vacancyMessagesPollBusy=false;
  }
}

function startMessagesPolling(){
  stopMessagesPolling();
  vacancyMessagesPollTimer=setInterval(()=>pollMessagesOnce(false),4000);
}

renderMessages=async function(){
  await vacancyBaseRenderMessages();
  if(parseHash().name!=='messages')return;
  try{
    const rows=await VACANCY_BACKEND.conversations();
    vacancyMessagesSignature=vacancyMessageSignature(rows);
  }catch{}
  startMessagesPolling();
};

window.addEventListener('focus',()=>{if(parseHash().name==='messages')pollMessagesOnce(false)});
