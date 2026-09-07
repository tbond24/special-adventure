function updateExploreMarkers(rows){
  if(!exploreMap)return;
  for(const marker of exploreMarkers.values())marker.remove();
  exploreMarkers.clear();
  const points=[];
  for(const v of rows){
    const lat=v.property.publicLatitude,lon=v.property.publicLongitude;
    if(lat==null||lon==null)continue;
    points.push([lat,lon]);
    const marker=L.marker([lat,lon],{icon:pinIcon(v.id===exploreSelectedId),keyboard:true,title:v.room.name}).addTo(exploreMap);
    marker.on('click',()=>selectExplore(v.id,true));
    bindExploreMarkerElement(marker,v.id);
    exploreMarkers.set(v.id,marker);
  }
  updateMapRadius();
  if(!searchCenter&&points.length>1){
    const bounds=L.latLngBounds(points);
    exploreMap.fitBounds(bounds,{padding:[48,48],maxZoom:13,animate:false});
  }
}
