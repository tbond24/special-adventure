window.VACANCY_BACKEND = (() => {
  const URL = 'https://xtutkwiivqkgkqjpkxvj.supabase.co';
  const KEY = 'sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
  const SESSION_KEY = 'vacancy-session-v01';
  const baseHeaders = { apikey: KEY, 'Content-Type': 'application/json' };

  function session(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; } }
  function saveSession(value){ value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY); }
  function authHeaders(){ const s=session(); return {...baseHeaders, Authorization:`Bearer ${s?.access_token || KEY}`}; }
  async function parse(response){ const body=await response.text(); const data=body?JSON.parse(body):null; if(!response.ok) throw new Error(data?.msg||data?.message||data?.error_description||`Vacancy backend ${response.status}`); return data; }
  async function rest(path, options={}){ return parse(await fetch(`${URL}/rest/v1/${path}`,{...options,headers:{...authHeaders(),Prefer:'return=representation',...(options.headers||{})}})); }

  async function activeVacancies() {
    const select = encodeURIComponent('id,monthly_rent,deposit,bills_included,available_from,minimum_stay_weeks,confirmed_at,expires_at,status,rooms!inner(id,name,room_type,unit_type,furnished,ensuite,max_occupants,smoking_allowed_override,pets_considered_override,description,media(id,storage_path,sort_order),properties!inner(id,title,suburb,city,state,postcode,country,property_type,parking_spaces,pets_considered,smoking_allowed,household_summary,landmark,water_available,electricity_available,security_available,internet_available,owner_id,profiles!properties_owner_id_fkey(id,display_name,bio)))');
    const rows = await rest(`vacancies?select=${select}&status=eq.active&order=monthly_rent.asc`);
    return rows.map(row => {
      const room=row.rooms, property=room.properties, owner=property.profiles;
      const media=(room.media||[]).sort((a,b)=>a.sort_order-b.sort_order).map(m=>({...m,url:`${URL}/storage/v1/object/public/room-media/${m.storage_path}`})); return {id:row.id,monthlyRent:Number(row.monthly_rent),deposit:row.deposit==null?null:Number(row.deposit),billsIncluded:row.bills_included,availableFrom:row.available_from,minimumStayWeeks:row.minimum_stay_weeks,confirmedAt:row.confirmed_at,expiresAt:row.expires_at,room:{id:room.id,name:room.name,roomType:room.unit_type||room.room_type,furnished:room.furnished,ensuite:room.ensuite,maxOccupants:room.max_occupants||1,smokingAllowedOverride:room.smoking_allowed_override,petsConsideredOverride:room.pets_considered_override,description:room.description,media},property:{id:property.id,title:property.title,suburb:property.suburb,city:property.city,state:property.state,postcode:property.postcode,country:property.country,propertyType:property.property_type,parkingSpaces:Number(property.parking_spaces||0),petsConsidered:room.pets_considered_override==null?Boolean(property.pets_considered):Boolean(room.pets_considered_override),smokingAllowed:room.smoking_allowed_override==null?Boolean(property.smoking_allowed):Boolean(room.smoking_allowed_override),propertyPetsConsidered:Boolean(property.pets_considered),propertySmokingAllowed:Boolean(property.smoking_allowed),householdSummary:property.household_summary,landmark:property.landmark||'',waterAvailable:Boolean(property.water_available),electricityAvailable:Boolean(property.electricity_available),securityAvailable:Boolean(property.security_available),internetAvailable:Boolean(property.internet_available)},owner:{id:owner?.id||property.owner_id,displayName:owner?.display_name||'Vacancy member',bio:owner?.bio||''}};
    });
  }
  async function signUp({name,email,password}){
    const data=await parse(await fetch(`${URL}/functions/v1/secure-signup`,{method:'POST',headers:baseHeaders,body:JSON.stringify({name,email,password})}));
    if(data.access_token) saveSession(data); return data;
  }
  async function signIn({email,password}){
    const data=await parse(await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:baseHeaders,body:JSON.stringify({email,password})}));
    saveSession(data); return data;
  }
  function signOut(){ saveSession(null); }
  async function currentUser(){ const s=session(); if(!s?.access_token)return null; try{return await parse(await fetch(`${URL}/auth/v1/user`,{headers:{...baseHeaders,Authorization:`Bearer ${s.access_token}`}}));}catch{saveSession(null);return null;} }
  async function savedIds(){ const u=await currentUser(); if(!u)return []; const rows=await rest(`saved_vacancies?select=vacancy_id&user_id=eq.${u.id}`); return rows.map(r=>r.vacancy_id); }
  async function saveVacancy(vacancyId){ const u=await currentUser(); if(!u)throw new Error('Sign in first'); return rest('saved_vacancies',{method:'POST',body:JSON.stringify({user_id:u.id,vacancy_id:vacancyId}),headers:{Prefer:'resolution=merge-duplicates,return=representation'}}); }
  async function unsaveVacancy(vacancyId){ const u=await currentUser(); if(!u)throw new Error('Sign in first'); return rest(`saved_vacancies?user_id=eq.${u.id}&vacancy_id=eq.${vacancyId}`,{method:'DELETE'}); }
  async function createListing(input){
    const body={
      p_title: input.propertyTitle || `${input.estate} property`, p_estate:input.estate, p_town:input.town, p_county:input.county, p_postcode:input.postcode||'', p_landmark:input.landmark||'', p_property_type:input.propertyType||'Apartment', p_household_summary:input.household,
      p_address_line:input.address, p_unit_name:input.roomName, p_unit_type:input.unitType||'Bedsitter', p_furnished:input.furnished, p_ensuite:input.ensuite, p_unit_description:input.description,
      p_monthly_rent:Number(input.monthlyRent), p_deposit:input.deposit===''?null:Number(input.deposit), p_bills_included:input.billsIncluded, p_available_from:input.availableFrom, p_minimum_stay_weeks:input.minimumStayWeeks?Number(input.minimumStayWeeks):null, p_parking_spaces:Number(input.parkingSpaces||0), p_max_occupants:Number(input.maxOccupants||1), p_pets_considered:Boolean(input.petsConsidered), p_smoking_allowed:Boolean(input.smokingAllowed),
      p_water_available:Boolean(input.waterAvailable), p_electricity_available:Boolean(input.electricityAvailable), p_security_available:Boolean(input.securityAvailable), p_internet_available:Boolean(input.internetAvailable)
    };
    const rows=await rest('rpc/create_vacancy_listing_ke',{method:'POST',body:JSON.stringify(body)});
    return Array.isArray(rows)?rows[0]:rows;
  }

  async function listingForEdit(id){
    const u=await currentUser(); if(!u)throw new Error('Sign in first');
    const select=encodeURIComponent('id,monthly_rent,deposit,bills_included,available_from,minimum_stay_weeks,status,rooms!inner(id,name,unit_type,furnished,ensuite,max_occupants,smoking_allowed_override,pets_considered_override,description,properties!inner(id,suburb,city,state,postcode,landmark,property_type,parking_spaces,pets_considered,smoking_allowed,water_available,electricity_available,security_available,internet_available,household_summary,owner_id))');
    const rows=await rest(`vacancies?select=${select}&id=eq.${id}`); const row=rows[0];
    const property=row?.rooms?.properties;
    if(!row||property?.owner_id!==u.id)throw new Error('Vacancy not found');
    const locations=await rest(`property_private_locations?select=address_line&property_id=eq.${property.id}`);
    return {id:row.id,roomId:row.rooms.id,propertyId:property.id,monthlyRent:Number(row.monthly_rent),deposit:row.deposit==null?'':Number(row.deposit),billsIncluded:row.bills_included,availableFrom:row.available_from,minimumStayWeeks:row.minimum_stay_weeks||'',roomName:row.rooms.name,unitType:row.rooms.unit_type||'Bedsitter',furnished:row.rooms.furnished,ensuite:row.rooms.ensuite,maxOccupants:row.rooms.max_occupants||1,smokingAllowedOverride:row.rooms.smoking_allowed_override,petsConsideredOverride:row.rooms.pets_considered_override,description:row.rooms.description||'',estate:property.suburb,town:property.city,county:property.state,postcode:property.postcode||'',landmark:property.landmark||'',propertyType:property.property_type||'Apartment',parkingSpaces:Number(property.parking_spaces||0),petsConsidered:Boolean(property.pets_considered),smokingAllowed:Boolean(property.smoking_allowed),waterAvailable:Boolean(property.water_available),electricityAvailable:Boolean(property.electricity_available),securityAvailable:Boolean(property.security_available),internetAvailable:Boolean(property.internet_available),household:property.household_summary||'',address:locations[0]?.address_line||''};
  }
  async function updateListing(id,input){
    return rest('rpc/update_vacancy_listing_ke',{method:'POST',body:JSON.stringify({p_vacancy_id:id,p_estate:input.estate,p_town:input.town,p_county:input.county,p_postcode:input.postcode||'',p_landmark:input.landmark||'',p_address_line:input.address,p_property_type:input.propertyType,p_household_summary:input.household,p_unit_name:input.roomName,p_unit_type:input.unitType||'Bedsitter',p_furnished:input.furnished,p_ensuite:input.ensuite,p_unit_description:input.description,p_monthly_rent:Number(input.monthlyRent),p_deposit:input.deposit===''?null:Number(input.deposit),p_bills_included:input.billsIncluded,p_available_from:input.availableFrom,p_minimum_stay_weeks:input.minimumStayWeeks?Number(input.minimumStayWeeks):null,p_parking_spaces:Number(input.parkingSpaces||0),p_max_occupants:Number(input.maxOccupants||1),p_pets_considered:Boolean(input.petsConsidered),p_smoking_allowed:Boolean(input.smokingAllowed),p_water_available:Boolean(input.waterAvailable),p_electricity_available:Boolean(input.electricityAvailable),p_security_available:Boolean(input.securityAvailable),p_internet_available:Boolean(input.internetAvailable)})});
  }

  async function myProperties(){
    const u=await currentUser(); if(!u)return [];
    const rows=await rest(`properties?select=id,title,suburb,city,state,postcode,property_type,parking_spaces,pets_considered,smoking_allowed,household_summary,landmark,water_available,electricity_available,security_available,internet_available&owner_id=eq.${u.id}&order=created_at.desc`);
    return rows.map(p=>({id:p.id,title:p.title||`${p.suburb} property`,estate:p.suburb,town:p.city,county:p.state,postcode:p.postcode||'',landmark:p.landmark||'',propertyType:p.property_type||'Apartment',parkingSpaces:Number(p.parking_spaces||0),petsConsidered:Boolean(p.pets_considered),smokingAllowed:Boolean(p.smoking_allowed),waterAvailable:Boolean(p.water_available),electricityAvailable:Boolean(p.electricity_available),securityAvailable:Boolean(p.security_available),internetAvailable:Boolean(p.internet_available),household:p.household_summary||''}));
  }
  async function createRoomVacancyForProperty(propertyId,input){
    return rest('rpc/create_unit_vacancy_for_property_ke',{method:'POST',body:JSON.stringify({p_property_id:propertyId,p_unit_name:input.roomName,p_unit_type:input.unitType||'Bedsitter',p_furnished:input.furnished,p_ensuite:input.ensuite,p_max_occupants:Number(input.maxOccupants||1),p_unit_description:input.description,p_smoking_allowed_override:input.smokingOverride===''?null:input.smokingOverride==='true',p_pets_considered_override:input.petsOverride===''?null:input.petsOverride==='true',p_monthly_rent:Number(input.monthlyRent),p_deposit:input.deposit===''?null:Number(input.deposit),p_bills_included:input.billsIncluded,p_available_from:input.availableFrom,p_minimum_stay_weeks:input.minimumStayWeeks?Number(input.minimumStayWeeks):null})});
  }
  async function updatePropertyDefaults(propertyId,input){
    return rest('rpc/update_property_defaults_ke',{method:'POST',body:JSON.stringify({p_property_id:propertyId,p_smoking_allowed:Boolean(input.smokingAllowed),p_pets_considered:Boolean(input.petsConsidered),p_parking_spaces:Number(input.parkingSpaces||0),p_household_summary:input.household||'',p_landmark:input.landmark||'',p_water_available:Boolean(input.waterAvailable),p_electricity_available:Boolean(input.electricityAvailable),p_security_available:Boolean(input.securityAvailable),p_internet_available:Boolean(input.internetAvailable)})});
  }
  async function updateRoomOverrides(roomId,input){
    return rest('rpc/update_room_overrides',{method:'POST',body:JSON.stringify({p_room_id:roomId,p_smoking_allowed_override:input.smokingOverride===''?null:input.smokingOverride==='true',p_pets_considered_override:input.petsOverride===''?null:input.petsOverride==='true'})});
  }

  async function myVacancies(){
    const u=await currentUser(); if(!u)return [];
    const select=encodeURIComponent('id,monthly_rent,status,available_from,rooms!inner(id,name,unit_type,properties!inner(id,title,suburb,city,state,owner_id))');
    const rows=await rest(`vacancies?select=${select}&order=created_at.desc`);
    return rows.filter(row=>row.rooms?.properties?.owner_id===u.id);
  }
  async function setVacancyStatus(id,status){
    if(!['active','paused','filled'].includes(status))throw new Error('Invalid status');
    return rest(`vacancies?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status,confirmed_at:status==='active'?new Date().toISOString():undefined})});
  }

  async function deleteAccount(){
    const s=session(); if(!s?.access_token)throw new Error('Sign in first');
    const res=await fetch(`${URL}/functions/v1/delete-account`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:'{}'});
    const data=await parse(res); saveSession(null); return data;
  }
  async function reconfirmVacancy(id){return rest('rpc/reconfirm_vacancy',{method:'POST',body:JSON.stringify({p_vacancy_id:id})});}
  async function trackEvent(eventName,vacancyId=null,route=null){try{return await rest('rpc/track_event',{method:'POST',body:JSON.stringify({p_event_name:eventName,p_vacancy_id:vacancyId,p_route:route})})}catch{}}
  async function recordError(code,route=null){try{return await rest('rpc/record_client_error',{method:'POST',body:JSON.stringify({p_error_code:code,p_route:route})})}catch{}}

  async function adminVacancies(){const select=encodeURIComponent('id,status,monthly_rent,created_at,rooms!inner(name,properties!inner(suburb,owner_id))');return rest(`vacancies?select=${select}&order=created_at.desc`);}
  async function adminReports(){return rest('reports?select=id,reason,status,created_at,vacancy_id,reported_user_id&order=created_at.desc&limit=20');}
  async function adminOverview(){return rest('rpc/admin_overview',{method:'POST',body:'{}'});}
  async function adminDeactivateVacancy(id){return rest('rpc/admin_deactivate_vacancy',{method:'POST',body:JSON.stringify({p_vacancy_id:id})});}
  async function uploadListingImages(vacancyId, files){
    const u=await currentUser(); if(!u)throw new Error('Sign in first');
    const list=[...files]; if(list.length>8)throw new Error('Maximum 8 images');
    const allowed=new Set(['image/jpeg','image/png','image/webp']);
    for(const file of list){if(!allowed.has(file.type))throw new Error('Use JPG, PNG or WebP images only');if(file.size>10*1024*1024)throw new Error('Each image must be 10MB or smaller')}
    const select=encodeURIComponent('id,room_id,rooms!inner(id,property_id,properties!inner(owner_id))');
    const rows=await rest(`vacancies?select=${select}&id=eq.${vacancyId}`); const row=rows[0];
    if(!row||row.rooms?.properties?.owner_id!==u.id)throw new Error('Vacancy not found');
    const roomId=row.room_id, propertyId=row.rooms.property_id; const uploaded=[];
    for(let i=0;i<list.length;i++){
      const file=list[i], ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${u.id}/${roomId}/${crypto.randomUUID()}.${ext||'jpg'}`;
      const res=await fetch(`${URL}/storage/v1/object/room-media/${path}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${session().access_token}`,'Content-Type':file.type,'x-upsert':'false'},body:file});
      if(!res.ok){const text=await res.text();throw new Error(`Image upload failed: ${text||res.status}`)}
      await rest('media',{method:'POST',body:JSON.stringify({owner_id:u.id,property_id:propertyId,room_id:roomId,storage_path:path,mime_type:file.type,sort_order:i,status:'active'})});
      uploaded.push(path);
    }
    return uploaded;
  }
  async function startEnquiry(vacancyId,input){
    const body={p_vacancy_id:vacancyId,p_requested_move_in:input.moveIn||null,p_stay_weeks:input.stayWeeks?Number(input.stayWeeks):null,p_renter_intro:input.intro||null,p_message:input.message};
    return rest('rpc/start_enquiry',{method:'POST',body:JSON.stringify(body)});
  }
  async function conversations(){
    const select=encodeURIComponent('id,requested_move_in,stay_weeks,renter_intro,created_at,vacancies!inner(id,monthly_rent,rooms!inner(name,properties!inner(suburb,owner_id))),messages(id,body,sender_id,created_at)');
    const rows=await rest(`conversations?select=${select}&order=created_at.desc`);
    return rows.map(row=>({...row,messages:(row.messages||[]).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at))}));
  }
  async function sendMessage(conversationId,body){ return rest('rpc/send_message',{method:'POST',body:JSON.stringify({p_conversation_id:conversationId,p_body:body})}); }
  async function reportVacancy(vacancyId,reportedUserId,reason,details=''){
    const u=await currentUser(); if(!u)throw new Error('Sign in first');
    return rest('reports',{method:'POST',body:JSON.stringify({reporter_id:u.id,vacancy_id:vacancyId,reported_user_id:reportedUserId,reason,details})});
  }
  async function blockUser(userId){
    const u=await currentUser(); if(!u)throw new Error('Sign in first');
    return rest('blocks',{method:'POST',body:JSON.stringify({blocker_id:u.id,blocked_id:userId}),headers:{Prefer:'resolution=merge-duplicates,return=representation'}});
  }
  return {activeVacancies,signUp,signIn,signOut,currentUser,savedIds,saveVacancy,unsaveVacancy,createListing,listingForEdit,updateListing,myProperties,createRoomVacancyForProperty,updatePropertyDefaults,updateRoomOverrides,myVacancies,setVacancyStatus,reconfirmVacancy,trackEvent,recordError,adminOverview,adminVacancies,adminReports,adminDeactivateVacancy,deleteAccount,uploadListingImages,startEnquiry,conversations,sendMessage,reportVacancy,blockUser,session};
})();
