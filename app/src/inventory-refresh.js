let vacancyInventoryRefreshBusy=false;

async function refreshFindInventory(){
  if(vacancyInventoryRefreshBusy||parseHash().name!=='home')return;
  vacancyInventoryRefreshBusy=true;
  const expectedHash=location.hash;
  try{
    await refreshVacancies();
    if(location.hash===expectedHash&&parseHash().name==='home')renderHome();
  }catch{
    // Keep the last successfully loaded inventory if a refresh temporarily fails.
  }finally{
    vacancyInventoryRefreshBusy=false;
  }
}

window.addEventListener('hashchange',()=>{
  if(parseHash().name==='home')setTimeout(refreshFindInventory,0);
});
window.addEventListener('focus',()=>{
  if(parseHash().name==='home')refreshFindInventory();
});
