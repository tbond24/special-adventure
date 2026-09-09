const renderDetailBeforeExperience=renderDetail;

function detailGalleryMarkup(v){
  const media=(v.room.media||[]).filter(item=>item?.url);
  const slides=media.length?media:[null];
  return `<section class="detail-gallery" aria-label="Listing photos">
    <div class="detail-gallery-track" data-detail-gallery>${slides.map((item,index)=>`<div class="detail-gallery-slide" data-detail-slide="${index}">${item?`<img src="${escapeHtml(item.url)}" alt="${escapeHtml(v.room.name)} photo ${index+1}">`:'<div class="detail-photo-placeholder" aria-label="No listing photo available"></div>'}</div>`).join('')}</div>
    ${media.length>1?`<div class="detail-thumbnails" aria-label="Photo thumbnails">${media.map((item,index)=>`<button data-detail-thumb="${index}" class="detail-thumbnail${index===0?' active':''}" aria-label="Show photo ${index+1}"${index===0?' aria-current="true"':''}><img src="${escapeHtml(item.url)}" alt=""></button>`).join('')}</div>`:''}
  </section>`;
}

function initDetailLocationPreview(v){
  const node=document.querySelector('#detailLocationMap');
  const lat=Number(v.property.publicLatitude),lon=Number(v.property.publicLongitude);
  if(!node||!Number.isFinite(lat)||!Number.isFinite(lon)||typeof L==='undefined')return;
  const map=L.map(node,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false}).setView([lat,lon],14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  L.circleMarker([lat,lon],{radius:10,color:'#fff',weight:3,fillColor:'#ff5a3d',fillOpacity:1}).addTo(map).bindTooltip('Approximate location');
}

function initListingLightbox(v){
  const media=(v.room.media||[]).filter(item=>item?.url);if(!media.length)return;
  const dialog=document.createElement('dialog');dialog.className='listing-lightbox';dialog.setAttribute('aria-label','Listing photo viewer');
  dialog.innerHTML=`<button class="lightbox-close" aria-label="Close photo viewer">×</button><button class="lightbox-prev" aria-label="Previous photo">‹</button><img alt=""><button class="lightbox-next" aria-label="Next photo">›</button><span></span>`;document.body.append(dialog);
  let index=0,startX=0;const show=next=>{index=(next+media.length)%media.length;dialog.querySelector('img').src=media[index].url;dialog.querySelector('img').alt=`${v.room.name} photo ${index+1}`;dialog.querySelector('span').textContent=`${index+1} / ${media.length}`};
  const open=next=>{show(next);dialog.showModal()};dialog.querySelector('.lightbox-close').onclick=()=>dialog.close();dialog.querySelector('.lightbox-prev').onclick=()=>show(index-1);dialog.querySelector('.lightbox-next').onclick=()=>show(index+1);dialog.onclick=event=>{if(event.target===dialog)dialog.close()};
  dialog.onkeydown=event=>{if(event.key==='ArrowLeft')show(index-1);if(event.key==='ArrowRight')show(index+1)};dialog.addEventListener('touchstart',event=>startX=event.touches[0].clientX,{passive:true});dialog.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-startX;if(Math.abs(distance)>45)show(index+(distance<0?1:-1))},{passive:true});
  document.querySelectorAll('.detail-gallery-slide img').forEach((image,next)=>{image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label',`Open photo ${next+1} of ${media.length}`);image.onclick=()=>open(next);image.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open(next)}}});
}

renderDetail=function(id){
  renderDetailBeforeExperience(id);
  const v=vacancies.find(item=>item.id===id),hero=document.querySelector('.detail-hero');
  if(!v||!hero)return;
  const originalPhoto=hero.querySelector('.detail-photo');
  originalPhoto?.remove();
  hero.insertAdjacentHTML('beforebegin',`<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#home">Find</a><span aria-hidden="true">›</span><span>${escapeHtml(v.property.suburb||v.property.city||'Listing')}</span><span aria-hidden="true">›</span><span aria-current="page">${escapeHtml(v.room.name)}</span></nav>${detailGalleryMarkup(v)}`);
  hero.classList.add('detail-summary');
  hero.insertAdjacentHTML('beforeend',`<aside class="detail-map-card"><div id="detailLocationMap" aria-label="Approximate listing location"></div><span>Approximate location · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a></span></aside>`);
  if(v.property.landmark){const landmark=[...hero.querySelectorAll('p.muted')].find(node=>node.textContent.startsWith('Near '));if(landmark)landmark.textContent=/^near\s/i.test(v.property.landmark)?v.property.landmark:`Near ${v.property.landmark}`}
  const gallery=document.querySelector('[data-detail-gallery]'),thumbs=[...document.querySelectorAll('[data-detail-thumb]')];
  const select=index=>thumbs.forEach((thumb,i)=>{thumb.classList.toggle('active',i===index);if(i===index)thumb.setAttribute('aria-current','true');else thumb.removeAttribute('aria-current')});
  thumbs.forEach(thumb=>thumb.onclick=()=>{const index=Number(thumb.dataset.detailThumb);gallery.scrollTo({left:gallery.clientWidth*index,behavior:'smooth'});select(index)});
  gallery?.addEventListener('scroll',()=>select(Math.round(gallery.scrollLeft/gallery.clientWidth)));
  initListingLightbox(v);
  initDetailLocationPreview(v);
  window.scrollTo({top:0,left:0,behavior:'instant'});
};
