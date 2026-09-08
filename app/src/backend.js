window.VACANCY_BACKEND = (() => {
  const URL = 'https://xtutkwiivqkgkqjpkxvj.supabase.co';
  const KEY = 'sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R';
  const SESSION_KEY = 'vacancy-session-v01';
  const baseHeaders = { apikey: KEY, 'Content-Type': 'application/json' };

  function session(){ try { const value=JSON.parse(localStorage.getItem(SESSION_KEY)); if(!value||typeof value!=='object'||typeof value.access_token!=='string')throw new Error('malformed'); return value; } catch { localStorage.removeItem(SESSION_KEY); return null; } }
  function saveSession(value){ value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY); }
  async function parse(response){ const body=await response.text(); let data=null; try{data=body?JSON.parse(body):null}catch{data=body} if(!response.ok){const error=new Error(data?.msg||data?.message||data?.error_description||`Vacancy backend ${response.status}`);error.status=response.status;throw error} return data; }
  function expiresSoon(value){try{return Number(JSON.parse(atob(value.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp||0)*1000<Date.now()+60000}catch{return true}}
  async function refreshSession(){const current=session();if(!current?.refresh_token)return null;try{const data=await parse(await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:baseHeaders,body:JSON.stringify({refresh_token:current.refresh_token})}));saveSession(data);return data}catch(error){if(error.status===400||error.status===401)saveSession(null);throw error}}
  async function usableSession(){const current=session();if(!current)return null;return expiresSoon(current)?refreshSession():current}
  async function authHeaders(){ const s=await usableSession(); return {...baseHeaders, Authorization:`Bearer ${s?.access_token || KEY}`}; }
  async function rest(path, options={}){ return parse(await fetch(`${URL}/rest/v1/${path}`,{...options,headers:{...(await authHeaders()),Prefer:'return=representation',...(options.headers||{})}})); }

  async function activeVacancies() {
    const select = encodeURIComponent('id,rent_amount,rent_currency,rent_period,monthly_rent,deposit,bills_included,available_from,minimum_stay_weeks,confirmed_at,expires_at,status,rooms!inner(id,name,room_type,unit_type,furnished,ensuite,max_occupants,smoking_allowed_override,pets_considered_override,description,media(id,storage_path,sort_order),properties!inner(id,title,suburb,city,state,postcode,country,market_code,property_type,parking_spaces,pets_considered,smoking_allowed,household_summary,landmark,water_available,electricity_available,security_available,internet_available,public_latitude,public_longitude,owner_id,profiles!properties_owner_id_fkey(id,display_name,bio)))');
    const rows = await rest(`vacancies?select=${select}&status=eq.active&order=monthly_rent.asc`);
    return rows.map(row => {
      const room=row.rooms, property=room.properties, owner=property.profiles;
      const media=(room.media||[]).sort((a,b)=>a.sort_order-b.sort_order).map(m=>({...m,url:`${URL}/storage/v1/object/public/room-media/${m.storage_path}`})); return {id:row.id,rentAmount:Number(row.rent_amount??row.monthly_rent),rentCurrency:row.rent_currency||'KES',rentPeriod:row.rent_period||'month',monthlyRent:Number(row.monthly_rent),deposit:row.deposit==null?null:Number(row.deposit),billsIncluded:row.bills_included,availableFrom:row.available_from,minimumStayWeeks:row.minimum_stay_weeks,confirmedAt:row.confirmed_at,expiresAt:row.expires_at,room:{id:room.id,name:room.name,roomType:room.unit_type||room.room_type,furnished:room.furnished,ensuite:room.ensuite,maxOccupants:room.max_occupants||1,smokingAllowedOverride:room.smoking_allowed_override,petsConsideredOverride:room.pets_considered_override,description:room.description,media},property:{id:property.id,title:property.title,suburb:property.suburb,city:property.city,state:property.state,postcode:property.postcode,country:property.country,marketCode:property.market_code||'',propertyType:property.property_type,parkingSpaces:Number(property.parking_spaces||0),petsConsidered:room.pets_considered_override==null?Boolean(property.pets_considered):Boolean(room.pets_considered_override),smokingAllowed:room.smoking_allowed_override==null?Boolean(property.smoking_allowed):Boolean(room.smoking_allowed_override),propertyPetsConsidered:Boolean(property.pets_considered),propertySmokingAllowed:Boolean(property.smoking_allowed),householdSummary:property.household_summary,landmark:property.landmark||'',waterAvailable:Boolean(property.water_available),electricityAvailable:Boolean(property.electricity_available),securityAvailable:Boolean(property.security_available),internetAvailable:Boolean(property.internet_available),publicLatitude:property.public_latitude==null?null:Number(property.public_latitude),publicLongitude:property.public_longitude==null?null:Number(property.public_longitude)},owner:{id:owner?.id||property.owner_id,displayName:owner?.display_name||'Vacancy member',bio:owner?.bio||''}};
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
  async function signOut(){const current=session();try{if(current?.access_token)await fetch(`${URL}/auth/v1/logout?scope=global`,{method:'POST',headers:{...baseHeaders,Authorization:`Bearer ${current.access_token}`}})}finally{saveSession(null)}}
  async function currentUser(){ let current=session(); if(!current)return null; try{current=await usableSession();return await parse(await fetch(`${URL}/auth/v1/user`,{headers:{...baseHeaders,Authorization:`Bearer ${current.access_token}`}}))}catch(error){if(error.status===401||error.status===403){try{current=await refreshSession();if(!current)return null;return await parse(await fetch(`${URL}/auth/v1/user`,{headers:{...baseHeaders,Authorization:`Bearer ${current.access_token}`}}))}catch(retry){if(retry.status===400||retry.status===401||retry.status===403){saveSession(null);return null}throw retry}}throw error} }
  async function savedIds(){ const u=await currentUser(); if(!u)return []; const rows=await rest(`saved_vacancies?select=vacancy_id&user_id=eq.${u.id}`); return rows.map(r=>r.vacancy_id); }
  async function saveVacancy(vacancyId){ const u=await currentUser(); if(!u)throw new Error('Sign in first'); return rest('saved_vacancies',{method:'POST',body:JSON.stringify({user_id:u.id,vacancy_id:vacancyId}),headers:{Prefer:'resolution=merge-duplicates,return=representation'}}); }
  async function unsaveVacancy(vacancyId){ const u=await currentUser(); if(!u)throw new Error('Sign in first'); return rest(`saved_vacancies?user_id=eq.${u.id}&vacancy_id=eq.${vacancyId}`,{method:'DELETE'}); }
  async function createListing(input){
    const body={
      p_title: input.propertyTitle || `${input.locality} property`, p_locality:input.locality, p_city:input.city, p_region:input.region, p_postal:input.postal||'', p_landmark:input.landmark||'', p_country:input.country||'', p_market_code:input.marketCode,
      p_property_type:input.propertyType||'Apartment', p_household_summary:input.household, p_address_line:input.address, p_unit_name:input.roomName, p_unit_type:input.unitType||'Studio', p_furnished:input.furnished, p_ensuite:input.ensuite, p_unit_description:input.description,
      p_rent_amount:Number(input.rentAmount), p_rent_currency:input.rentCurrency, p_rent_period:input.rentPeriod, p_deposit:input.deposit===''?null:Number(input.deposit), p_bills_included:input.billsIncluded, p_available_from:input.availableFrom, p_minimum_stay_weeks:input.minimumStayWeeks?Number(input.minimumStayWeeks):null,
      p_parking_spaces:Number(input.parkingSpaces||0), p_max_occupants:Number(input.maxOccupants||1), p_pets_considered:Boolean(input.petsConsidered), p_smoking_allowed:Boolean(input.smokingAllowed), p_water_available:Boolean(input.waterAvailable), p_electricity_available:Boolean(input.electricityAvailable), p_security_available:Boolean(input.securityAvailable), p_internet_available:Boolean(input.internetAvailable)
    };
    const rows=await rest('rpc/create_vacancy_listing_v2',{method:'POST',body:JSON.stringify(body)});
    return Array.isArray(rows)?rows[0]:rows;
  }

  async function listingForEdit(id){
    const u=await currentUser(); if(!u)throw new Error('Sign in first');
    const select=encodeURIComponent('id,rent_amount,rent_currency,rent_period,monthly_rent,deposit,bills_included,available_from,minimum_stay_weeks,status,rooms!inner(id,name,unit_type,furnished,ensuite,max_occupants,smoking_allowed_override,pets_considered_override,description,properties!inner(id,suburb,city,state,postcode,country,market_code,landmark,property_type,parking_spaces,pets_considered,smoking_allowed,water_available,electricity_available,security_available,internet_available,public_latitude,public_longitude,household_summary,owner_id))');
    const rows=await rest(`vacancies?select=${select}&id=eq.${id}`); const row=rows[0];
    const property=row?.rooms?.properties;
    if(!row||property?.owner_id!==u.id)throw new Error('Vacancy not found');
    const locations=await rest(`property_private_locations?select=address_line&property_id=eq.${property.id}`);
    return {id:row.id,roomId:row.rooms.id,propertyId:property.id,rentAmount:Number(row.rent_amount??row.monthly_rent),rentCurrency:row.rent_currency||'KES',rentPeriod:row.rent_period||'month',monthlyRent:Number(row.monthly_rent),deposit:row.deposit==null?'':Number(row.deposit),billsIncluded:row.bills_included,availableFrom:row.available_from,minimumStayWeeks:row.minimum_stay_weeks||'',roomName:row.rooms.name,unitType:row.rooms.unit_type||'Bedsitter',furnished:row.rooms.furnished,ensuite:row.rooms.ensuite,maxOccupants:row.rooms.max_occupants||1,smokingAllowedOverride:row.rooms.smoking_allowed_override,petsConsideredOverride:row.rooms.pets_considered_override,description:row.rooms.description||'',locality:property.suburb,city:property.city,region:property.state,country:property.country||'',marketCode:property.market_code||'',postal:property.postcode||'',landmark:property.landmark||'',propertyType:property.property_type||'Apartment',parkingSpaces:Number(property.parking_spaces||0),petsConsidered:Boolean(property.pets_considered),smokingAllowed:Boolean(property.smoking_allowed),waterAvailable:Boolean(property.water_available),electricityAvailable:Boolean(property.electricity_available),securityAvailable:Boolean(property.security_available),internetAvailable:Boolean(property.internet_available),publicLatitude:property.public_latitude==null?'':Number(property.public_latitude),publicLongitude:property.public_longitude==null?'':Number(property.public_longitude),household:property.household_summary||'',address:locations[0]?.address_line||''};
  }
  async function updateListing(id,input){
    return rest('rpc/update_vacancy_listing_v2',{method:'POST',body:JSON.stringify({p_vacancy_id:id,p_locality:input.locality,p_city:input.city,p_region:input.region,p_postal:input.postal||'',p_landmark:input.landmark||'',p_country:input.country||'',p_market_code:input.marketCode,p_address_line:input.address,p_property_type:input.propertyType,p_household_summary:input.household,p_unit_name:input.roomName,p_unit_type:input.unitType||'Studio',p_furnished:input.furnished,p_ensuite:input.ensuite,p_unit_description:input.description,p_rent_amount:Number(input.rentAmount),p_rent_currency:input.rentCurrency,p_rent_period:input.rentPeriod,p_deposit:input.deposit===''?null:Number(input.deposit),p_bills_included:input.billsIncluded,p_available_from:input.availableFrom,p_minimum_stay_weeks:input.minimumStayWeeks?Number(input.minimumStayWeeks):null,p_parking_spaces:Number(input.parkingSpaces||0),p_max_occupants:Number(input.maxOccupants||1),p_pets_considered:Boolean(input.petsConsidered),p_smoking_allowed:Boolean(input.smokingAllowed),p_water_available:Boolean(input.waterAvailable),p_electricity_available:Boolean(input.electricityAvailable),p_security_available:Boolean(input.securityAvailable),p_internet_available:Boolean(input.internetAvailable)})});
  }

  async function myProperties(){
    const u=await currentUser(); if(!u)return [];
    const rows=await rest(`properties?select=id,title,suburb,city,state,postcode,country,market_code,property_type,parking_spaces,pets_considered,smoking_allowed,household_summary,landmark,water_available,electricity_available,security_available,internet_available&owner_id=eq.${u.id}&order=created_at.desc`);
    const ids=rows.map(p=>p.id),privateRows=ids.length?await rest(`property_private_locations?select=property_id,manager_nickname&property_id=in.(${ids.join(',')})`):[],nicknames=new Map(privateRows.map(row=>[row.property_id,row.manager_nickname]));
    return rows.map(p=>({id:p.id,title:p.title||`${p.suburb} property`,managerNickname:nicknames.get(p.id)||'',locality:p.suburb,city:p.city,region:p.state,postal:p.postcode||'',country:p.country||'',marketCode:p.market_code||'',landmark:p.landmark||'',propertyType:p.property_type||'Apartment',parkingSpaces:Number(p.parking_spaces||0),petsConsidered:Boolean(p.pets_considered),smokingAllowed:Boolean(p.smoking_allowed),waterAvailable:Boolean(p.water_available),electricityAvailable:Boolean(p.electricity_available),securityAvailable:Boolean(p.security_available),internetAvailable:Boolean(p.internet_available),household:p.household_summary||''}));
  }
  async function createRoomVacancyForProperty(propertyId,input){
    return rest('rpc/create_unit_vacancy_for_property_v2',{method:'POST',body:JSON.stringify({p_property_id:propertyId,p_unit_name:input.roomName,p_unit_type:input.unitType||'Studio',p_furnished:input.furnished,p_ensuite:input.ensuite,p_max_occupants:Number(input.maxOccupants||1),p_unit_description:input.description,p_smoking_allowed_override:input.smokingOverride===''?null:input.smokingOverride==='true',p_pets_considered_override:input.petsOverride===''?null:input.petsOverride==='true',p_rent_amount:Number(input.rentAmount),p_rent_currency:input.rentCurrency,p_rent_period:input.rentPeriod,p_deposit:input.deposit===''?null:Number(input.deposit),p_bills_included:input.billsIncluded,p_available_from:input.availableFrom,p_minimum_stay_weeks:input.minimumStayWeeks?Number(input.minimumStayWeeks):null})});
  }
  async function setPrivatePropertyNickname(propertyId,nickname){
    return rest('rpc/set_property_manager_nickname',{method:'POST',body:JSON.stringify({p_property_id:propertyId,p_nickname:String(nickname||'').trim()||null})});
  }
  async function updatePropertyDefaults(propertyId,input){
    return rest('rpc/update_property_defaults_ke',{method:'POST',body:JSON.stringify({p_property_id:propertyId,p_smoking_allowed:Boolean(input.smokingAllowed),p_pets_considered:Boolean(input.petsConsidered),p_parking_spaces:Number(input.parkingSpaces||0),p_household_summary:input.household||'',p_landmark:input.landmark||'',p_water_available:Boolean(input.waterAvailable),p_electricity_available:Boolean(input.electricityAvailable),p_security_available:Boolean(input.securityAvailable),p_internet_available:Boolean(input.internetAvailable)})});
  }
  async function updateRoomOverrides(roomId,input){
    return rest('rpc/update_room_overrides',{method:'POST',body:JSON.stringify({p_room_id:roomId,p_smoking_allowed_override:input.smokingOverride===''?null:input.smokingOverride==='true',p_pets_considered_override:input.petsOverride===''?null:input.petsOverride==='true'})});
  }
  async function setVacancyPublicLocation(vacancyId,latitude,longitude){return rest('rpc/set_vacancy_public_location',{method:'POST',body:JSON.stringify({p_vacancy_id:vacancyId,p_latitude:Number(latitude),p_longitude:Number(longitude)})});}

  async function myVacancies(){
    const u=await currentUser(); if(!u)return [];
    const select=encodeURIComponent('id,rent_amount,rent_currency,rent_period,monthly_rent,status,available_from,rooms!inner(id,name,unit_type,properties!inner(id,title,suburb,city,state,country,market_code,owner_id))');
    const rows=await rest(`vacancies?select=${select}&order=created_at.desc`);
    return rows.filter(row=>row.rooms?.properties?.owner_id===u.id);
  }
  async function setVacancyStatus(id,status){
    if(!['active','paused','filled'].includes(status))throw new Error('Invalid status');
    return rest(`vacancies?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status,confirmed_at:status==='active'?new Date().toISOString():undefined})});
  }

  async function deleteAccount(){
    const s=await usableSession(); if(!s?.access_token)throw new Error('Sign in first');
    const res=await fetch(`${URL}/functions/v1/delete-account`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:'{}'});
    const data=await parse(res); saveSession(null); return data;
  }
  async function reconfirmVacancy(id){return rest('rpc/reconfirm_vacancy',{method:'POST',body:JSON.stringify({p_vacancy_id:id})});}
  async function trackEvent(eventName,vacancyId=null,route=null){try{return await rest('rpc/track_event',{method:'POST',body:JSON.stringify({p_event_name:eventName,p_vacancy_id:vacancyId,p_route:route})})}catch{}}
  async function recordError(code,route=null){try{return await rest('rpc/record_client_error',{method:'POST',body:JSON.stringify({p_error_code:code,p_route:route})})}catch{}}

  async function adminVacancies(){const select=encodeURIComponent('id,status,rent_amount,rent_currency,rent_period,monthly_rent,created_at,confirmed_at,expires_at,rooms!inner(name,unit_type,properties!inner(suburb,city,owner_id))');return rest(`vacancies?select=${select}&order=created_at.desc`);}
  async function adminReports(){return rest('reports?select=id,reason,status,created_at,vacancy_id,reported_user_id&order=created_at.desc&limit=20');}
  async function adminOverview(){return rest('rpc/admin_overview',{method:'POST',body:'{}'});}
  async function adminDeactivateVacancy(id){return rest('rpc/admin_deactivate_vacancy',{method:'POST',body:JSON.stringify({p_vacancy_id:id})});}
  async function adminDashboard(){return rest('rpc/admin_dashboard',{method:'POST',body:'{}'});}
  async function adminSearch(query=''){return rest('rpc/admin_search',{method:'POST',body:JSON.stringify({p_query:String(query).trim()})});}
  async function adminResolveReport(id,status,reason){return rest('rpc/admin_resolve_report',{method:'POST',body:JSON.stringify({p_report_id:id,p_status:status,p_reason:reason})});}
  async function adminSetVacancyStatus(id,status,reason){return rest('rpc/admin_set_vacancy_status',{method:'POST',body:JSON.stringify({p_vacancy_id:id,p_status:status,p_reason:reason})});}
  async function adminSetUserStatus(id,status,reason){return rest('rpc/admin_set_user_status',{method:'POST',body:JSON.stringify({p_user_id:id,p_status:status,p_reason:reason})});}
  async function adminAuditLog(){return rest('admin_moderation_log?select=id,action,target_type,target_id,reason,created_at,admin_id&order=created_at.desc&limit=50');}
  async function uploadListingImages(vacancyId, files){
    const u=await currentUser(); if(!u)throw new Error('Sign in first');
    const list=[...files]; if(list.length>8)throw new Error('Maximum 8 images');
    const allowed=new Set(['image/jpeg','image/png','image/webp']);
    for(const file of list){if(!allowed.has(file.type))throw new Error('Use JPG, PNG or WebP images only');if(file.size>10*1024*1024)throw new Error('Each image must be 10MB or smaller')}
    const select=encodeURIComponent('id,room_id,rooms!inner(id,property_id,properties!inner(owner_id))');
    const rows=await rest(`vacancies?select=${select}&id=eq.${vacancyId}`); const row=rows[0];
    if(!row||row.rooms?.properties?.owner_id!==u.id)throw new Error('Vacancy not found');
    const roomId=row.room_id; const uploaded=[];
    for(let i=0;i<list.length;i++){
      const file=list[i], ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${u.id}/${roomId}/${crypto.randomUUID()}.${ext||'jpg'}`;
      const active=await usableSession(); if(!active)throw new Error('Sign in first');
      const res=await fetch(`${URL}/storage/v1/object/room-media/${path}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${active.access_token}`,'Content-Type':file.type,'x-upsert':'false'},body:file});
      if(!res.ok){const text=await res.text();throw new Error(`Image upload failed: ${text||res.status}`)}
      await rest('media',{method:'POST',body:JSON.stringify({owner_id:u.id,room_id:roomId,storage_path:path,mime_type:file.type,sort_order:i,status:'active'})});
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
  return {activeVacancies,signUp,signIn,signOut,currentUser,savedIds,saveVacancy,unsaveVacancy,createListing,listingForEdit,updateListing,myProperties,createRoomVacancyForProperty,setPrivatePropertyNickname,updatePropertyDefaults,updateRoomOverrides,setVacancyPublicLocation,myVacancies,setVacancyStatus,reconfirmVacancy,trackEvent,recordError,adminOverview,adminVacancies,adminReports,adminDeactivateVacancy,adminDashboard,adminSearch,adminResolveReport,adminSetVacancyStatus,adminSetUserStatus,adminAuditLog,deleteAccount,uploadListingImages,startEnquiry,conversations,sendMessage,reportVacancy,blockUser,session};
})();
