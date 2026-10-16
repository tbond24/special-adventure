(() => {
 window.mountVacancyFaviconDraft=async host=>{
  if(!window.mountVacancyPresentationDraft)await import('./admin-presentation-draft.js?v=20261016-reconciled');
  const empty=c=>c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===0;
  const valid=c=>empty(c)||(c&&Object.keys(c).length===1&&typeof c.png==='string'&&c.png.length<=40000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(c.png));
  await window.mountVacancyPresentationDraft(host,{
   key:'site-favicon',title:'Site favicon',impact:'Changes only the shared browser tab icon. Private previews never change the current tab icon.',valid,
   validateAssets:async(...configs)=>{
    for(const config of configs){
     if(config==null||empty(config))continue;
     if(!valid(config))throw Error('Saved favicon format is unavailable. Reload saved state.');
     const image=new Image();image.src=config.png;
     try{await image.decode();}catch{throw Error('Saved favicon could not be decoded. Choose a valid image before review.');}
     if(image.naturalWidth!==64||image.naturalHeight!==64)throw Error('Saved favicon must decode to 64 × 64 pixels.');
    }
   },
   summary:c=>c.png?'Normalized 64 × 64 PNG':'Compiled tab icon',
   mount(controls,api){
    const p=document.createElement('p');p.textContent='PNG, JPG, WebP, GIF, AVIF, BMP or ICO; under 10 MB and 40 megapixels. A still frame is fitted into a square 64 × 64 PNG.';
    const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/x-icon,image/vnd.microsoft.icon';input.setAttribute('aria-label','Choose favicon image');
    const original=document.createElement('button');original.type='button';original.textContent='Use compiled tab icon (draft)';original.onclick=()=>api.change({});
    let serial=0;
    input.onchange=async()=>{
     const file=input.files?.[0],turn=++serial;if(!file)return;let url;
     try{
      if(file.size>10*1024*1024)throw Error('Choose an image smaller than 10 MB.');
      if(!/^image\/(png|jpeg|webp|gif|avif|bmp|x-icon|vnd.microsoft.icon)$/.test(file.type))throw Error('Choose a supported image format.');
      url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();
      if(!api.current()||turn!==serial)return;
      if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>40000000)throw Error('Choose an image below 40 megapixels.');
      const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
      const scale=Math.min(64/image.naturalWidth,64/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(64-w)/2,(64-h)/2,w,h);
      const png=canvas.toDataURL('image/png');if(png.length>40000)throw Error('Normalized PNG is too large. Choose a simpler image.');api.change({png});
     }catch(error){if(api.current())api.message(error.message||'Image could not be decoded.');}finally{if(url)URL.revokeObjectURL(url);}
    };controls.append(p,input,original);
   },
   paint(controls,target,c,enabled){controls.querySelectorAll('input,button').forEach(n=>n.disabled=!enabled);target.replaceChildren();if(c.png){for(const size of [64,16]){const img=document.createElement('img');img.src=c.png;img.width=img.height=size;img.alt='Private favicon preview at '+size+' pixels';target.append(img);}}},
   confirm:async c=>{const rows=await VACANCY_BACKEND.faviconConfig({anonymous:true});return rows.length===1&&(rows[0].png||null)===(c.png||null);},
   review:(host,before,after)=>{host.replaceChildren();for(const [name,value] of [['Published',before],['Private draft',after]]){const p=document.createElement('p');p.textContent=name+(value.png?'':' · compiled tab icon');host.append(p);if(value.png){const img=document.createElement('img');img.src=value.png;img.width=img.height=64;img.alt=name+' favicon';host.append(img);}}},
   onPublished:c=>window.applyVacancyFavicon(c.png||null),
   legacyHistory:async()=>{const legacy=await VACANCY_BACKEND.adminFavicon();return legacy?.revision>0?[{id:'previous-'+legacy.revision,config:legacy.previous_png?{png:legacy.previous_png}:{}}]:[];}
  });
 };
})();
