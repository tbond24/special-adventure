(() => {
 window.applyVacancyFavicon=png=>{let link=document.querySelector('link[data-site-favicon]');if(!png){link?.remove();return}if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png)||png.length>40000)return;if(!link){link=document.createElement('link');link.rel='icon';link.type='image/png';link.sizes='64x64';link.dataset.siteFavicon='';document.head.append(link)}link.href=png;};
 VACANCY_BACKEND.faviconConfig().then(rows=>window.applyVacancyFavicon(rows?.[0]?.png)).catch(()=>{});
})();
