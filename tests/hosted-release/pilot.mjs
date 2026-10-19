import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {check} from '../hosted-admin/support.mjs';
import {requestCount} from './ci-support.mjs';

// Five real customer accounts, five simultaneous browser sessions; synthetic data only.
export async function mixedPilot({actors,bootstrap,ui,dir,listing,pass}){
 const started=Date.now(),before=requestCount(),sessions=[],samples=[];
 for(const role of ['pilot1','pilot2','pilot3']){
  const a={role,password:randomBytes(40).toString('base64url')};
  Object.assign(a,await bootstrap('create',a));actors.push(a);
 }
 const customers=['lister','renter','pilot1','pilot2','pilot3'].map(r=>actors.find(a=>a.role===r));
 const op=async(label,fn)=>{check(samples.length<1000&&Date.now()-started<1800000,'Pilot bound');const begin=performance.now();await fn();samples.push({operation:label,elapsedMs:Math.round(performance.now()-begin)});};
 try{
  for(const actor of customers)sessions.push({...await ui(actor),actor});
  for(let round=0;round<3;round++)await Promise.all(sessions.map(async({page,actor})=>{
   await op('discovery',async()=>check(await page.evaluate(async id=>(await VACANCY_BACKEND.activeVacancies()).some(x=>x.id===id),listing),'Pilot discovery persisted listing'));
   if(actor.role==='lister'){
    await op('owner-read',async()=>check(await page.evaluate(async id=>(await VACANCY_BACKEND.myVacancies()).some(x=>x.id===id),listing),'Pilot owner read'));
   }else{
    await op('save-and-readback',async()=>check(await page.evaluate(async id=>{await VACANCY_BACKEND.saveVacancy(id);return (await VACANCY_BACKEND.savedIds()).includes(id);},listing),'Pilot saved write persisted'));
    await op('unsave-and-readback',async()=>check(await page.evaluate(async id=>{await VACANCY_BACKEND.unsaveVacancy(id);return !(await VACANCY_BACKEND.savedIds()).includes(id);},listing),'Pilot unsave persisted'));
   }
  }));
  for(const {page,actor}of sessions.filter(s=>s.actor.role!=='lister')){
   const conversation=await page.evaluate(async id=>VACANCY_BACKEND.startEnquiry(id,{stayWeeks:4,intro:'Synthetic isolated pilot',message:'Synthetic pilot enquiry'}),listing);
   check(typeof conversation==='string','Pilot genuine enquiry');
   await op('message-and-readback',async()=>check(await page.evaluate(async id=>{
    const message=await VACANCY_BACKEND.sendMessage(id,'Synthetic pilot follow-up');
    return (await VACANCY_BACKEND.conversations()).find(c=>c.id===id)?.messages.some(m=>m.id===message);
   },conversation),'Pilot message persisted'));
   samples.push({operation:'enquiry',elapsedMs:null});
  }
  const owner=sessions[0].page;
  await op('owner-conversation-readback',async()=>check(await owner.evaluate(async id=>(await VACANCY_BACKEND.conversations()).filter(c=>c.vacancies.id===id&&c.messages.length===2).length,listing)===4,'Owner receives all four enquiries and messages'));
  const measured=samples.filter(x=>x.elapsedMs!==null).map(x=>x.elapsedMs).sort((a,b)=>a-b);
  await writeFile(new URL('mixed-pilot.json',dir),JSON.stringify({completed:true,synthetic:true,accounts:5,simultaneousCustomerSessions:5,logicalOperations:samples.length,backendRequests:requestCount()-before,maxBackendRequestsPerSecond:4,elapsedMs:Date.now()-started,newMediaBytes:0,listingMedia:'Three real synthetic photos from the preceding create/edit acceptance',persistedEnquiries:4,persistedFollowupMessages:4,latency:{minMs:measured[0],maxMs:measured.at(-1),p95Ms:measured[Math.ceil(measured.length*.95)-1],includesClientThrottle:true},samples,representativeProductionCapacity:false},null,2));
  pass('Bounded mixed hosted pilot: five customer accounts/sessions, real discovery/favourites/enquiries/messages and persisted readback');
 }finally{for(const s of sessions)await s.ctx.close().catch(()=>{});}
}
