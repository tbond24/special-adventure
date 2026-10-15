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
  window.VACANCY_ICON_LIBRARY={refresh,apply,slots,builtins:[...slots],previewNodes:makeNodes,validPath,svgPathData,get listingOptions(){return listingOptions},ready:null};
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
    panel.textContent='Loading icon library.';host.append(panel);
    try{if(!window.mountVacancyReviewedIcons)await import('./admin-icon-editor.js?v=20261016');if(panel.isConnected)await window.mountVacancyReviewedIcons(panel);}
    catch(error){if(panel.isConnected)panel.textContent='Icon library unavailable: '+(error.message||'Reload to retry');}
  };
})();
