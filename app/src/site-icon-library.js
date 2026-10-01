(() => {
  const NS='http://www.w3.org/2000/svg';
  const symbols=[...document.querySelectorAll('.icon-sprite symbol')];
  const originals=new Map(symbols.map(symbol=>[symbol.id.slice(5),[...symbol.childNodes].map(node=>node.cloneNode(true))]));
  const slots=[...originals.keys()];
  const labels=new Map(slots.map(slot=>[slot,slot.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase())]));
  const overrides=new Map();
  let listingOptions=[];
  const validPath=path=>typeof path==='string'&&path.length>=3&&path.length<=1200&&/^[MmLlHhVvCcSsQqTtAaZz0-9 .,+-]+$/.test(path);
  function svgPathData(root){
    const number=(node,name,fallback)=>{
      const value=node.getAttribute(name);
      if(value===null)return fallback;
      if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))throw Error('Invalid SVG coordinate');
      const result=Number(value);
      if(!Number.isFinite(result)||Math.abs(result)>1000)throw Error('Invalid SVG coordinate');
      return result;
    };
    const points=node=>{
      const values=String(node.getAttribute('points')||'').trim().split(/[\s,]+/).map(value=>{
        if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))throw Error('Invalid SVG points');
        const result=Number(value);
        if(!Number.isFinite(result)||Math.abs(result)>1000)throw Error('Invalid SVG points');
        return result;
      });
      if(values.length<4||values.length%2)throw Error('Invalid SVG points');
      return `M ${values[0]} ${values[1]} ${values.slice(2).reduce((out,value,index)=>out+(index%2?' '+value:' L '+value),'')}`;
    };
    const parts=[...root.children].filter(node=>!['title','desc'].includes(node.localName)).map(node=>{
      if(node.namespaceURI!==NS)throw Error('Unsupported SVG element');
      const n=(name,fallback=0)=>number(node,name,fallback);
      if(node.localName==='path')return node.getAttribute('d')||'';
      if(node.localName==='line')return `M ${n('x1')} ${n('y1')} L ${n('x2')} ${n('y2')}`;
      if(node.localName==='polyline'||node.localName==='polygon')return points(node)+(node.localName==='polygon'?' Z':'');
      if(node.localName==='circle'||node.localName==='ellipse'){
        const cx=n('cx'),cy=n('cy'),rx=node.localName==='circle'?n('r'):n('rx'),ry=node.localName==='circle'?rx:n('ry');
        if(rx<=0||ry<=0)throw Error('Invalid SVG radius');
        return `M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx-rx} ${cy}`;
      }
      if(node.localName==='rect'){
        const x=n('x'),y=n('y'),w=n('width'),h=n('height');
        if(w<=0||h<=0)throw Error('Invalid SVG rectangle');
        const rx=Math.min(node.hasAttribute('rx')?n('rx'):node.hasAttribute('ry')?n('ry'):0,w/2);
        const ry=Math.min(node.hasAttribute('ry')?n('ry'):rx,h/2);
        if(rx<0||ry<0)throw Error('Invalid SVG radius');
        if(!rx||!ry)return `M ${x} ${y} H ${x+w} V ${y+h} H ${x} Z`;
        return `M ${x+rx} ${y} H ${x+w-rx} A ${rx} ${ry} 0 0 1 ${x+w} ${y+ry} V ${y+h-ry} A ${rx} ${ry} 0 0 1 ${x+w-rx} ${y+h} H ${x+rx} A ${rx} ${ry} 0 0 1 ${x} ${y+h-ry} V ${y+ry} A ${rx} ${ry} 0 0 1 ${x+rx} ${y} Z`;
      }
      throw Error('Unsupported SVG element');
    });
    const path=parts.join(' ').trim();
    if(!parts.length||!validPath(path))throw Error('Invalid SVG path');
    const check=document.createElementNS(NS,'path');check.setAttribute('d',path);
    if(check.getTotalLength()<=0)throw Error('Invalid SVG path');
    return path;
  }
  function makeNodes(entry,slot){
    if(entry?.source_slot&&originals.has(entry.source_slot))return originals.get(entry.source_slot).map(node=>node.cloneNode(true));
    if(entry?.path_d&&validPath(entry.path_d)){
      const path=document.createElementNS(NS,'path');
      path.setAttribute('d',entry.path_d);
      return [path];
    }
    return originals.get(slot).map(node=>node.cloneNode(true));
  }
  function apply(slot,entry){
    if(!originals.has(slot))return;
    document.getElementById('icon-'+slot).replaceChildren(...makeNodes(entry,slot));
    if(entry)overrides.set(slot,entry);else overrides.delete(slot);
  }
  async function refresh(){
    try {
      const [rows,catalog]=await Promise.all([VACANCY_BACKEND.siteIconOverrides(),VACANCY_BACKEND.siteIconSlots()]);
      if(!Array.isArray(rows))return;
      listingOptions=(catalog||[]).filter(item=>item.listing_kind);
      for(const item of listingOptions){
        if(originals.has(item.slot))continue;
        const symbol=document.createElementNS(NS,'symbol');symbol.id='icon-'+item.slot;symbol.setAttribute('viewBox','0 0 24 24');
        document.querySelector('.icon-sprite').append(symbol);
        originals.set(item.slot,[]);slots.push(item.slot);labels.set(item.slot,item.label);
      }
      for(const slot of slots)apply(slot,rows.find(row=>row.slot===slot)||null);
      document.dispatchEvent(new Event('vacancy:listing-icons-ready'));
    } catch(error) { console.warn('Icon overrides unavailable; defaults retained',error); }
  }
  window.VACANCY_ICON_LIBRARY={refresh,apply,slots,validPath,svgPathData,get listingOptions(){return listingOptions},ready:null};
  window.VACANCY_ICON_LIBRARY.ready=refresh();

  const before=renderAdmin;
  renderAdmin=async function(){
    await before();
    if(!currentUser||VACANCY_BACKEND.assuranceLevel()!=='aal2')return;
    const host=document.querySelector('#adminHost');
    if(!host||host.classList.contains('empty')||document.querySelector('#siteIconLibrary'))return;
    const panel=document.createElement('section');
    panel.id='siteIconLibrary';
    panel.className='panel';
    panel.innerHTML='<div class="section-head"><div><h2>Icon library</h2><p class="muted">Change a site-wide icon. Preview before saving; earlier versions remain available.</p></div></div><form id="addListingIcon" class="icon-catalog-form"><h3>Add a listing feature or utility</h3><label>Name<input name="label" maxlength="60" required placeholder="e.g. Swimming pool"></label><label>Type<select name="kind"><option value="amenity">Amenity or feature</option><option value="utility">Utility</option></select></label><label>24 × 24 SVG icon<input name="file" type="file" accept=".svg,image/svg+xml" required></label><button class="primary">Add to library</button><p role="status"></p></form><div class="icon-library-layout"><div><label>Find an icon<input id="iconSearch" type="search" placeholder="Search icons"></label><div id="iconSlots" class="icon-library-grid"></div></div><div id="iconEditor" class="icon-library-editor"></div></div>';
    host.append(panel);
    panel.querySelector('#addListingIcon').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=form.querySelector('[role="status"]'),file=form.elements.file.files?.[0];
      if(!file||file.size>20000){status.textContent='Choose an SVG smaller than 20 KB.';return}
      button.disabled=true;
      try{
        const doc=new DOMParser().parseFromString(await file.text(),'image/svg+xml'),root=doc.documentElement;
        if(root.localName!=='svg'||root.getAttribute('viewBox')?.trim()!=='0 0 24 24'||doc.querySelector('parsererror'))throw Error('Use a 24 × 24 SVG icon.');
        const path=svgPathData(root);
        const slot=await VACANCY_BACKEND.adminAddListingIcon(form.elements.label.value.trim(),form.elements.kind.value,path);
        await refresh();selected=slot;draft=overrides.get(slot)||null;drawGrid();drawEditor();form.reset();status.textContent='Added to the library and listing choices.';
      }catch(error){status.textContent=error.message||'Could not add icon.'}finally{button.disabled=false}
    };
    const grid=panel.querySelector('#iconSlots'),editor=panel.querySelector('#iconEditor');
    let selected=slots[0],draft=null;
    const svgFor=slot=>{const svg=document.createElementNS(NS,'svg'),use=document.createElementNS(NS,'use');svg.setAttribute('viewBox','0 0 24 24');svg.classList.add('icon-library-svg');use.setAttribute('href','#icon-'+slot);svg.append(use);return svg};
    function drawGrid(){
      const query=panel.querySelector('#iconSearch').value.trim().toLowerCase();
      grid.replaceChildren();
      for(const slot of slots.filter(slot=>labels.get(slot).toLowerCase().includes(query))){
        const button=document.createElement('button');
        button.type='button';button.className='icon-library-item'+(slot===selected?' selected':'');
        button.append(svgFor(slot),document.createTextNode(labels.get(slot)));
        button.onclick=()=>{selected=slot;draft=overrides.get(slot)||null;drawGrid();drawEditor()};
        grid.append(button);
      }
    }
    const notice=message=>{const output=editor.querySelector('#iconMessage');if(output)output.textContent=message};
    function drawEditor(){
      editor.replaceChildren();
      const title=document.createElement('h3');title.textContent=labels.get(selected);
      const preview=document.createElement('div');preview.className='icon-library-preview';
      const previewSvg=document.createElementNS(NS,'svg');previewSvg.setAttribute('viewBox','0 0 24 24');previewSvg.classList.add('icon-library-svg');
      previewSvg.replaceChildren(...makeNodes(draft,selected));preview.append(previewSvg);
      const selectLabel=document.createElement('label');selectLabel.textContent='Use a built-in icon';
      const select=document.createElement('select');select.id='iconSource';
      const first=document.createElement('option');first.value='';first.textContent='Choose an icon';select.append(first);
      for(const slot of slots){const option=document.createElement('option');option.value=slot;option.textContent=labels.get(slot);select.append(option)}
      select.value=draft?.source_slot||'';selectLabel.append(select);
      select.onchange=()=>{draft=select.value?{source_slot:select.value,path_d:null}:null;drawEditor()};
      const uploadLabel=document.createElement('label');uploadLabel.textContent='Or upload a 24 × 24 SVG icon';
      const upload=document.createElement('input');upload.type='file';upload.accept='.svg,image/svg+xml';uploadLabel.append(upload);
      upload.onchange=async()=>{
        const file=upload.files?.[0];if(!file)return;
        if(file.size>20000){notice('SVG file is too large.');return}
        const raw=await file.text(),doc=new DOMParser().parseFromString(raw,'image/svg+xml'),root=doc.documentElement;
        if(root.localName!=='svg'||root.getAttribute('viewBox')?.trim()!=='0 0 24 24'||doc.querySelector('parsererror')){notice('Use an SVG with a 0 0 24 24 viewBox.');return}
        let path;
        try{path=svgPathData(root)}catch{notice('Use a simple 24 × 24 SVG with paths, lines, circles, rectangles or polygons.');return}
        draft={source_slot:null,path_d:path};drawEditor();notice('Custom icon ready to preview. Save to publish it.');
      };
      const actions=document.createElement('div');actions.className='icon-library-actions';
      const save=document.createElement('button');save.type='button';save.className='primary';save.textContent='Save icon';
      save.onclick=async()=>{
        save.disabled=true;notice('Saving…');
        try{await VACANCY_BACKEND.adminSetSiteIcon(selected,draft?.source_slot||null,draft?.path_d||null);apply(selected,draft);drawGrid();drawEditor();notice('Icon saved across the site.');loadHistory()}
        catch(error){save.disabled=false;notice(error.message||'Could not save icon.')}
      };
      const reset=document.createElement('button');reset.type='button';reset.textContent='Restore original';
      reset.disabled=listingOptions.some(item=>item.slot===selected);
      reset.onclick=()=>{draft=null;drawEditor();notice('Original previewed. Save to publish it.')};
      actions.append(save,reset);
      const message=document.createElement('p');message.id='iconMessage';message.setAttribute('role','status');
      const history=document.createElement('div');history.id='iconHistory';
      editor.append(title,preview,selectLabel,uploadLabel,actions,message,history);
      loadHistory();
    }
    async function loadHistory(){
      const history=editor.querySelector('#iconHistory');if(!history)return;
      history.textContent='Loading previous versions…';
      try{
        const rows=await VACANCY_BACKEND.adminIconRevisions(selected);
        if(!history.isConnected)return;
        history.replaceChildren();
        const heading=document.createElement('h4');heading.textContent='Previous versions';history.append(heading);
        if(!rows.length){const empty=document.createElement('p');empty.textContent='No saved changes yet.';history.append(empty)}
        for(const row of rows){
          const item=document.createElement('div');item.className='icon-library-history';
          const label=document.createElement('span');label.textContent=(row.source_slot?labels.get(row.source_slot):row.path_d?'Custom icon':'Original icon')+' · '+new Date(row.created_at).toLocaleString();
          const restore=document.createElement('button');restore.type='button';restore.textContent='Preview';
          restore.onclick=()=>{draft=row.source_slot||row.path_d?{source_slot:row.source_slot,path_d:row.path_d}:null;drawEditor();notice('Previous version previewed. Save to publish it.')};
          item.append(label,restore);history.append(item);
        }
      }catch(error){history.textContent='Previous versions unavailable: '+error.message}
    }
    panel.querySelector('#iconSearch').oninput=drawGrid;
    draft=overrides.get(selected)||null;drawGrid();drawEditor();
  };
})();
