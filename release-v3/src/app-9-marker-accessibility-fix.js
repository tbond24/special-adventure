function updateExploreMarkers(rows){
  if(!exploreMap)return;
  for(const marker of exploreMarkers.values())marker.remove();
  exploreMarkers.clear();
  for(const v of rows){
    const lat=v.property.publicLatitude,lon=v.property.publicLongitude;
    if(lat==null||lon==null)continue;
    const marker=L.marker([lat,lon],{icon:pinIcon(v.id===exploreSelectedId),keyboard:true,title:v.room.name}).addTo(exploreMap);
    marker.on('click',()=>selectExplore(v.id,true));
    const el=marker.getElement();
    if(el){
      el.dataset.vacancyId=v.id;
      el.setAttribute('role','button');
      el.setAttribute('aria-label',`Select ${v.room.name}`);
      el.addEventListener('click',()=>selectExplore(v.id,true));
      el.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();selectExplore(v.id,true)}
      });
    }
    exploreMarkers.set(v.id,marker);
  }
  updateMapRadius();
}
