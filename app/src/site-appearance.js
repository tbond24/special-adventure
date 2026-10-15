// Published-only, code-allowlisted appearance resolver. No drafts are loaded
// on public pages, and an absent/failed configuration leaves compiled CSS intact.
(() => {
  const selectors={'listing-detail/save-button':'.quiet-detail .quiet-save',
    'listing-create/language-selector':'#listingHost[data-mode="create"] > .listing-language select',
    'listing-edit/language-selector':'#listingHost[data-mode="edit"] > .listing-language select'};
  const sizes={height:[28,72],radius:[0,40],opacity:[20,100],
    border_width:[0,3],margin_top:[0,32],margin_right:[0,32],
    margin_bottom:[0,32],margin_left:[0,32]};
  const shadows={none:'none',subtle:'0 2px 7px rgba(15,23,42,.12)',
    medium:'0 4px 14px rgba(15,23,42,.18)'};
  function declarations(values,key){
    const language=key!=='listing-detail/save-button';
    if(!values || typeof values!=='object' || Array.isArray(values))return '';
    const result=[];
    for(const [name,value] of Object.entries(values)){
      if(language&&/^padding_(top|right|bottom|left)$/.test(name)){
        if(Number.isInteger(value)&&value>=0&&value<=24)result.push(name.replace('_','-')+':'+value+'px');
      }else if(Object.prototype.hasOwnProperty.call(sizes,name)){
        const [min,max]=sizes[name];
        if(!Number.isInteger(value)||value<min||value>max)continue;
        if(name==='opacity')result.push('opacity:'+(value/100));
        else if(name==='border_width')result.push('border-width:'+value+'px','border-style:solid');
        else result.push(({
          height:'height',radius:'border-radius',margin_top:'margin-top',
          margin_bottom:'margin-bottom',margin_left:'margin-left',
          margin_right:'margin-right'})[name]+':'+value+'px');
      }else if(['background','colour','border_colour'].includes(name)){
        if(typeof value!=='string'||!/^#[a-fA-F0-9]{6}$/.test(value))continue;
        result.push(({background:'background-color',colour:'color',
          border_colour:'border-color'})[name]+':'+value);
      }else if(name==='width'){
        if(!(language?['auto','160px','200px','240px']:['auto','44px','48px','52px']).includes(value))continue;
        result.push('width:'+value);
      }else if(name==='shadow'){
        if(!Object.prototype.hasOwnProperty.call(shadows,value))continue;
        result.push('box-shadow:'+shadows[value]);
      }
      if(language&&['margin_left','margin_right'].includes(name)&&Number.isInteger(value)&&value>=0&&value<=32)
        result.push('--vacancy-style-'+name.replace('_','-')+':'+value+'px');
    }
    return result.join(';');
  }
  function cssForConfig(config,key='listing-detail/save-button'){
    const SELECTOR=selectors[key];if(!SELECTOR)return '';
    if(!config || typeof config!=='object' || Array.isArray(config))return '';
    let css='';
    for(const scope of ['all','mobile','desktop']){
      const declaration=declarations(config[scope],key);
      if(!declaration)continue;
      const rule=SELECTOR+'{'+declaration+'}';
      css+=scope==='all'?rule:
        '@media '+(scope==='mobile'?'(max-width:767px)':'(min-width:768px)')+'{'+rule+'}';
      css+='\n';
    }
    return css&&key!=='listing-detail/save-button'?SELECTOR+'{box-sizing:border-box;max-width:calc(100% - var(--vacancy-style-margin-left,0px) - var(--vacancy-style-margin-right,0px))}\n'+css:css;
  }
  let inflight=null;
  const style=document.createElement('style');style.dataset.vacancyPublishedAppearance='';
  document.head.append(style);
  async function refresh(){
    const rows=await VACANCY_BACKEND.siteAppearancePublished();
    if(!Array.isArray(rows))throw new Error('Published appearance response unavailable');
    const known=rows.filter(row=>Object.hasOwn(selectors,row?.key));
    style.textContent=known.map(row=>cssForConfig(row.config,row.key)).join('\n');
    return Number(known.find(row=>row.key==='listing-detail/save-button')?.revision)||0;
  }
  function ensure(){
    if(!inflight)inflight=refresh().catch(()=>0);
    return inflight;
  }
  window.VACANCY_SITE_APPEARANCE={ensure,
    refresh:async()=>{inflight=refresh().catch(()=>0);return inflight;},
    cssForConfig};
})();
