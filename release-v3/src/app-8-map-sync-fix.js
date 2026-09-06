var suppressRailSync=false;
function selectExplore(id,fromMap=false){
  exploreSelectedId=id;
  document.querySelectorAll('[data-card-id]').forEach(c=>c.classList.toggle('selected',c.dataset.cardId===id));
  for(const [mid,m] of exploreMarkers)m.setIcon(pinIcon(mid===id));
  if(fromMap){
    const card=document.querySelector(`[data-card-id="${id}"]`);
    suppressRailSync=true;
    card?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    setTimeout(()=>{suppressRailSync=false;selectExplore(id,false)},360);
  }
}
function bindCardRail(){
  const rail=document.querySelector('#cards');
  if(!rail)return;
  rail.addEventListener('scroll',()=>{
    if(suppressRailSync)return;
    clearTimeout(railTimer);
    railTimer=setTimeout(()=>{
      if(suppressRailSync)return;
      const cards=[...rail.querySelectorAll('[data-card-id]')];
      if(!cards.length)return;
      const centre=rail.getBoundingClientRect().left+rail.clientWidth/2;
      cards.sort((a,b)=>Math.abs((a.getBoundingClientRect().left+a.offsetWidth/2)-centre)-Math.abs((b.getBoundingClientRect().left+b.offsetWidth/2)-centre));
      selectExplore(cards[0].dataset.cardId,false);
    },80);
  },{passive:true});
}
