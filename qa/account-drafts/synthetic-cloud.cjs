// All requests, including map tiles, are intercepted before the first navigation.
// This is an in-memory contract fake, not a Supabase integration test.
const {randomUUID}=require('node:crypto');
const owner={id:'10000000-0000-4000-8000-000000000001',email:'publisher@vacancy.test',email_confirmed_at:'2026-10-10T00:00:00Z',is_anonymous:false};
const otherOwner={...owner,id:'20000000-0000-4000-8000-000000000002',email:'other@vacancy.test'};
const users=new Map([owner,otherOwner].map(user=>[user.id,user]));
const tokenFor=user=>['synthetic',Buffer.from(JSON.stringify({sub:user.id,exp:4102444800})).toString('base64url'),'synthetic'].join('.');
const sessionFor=user=>({access_token:tokenFor(user),refresh_token:'synthetic-refresh-'+user.id,expires_at:4102444800,token_type:'bearer',user});
const clone=value=>JSON.parse(JSON.stringify(value));
function createCloud(){return {editListings:new Map(),properties:new Map(),failActionRequest:null,heads:new Map(),manifests:new Map(),objects:new Map(),publicObjects:new Map(),publicUploadAttempts:0,failPublicUploadOnceAt:0,profiles:new Map(),failProfile:false,failAvatarImages:false,holdProfile:null,published:new Map(),media:[],requests:[],publicWrites:[],blocked:[],failUpload:false,failCommit:false,corruptDownload:false,holdCommit:null,holdUpload:null};}
function subject(request){try{return JSON.parse(Buffer.from(request.headers().authorization.replace(/^Bearer /,'').split('.')[1],'base64url')).sub}catch{return null}}
async function install(context,cloud=createCloud(),{signedIn=null}={}){
 const state={calls:[],authRequests:[],failAuth:false,overrideUser:null,context};
 await context.exposeBinding('__recordAccountDraftBoundary',(_,call)=>state.calls.push(call));
 await context.exposeBinding('__syntheticListingForEdit',(_,id)=>clone(cloud.editListings.get(id)||{propertyId:'40000000-0000-4000-8000-000000000004'}));
 await context.exposeBinding('__syntheticProperties',()=>clone([...cloud.properties.values()]));
 await context.exposeBinding('__syntheticMyVacancies',(_,ownerId)=>clone([...cloud.published.values()].filter(row=>row.status!=='removed'&&row.rooms?.properties?.owner_id===ownerId)));
 await context.addInitScript(({session})=>{
  if(session&&!localStorage.getItem('synthetic-session-seeded')){localStorage.setItem('vacancy-session-v01',JSON.stringify(session));localStorage.setItem('synthetic-session-seeded','true');}
  let backend;Object.defineProperty(window,'VACANCY_BACKEND',{configurable:true,get:()=>backend,set(value){backend=value;
   const writeMethods=['createListing','createRoomVacancyForProperty','saveUnitListingDetails','setPropertyFeatures','setPrivatePropertyNickname','uploadListingImages','reconfirmVacancy','updateListing','updateListingAtomic','deleteMedia','reuseMedia'];
   for(const method of writeMethods){const original=backend[method];backend[method]=async(...args)=>{
    const safeArgs=method==='uploadListingImages'?[args[0],await Promise.all(args[1].map(async file=>({name:file.name,size:file.size,type:file.type,bytes:[...new Uint8Array(await file.arrayBuffer())]}))),args[2]]:args;
    await window.__recordAccountDraftBoundary({method,args:safeArgs});
    if(!window.__allowSyntheticPublish)throw new Error('Unexpected publication before explicit authenticated Publish: '+method);
    return original.apply(backend,args);
   };}
   backend.signInGuest=async()=>{await window.__recordAccountDraftBoundary({method:'signInGuest'});throw new Error('Listing drafting must not create an anonymous account');};
   backend.ownerMediaLibrary=async()=>{await window.__recordAccountDraftBoundary({method:'ownerMediaLibrary'});return [];};
   backend.mediaLibraryFiles=async()=>{await window.__recordAccountDraftBoundary({method:'mediaLibraryFiles'});return [];};
   backend.myProperties=async()=>window.__syntheticProperties();backend.myVacancies=async()=>window.__syntheticMyVacancies((await backend.currentUser())?.id);
   backend.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
   backend.listingForEdit=async id=>window.__syntheticListingForEdit(id);
   backend.trackEvent=()=>{};backend.recordListerJourney=async()=>{};backend.recordConnectedJourney=async()=>{};
  }});
 },{session:signedIn?sessionFor(signedIn):null});
 await context.routeWebSocket('**/*',socket=>socket.close());
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),uid=subject(req),path=url.pathname;
  const body=()=>{try{return req.postDataJSON()||{}}catch{return {}}};
  const json=(value,status=200)=>route.fulfill({status,json:value});
  const err=(message,status=400,code='SYNTHETIC')=>json({message,code},status);
  if(path.startsWith('/api/'))return json({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic Garden Road',lat:-1.26,lon:36.8});
  if(path.startsWith('/auth/v1/')||path==='/functions/v1/secure-signup'){
   if(!['GET','HEAD','OPTIONS'].includes(method))state.authRequests.push({url:req.url(),body:body()});
   if(path==='/auth/v1/user')return json(state.overrideUser||users.get(uid)||null);
   if(path==='/auth/v1/logout')return json({});
   if(path==='/auth/v1/authorize')return route.fulfill({status:302,headers:{location:'http://127.0.0.1:8784/#auth'},body:''});
   if(path==='/auth/v1/token'||path==='/auth/v1/signup'||path==='/functions/v1/secure-signup'){
    if(state.failAuth)return err('Synthetic sign-in failure');
    const requested=[...users.values()].find(user=>user.email===body().email)||users.get(uid)||owner;
    return json(sessionFor(requested));
   }
   return json({});
  }
  if(path.startsWith('/rest/v1/')||path.startsWith('/storage/v1/')){
   cloud.requests.push({uid,path,method,body:body()});
   const isDraft=path.includes('listing_draft')||path.includes('listing-draft-media');
   if(!isDraft){
    // This RPC is a published-only read despite using HTTP POST. Keep every
    // other unrecognized POST in the publication boundary below.
    if(path==='/rest/v1/rpc/site_appearance_published'&&method==='POST'&&Object.keys(body()).length===0)return json(clone(cloud.appearancePublished||[]));
    if(path==='/rest/v1/profiles'){if(cloud.holdProfile)await cloud.holdProfile;if(cloud.failProfile)return err('Synthetic profile unavailable',503);return json(cloud.profiles.has(uid)?[clone(cloud.profiles.get(uid))]:[]);}
    if(path.startsWith('/storage/v1/object/public/profile-avatars/'))return route.fulfill({status:cloud.failAvatarImages?404:200,contentType:'image/png',body:cloud.failAvatarImages?Buffer.from('BROKEN IMAGE'):Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')});
    if(!['GET','HEAD','OPTIONS'].includes(method))cloud.publicWrites.push({path,method,body:body()});
    if(path.startsWith('/storage/v1/object/room-media/')&&method==='POST'){cloud.publicUploadAttempts++;if(cloud.publicUploadAttempts===cloud.failPublicUploadOnceAt)return err('Synthetic public upload interrupted after the first link',503);cloud.publicObjects.set(path,{bytes:req.postDataBuffer(),mime:req.headers()['content-type']});return json({});}
    if(path.startsWith('/storage/v1/object/public/room-media/')&&method==='GET')return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')});
    if(path==='/rest/v1/vacancies'&&url.searchParams.get('id')){const id=url.searchParams.get('id').replace(/^eq\./,'');const item=[...cloud.published.values()].find(row=>row.id===id);return json(item?[clone(item)]:[]);}
    if(path==='/rest/v1/media')return json(cloud.media.filter(item=>!url.searchParams.get('room_id')||item.room_id===url.searchParams.get('room_id').replace(/^eq\./,'')));
    return json([]);
   }
   if(!uid||!users.has(uid))return err('Verified account required',403,'42501');
   const equal=name=>(url.searchParams.get(name)||'').replace(/^eq\./,'');
   if(path==='/rest/v1/listing_drafts'){
    return json([...cloud.heads.values()].filter(head=>head.owner_id===uid&&(!equal('id')||head.id===equal('id'))&&(!url.searchParams.get('state')||['editing','publishing'].includes(head.state))&&(!url.searchParams.get('revision')||head.revision>0)).slice(0,Number(url.searchParams.get('limit'))||Infinity).map(clone));
   }
   if(path==='/rest/v1/listing_draft_manifests')return json([...cloud.manifests.values()].filter(manifest=>manifest.owner_id===uid&&manifest.draft_id===equal('draft_id')&&manifest.transfer_id===equal('transfer_id')).map(clone));
   if(path.startsWith('/storage/v1/object/listing-draft-media/')){
    const key=decodeURIComponent(path.split('/listing-draft-media/')[1]);
    if(!key.startsWith(uid+'/'))return err('Owner-only object',403,'42501');
    if(method==='POST'){
     if(cloud.holdUpload)await cloud.holdUpload;
     if(cloud.failUpload)return err('Synthetic account storage quota exceeded',507);
     if(cloud.objects.has(key))return err('Object already exists',409);
     cloud.objects.set(key,{bytes:req.postDataBuffer(),mime:req.headers()['content-type'],owner:uid});return json({Key:key});
    }
    const object=cloud.objects.get(key);if(!object)return err('Object not found',404);
    return route.fulfill({status:200,contentType:object.mime,body:cloud.corruptDownload?Buffer.from('CORRUPTED'):object.bytes});
   }
   if(path.startsWith('/rest/v1/rpc/')){
    const rpc=path.split('/').pop(),p=body();
    if(rpc==='begin_listing_draft'){
     let head=[...cloud.heads.values()].find(item=>item.owner_id===uid&&item.source_draft_id===p.p_source);
     if(!head){head={id:randomUUID(),owner_id:uid,source_draft_id:p.p_source,revision:0,current_transfer_id:null,state:'editing',published_units:{},created_units:{},publish_token:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};cloud.heads.set(head.id,head);}return json(clone(head));
    }
    const head=cloud.heads.get(p.p_draft);if(!head||head.owner_id!==uid)return err('Draft not found',403,'42501');
    const manifestKey=head.id+'/'+p.p_transfer;
    if(rpc==='stage_listing_draft'){
     const existing=cloud.manifests.get(manifestKey);if(existing)return json(clone(existing));
     if(head.revision!==p.p_expected)return err('Draft revision conflict',409,'40001');
     const manifest={draft_id:head.id,owner_id:uid,transfer_id:p.p_transfer,base_revision:p.p_expected,payload:clone(p.p_payload),assets:clone(p.p_assets),property_id:p.p_property||null,edit_vacancy_id:p.p_edit||null,committed_at:null,committed_revision:null};
     cloud.manifests.set(manifestKey,manifest);return json(clone(manifest));
    }
    if(rpc==='commit_listing_draft'){
     if(cloud.holdCommit)await cloud.holdCommit;if(cloud.failCommit)return err('Synthetic account commit unavailable',503);
     const manifest=cloud.manifests.get(manifestKey);if(!manifest)return err('Manifest not found');
     if(manifest.committed_revision)return json(clone(head));
     if(head.revision!==manifest.base_revision)return err('Draft revision conflict',409,'40001');
     if(manifest.assets.some(asset=>!cloud.objects.has(asset.path)))return err('Missing photo object');
     head.revision++;head.current_transfer_id=manifest.transfer_id;head.updated_at=new Date().toISOString();manifest.committed_revision=head.revision;manifest.committed_at=head.updated_at;return json(clone(head));
    }
    if(rpc==='begin_listing_draft_publish'){
     if(head.revision!==p.p_expected)return err('Draft revision conflict',409,'40001');
     head.revision++;head.state='publishing';head.publish_token=p.p_token;return json(clone(head));
    }
    if(rpc==='listing_draft_publish_action'){
     if(head.revision!==p.p_expected||head.publish_token!==p.p_token)return err('Draft revision conflict',409,'40001');
     if(cloud.failActionRequest===p.p_request&&p.p_action==='create_room')return err('Synthetic second unit publication failure',503);
     let result=null;
     if(['create_listing','create_room'].includes(p.p_action)){
      if(p.p_action==='create_listing')cloud.properties.set('40000000-0000-4000-8000-000000000004',{id:'40000000-0000-4000-8000-000000000004',title:p.p_args.p_title||'Garden property',locality:p.p_args.p_locality||'Westlands',city:p.p_args.p_city||'Nairobi',country:p.p_args.p_country||'Kenya',marketCode:p.p_args.p_market_code||'',propertyType:'Apartment',waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:0});
      const vacancyId=head.created_units[p.p_request]||randomUUID(),roomId=randomUUID();head.created_units[p.p_request]=vacancyId;result=vacancyId;
      cloud.published.set(p.p_request,{id:vacancyId,room_id:roomId,status:'draft',rent_amount:25000,rent_currency:'KES',rent_period:'month',rooms:{id:roomId,name:'Garden unit',property_id:'40000000-0000-4000-8000-000000000004',properties:{id:'40000000-0000-4000-8000-000000000004',owner_id:uid}}});
     }
     if(p.p_action==='link_media'){const row=[...cloud.published.values()].find(item=>item.id===p.p_args.p_vacancy_id);result=cloud.media.find(item=>item.room_id===row.room_id&&item.storage_path===p.p_args.p_path);if(!result){result={id:randomUUID(),room_id:row.room_id,storage_path:p.p_args.p_path,mime_type:p.p_args.p_mime,sort_order:p.p_args.p_order,status:'active'};cloud.media.push(result);}}
     if(['publish_unit','complete_edit'].includes(p.p_action)){head.published_units[p.p_request]=p.p_args.p_vacancy_id;const published=[...cloud.published.values()].find(row=>row.id===p.p_args.p_vacancy_id);if(published)published.status='active';}
     head.revision++;return json({head:clone(head),result});
    }
    if(rpc==='publish_listing_draft_unit'){
     if(head.revision!==p.p_expected||head.publish_token!==p.p_token)return err('Draft revision conflict',409,'40001');
     head.published_units[p.p_request]=p.p_vacancy;head.revision++;return json(clone(head));
    }
    if(rpc==='finish_listing_draft_publish'){
     if(head.revision!==p.p_expected||head.publish_token!==p.p_token)return err('Draft revision conflict',409,'40001');
     const manifest=cloud.manifests.get(head.id+'/'+head.current_transfer_id);
     const unresolved=manifest.payload.units.filter(unit=>!head.published_units[unit._requestId]);
     head.revision++;head.publish_token=null;head.state=unresolved.length?'editing':'published';head.finish_token=p.p_token;head.finish_transfer_id=p.p_transfer;head.current_transfer_id=p.p_transfer;
     {const next={...clone(manifest),transfer_id:p.p_transfer,base_revision:head.revision-1,committed_revision:head.revision,committed_at:new Date().toISOString()};next.payload.units=unresolved;if(unresolved.length&&Object.keys(head.created_units).length){next.payload.scope='property-40000000-0000-4000-8000-000000000004';next.property_id='40000000-0000-4000-8000-000000000004';}next.assets=next.assets.filter(asset=>unresolved.some(unit=>unit._requestId===asset.unitRequestId));head.current_transfer_id=p.p_transfer;cloud.manifests.set(head.id+'/'+p.p_transfer,next);}
     return json(clone(head));
    }
    if(rpc==='set_listing_draft_state'){
     if(head.revision!==p.p_expected)return err('Draft revision conflict',409,'40001');
     if(head.state!==p.p_state){head.state=p.p_state;head.revision++;head.updated_at=new Date().toISOString();}return json(clone(head));
    }
    if(rpc==='record_listing_draft_unit'){
     if(head.revision!==p.p_expected)return err('Draft revision conflict',409,'40001');
     head.published_units[p.p_request]=p.p_vacancy;head.revision++;
     const manifest=cloud.manifests.get(head.id+'/'+head.current_transfer_id);if(manifest.payload.units.every(unit=>head.published_units[unit._requestId]))head.state='published';return json(clone(head));
    }
    return err('Unimplemented synthetic draft RPC '+rpc,501);
   }
   return err('Unexpected synthetic draft request '+path,501);
  }
  if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
  // Unknown external services are always blocked; no hosted write can escape.
  cloud.blocked.push({url:req.url(),method});
  return route.fulfill({status:200,contentType:req.resourceType()==='image'?'image/png':'application/json',body:req.resourceType()==='image'?Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64'):'[]'});
 });
 state.cloud=cloud;return state;
}
module.exports={createCloud,install,owner,otherOwner,tokenFor,sessionFor};
