function syncRadiusUI(){
  const label=document.querySelector('#radiusLabel');
  const status=document.querySelector('#radiusStatus');
  const clear=document.querySelector('#clearLocation');
  if(label)label.textContent=`${radiusValue} ${market().distanceUnit}`;
  if(status)status.textContent=searchCenter?`Filtering within ${radiusValue} ${market().distanceUnit} of your chosen centre.`:'Radius activates after choosing your location.';
  if(clear)clear.disabled=!searchCenter;
  updateMapRadius();
}
function useMyLocation(){
  if(!navigator.geolocation){toast('Location is not supported in this browser');return}
  navigator.geolocation.getCurrentPosition(pos=>{
    searchCenter={lat:pos.coords.latitude,lon:pos.coords.longitude};
    syncRadiusUI();
    if(exploreMap){suppressMapMove=true;exploreMap.setView([searchCenter.lat,searchCenter.lon],13)}
    toast('Searching around your location');
    applySearch();
  },()=>toast('Location permission was not granted'),{enableHighAccuracy:false,timeout:8000,maximumAge:300000});
}
