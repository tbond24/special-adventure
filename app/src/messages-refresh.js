let vacancyMessagesPollTimer=null;
let vacancyMessagesPollBusy=null;
let vacancyMessagesSignature='';
let vacancyMessagesGeneration=0;
const vacancyBaseRenderMessages=renderMessages;

function vacancyMessageSignature(rows){
  const id=parseHash().id,shown=id?[rows.find(row=>row.id===id)||rows[0]].filter(Boolean):rows;
  return JSON.stringify(shown.map(row=>[row.id,row.vacancies,row.messages]));
}

function createVacancyMessagesRequest(){
  const generation=++vacancyMessagesGeneration;
  const key=location.pathname+location.hash,user=currentUser;
  return {id:parseHash().id,isCurrent:()=>generation===vacancyMessagesGeneration&&key===location.pathname+location.hash&&user===currentUser&&parseHash().name==='messages'};
}

function stopMessagesPolling(){
  if(vacancyMessagesPollTimer){clearInterval(vacancyMessagesPollTimer);vacancyMessagesPollTimer=null}
  vacancyMessagesPollBusy=null;
}

async function pollMessagesOnce(force=false){
  if(vacancyMessagesPollBusy)return;
  if(parseHash().name!=='messages'){stopMessagesPolling();return}
  const request=createVacancyMessagesRequest();
  vacancyMessagesPollBusy=request;
  try{
    const rows=await VACANCY_BACKEND.conversations();
    if(!request.isCurrent())return;
    const next=vacancyMessageSignature(rows);
    if(force||next!==vacancyMessagesSignature){
      const rendered=await vacancyBaseRenderMessages(rows,request.isCurrent,true);
      if(!request.isCurrent()||!rendered)return;
      vacancyMessagesSignature=next;
    }
  }catch{
    // Normal renderer already exposes actionable errors; polling stays silent.
  }finally{
    if(vacancyMessagesPollBusy===request)vacancyMessagesPollBusy=null;
  }
}

function startMessagesPolling(){
  if(vacancyMessagesPollTimer)clearInterval(vacancyMessagesPollTimer);
  vacancyMessagesPollTimer=setInterval(()=>pollMessagesOnce(false),4000);
}

renderMessages=async function(request=createVacancyMessagesRequest()){
  stopMessagesPolling();
  vacancyMessagesPollBusy=request;
  try{
    // The base renderer owns the one collection fetch and its actionable error UI.
    const rows=await vacancyBaseRenderMessages(null,request.isCurrent);
    if(!request.isCurrent())return null;
    if(rows)vacancyMessagesSignature=vacancyMessageSignature(rows);
    startMessagesPolling();
    return rows;
  }finally{
    if(vacancyMessagesPollBusy===request)vacancyMessagesPollBusy=null;
  }
};

function invalidateMessagesRequest(){vacancyMessagesGeneration++;stopMessagesPolling()}
window.addEventListener('hashchange',invalidateMessagesRequest);
window.addEventListener('popstate',invalidateMessagesRequest);
window.addEventListener('focus',()=>{if(parseHash().name==='messages')pollMessagesOnce(false)});
