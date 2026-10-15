// Synthetic backend for local presentation tests only; no Auth/SQL proof.
exports.installPresentationBackend=async(page,{operator=false,preserve=false}={})=>{
 await page.evaluate(({operator,preserve})=>{
  if(!preserve){window.currentUser={id:'synthetic-owner'};window.renderAdmin=async()=>{};}
  window.escapeHtml=value=>{const span=document.createElement('span');span.textContent=String(value);return span.innerHTML;};
  // JSONB responses do not preserve JavaScript object insertion order.
  const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,canonical(x[key])])):x;
  const copy=x=>canonical(JSON.parse(JSON.stringify(x)));
  const P=window.P={current:{},drafts:{},history:{},icons:[],catalog:[{slot:'find',label:'Find',listing_kind:null},{slot:'wifi',label:'Wi-Fi',listing_kind:null}],favicon:{png:null,previous_png:null,revision:0},legacy:[],reads:[],saved:0,published:0,failSave:false,failPropagation:false,lostAck:false,applied:{}};
  const state=k=>({published:copy(P.current[k]||{revision:0,config:{}}),draft:copy(P.drafts[k]||null),canPublish:!operator});
  window.VACANCY_BACKEND=Object.assign(preserve?window.VACANCY_BACKEND:{},{session:()=>({user:{id:currentUser.id}}),assuranceLevel:()=> 'aal2',
   siteIconSlots:async options=>{P.reads.push(options);return copy(P.catalog);},siteIconOverrides:async options=>{P.reads.push(options);return copy(P.icons);},adminIconProposals:async()=>Object.keys(P.drafts).filter(k=>k.startsWith('icon-catalog/')),
   adminIconRevisions:async slot=>copy(P.legacy.filter(r=>r.slot===slot)),adminFavicon:async()=>copy(P.favicon),faviconConfig:async options=>{P.reads.push(options);return [{png:P.favicon.png,revision:P.favicon.revision}];},
   adminAppearanceState:async k=>state(k),adminAppearanceHistory:async k=>copy(P.history[k]||[]),
   siteAppearancePublished:async options=>{P.reads.push(options);return P.failPropagation?[]:Object.entries(P.current).map(([key,v])=>({key,...copy(v)}));},
   adminAppearanceSaveDraft:async(k,config,v,r)=>{if(P.failSave)throw Error('Synthetic save failure');if((P.drafts[k]?.version||0)!==v||(P.current[k]?.revision||0)!==r)throw Error('Synthetic conflict');P.saved++;return P.drafts[k]={config:copy(config),version:v+1,baseRevision:r};},
   adminAppearanceRestoreDraft:async(k,r,v,p)=>{if(operator)throw Error('Owner required');const row=P.history[k].find(row=>row.revision===r);return VACANCY_BACKEND.adminAppearanceSaveDraft(k,row.config,v,p);},
   adminAppearancePublish:async(k,r,v,reason,id)=>{
    if(operator)throw Error('Owner required');if(P.applied[id])return P.applied[id];if((P.current[k]?.revision||0)!==r||P.drafts[k]?.version!==v)throw Error('Synthetic conflict');
    const config=copy(P.drafts[k].config);P.current[k]={config,revision:r+1};delete P.drafts[k];P.published++;
    (P.history[k]||=[]).unshift({config,revision:r+1,reason});
    if(k.startsWith('site-icon/')){const slot=k.split('/')[1];P.icons=P.icons.filter(x=>x.slot!==slot);if(Object.keys(config).length)P.icons.push({slot,source_slot:config.source_slot||null,path_d:config.path_d||null});P.legacy.push({id:P.published,slot,...config});}
    if(k.startsWith('icon-catalog/')){const slot=k.split('/')[1];P.catalog.push({slot,label:config.label,listing_kind:config.kind});P.icons.push({slot,path_d:config.path_d});}
    if(k==='site-favicon')P.favicon={png:config.png||null,previous_png:P.favicon.png,revision:P.favicon.revision+1};
    const out=P.applied[id]={revision:r+1};if(P.lostAck){P.lostAck=false;throw Error('Synthetic lost acknowledgement');}return out;
   }});
 },{operator,preserve});
};
