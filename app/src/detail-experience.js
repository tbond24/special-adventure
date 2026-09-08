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
  initDetailLocationPreview(v);
  window.scrollTo({top:0,left:0,behavior:'instant'});
};
