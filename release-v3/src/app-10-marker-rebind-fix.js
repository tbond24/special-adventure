function bindExploreMarkerElement(marker,id){
  const el=marker.getElement();
  if(!el)return;
  const listing=vacancies.find(v=>v.id===id);
  el.dataset.vacancyId=id;
  el.setAttribute('role','button');
  el.setAttribute('aria-label',`Select ${listing?.room?.name||'vacancy'}`);
  el.addEventListener('click',()=>selectExplore(id,true));
  el.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      selectExplore(id,true);
    }
  });
}

function selectExplore(id,fromMap=false){
  exploreSelectedId=id;
  document.querySelectorAll('[data-card-id]').forEach(c=>c.classList.toggle('selected',c.dataset.cardId===id));
  for(const [mid,m] of exploreMarkers){
    m.setIcon(pinIcon(mid===id));
    bindExploreMarkerElement(m,mid);
  }
  if(fromMap){
    const card=document.querySelector(`[data-card-id="${id}"]`);
    suppressRailSync=true;
    card?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    setTimeout(()=>{
      suppressRailSync=false;
      selectExplore(id,false);
    },360);
  }
}
