// Published-only, code-allowlisted appearance resolver. No drafts are loaded
// on public pages, and an absent/failed configuration leaves compiled CSS intact.
(() => {
  const SELECTORS=Object.freeze({'listing-detail/save-button':'.quiet-detail .quiet-save',
    'create-listing/language-selector':'#listingHost[data-language-page="create"] .listing-language select',
    'edit-listing/language-selector':'#listingHost[data-language-page="edit"] .listing-language select',
    'find/search-button':'.map-first-shell .map-search-panel #searchBtn',
    'find/listing-card':'.discovery-results #cards .listing-card',
    'listing-detail/back-button':'.quiet-detail .quiet-back',
    'listing-detail/share-button':'.quiet-detail .quiet-share'});
  const COPY=Object.freeze({'listing-detail/about-heading':'About this place','listing-detail/features-heading':'Amenities & features'});
  const copyValues=new Map();
  const cardFields=new Set(['radius','background','border_width','border_colour','shadow','margin_top','margin_right','margin_bottom','margin_left','padding_top','padding_right','padding_bottom','padding_left']);
  const sizes={height:[28,72],radius:[0,40],opacity:[20,100],
    border_width:[0,3],margin_top:[0,32],margin_right:[0,32],
    margin_bottom:[0,32],margin_left:[0,32],padding_top:[0,32],padding_right:[0,32],padding_bottom:[0,32],padding_left:[0,32]};
  const shadows={none:'none',subtle:'0 2px 7px rgba(15,23,42,.12)',
    medium:'0 4px 14px rgba(15,23,42,.18)'};
  function declarations(values,key){
    if(!values || typeof values!=='object' || Array.isArray(values))return '';
    const result=[];
    for(const [name,value] of Object.entries(values)){
      if(key==='find/listing-card'?!cardFields.has(name):name.startsWith('padding_'))continue;
      if(Object.prototype.hasOwnProperty.call(sizes,name)){
        const [min,max]=sizes[name];
        if(!Number.isInteger(value)||value<min||value>max)continue;
        if(name==='opacity')result.push('opacity:'+(value/100));
        else if(name==='border_width')result.push('border-width:'+value+'px','border-style:solid');
        else result.push(({
          height:'height',radius:'border-radius',margin_top:'margin-top',
          margin_bottom:'margin-bottom',margin_left:'margin-left',
          margin_right:'margin-right',padding_top:'padding-top',padding_right:'padding-right',padding_bottom:'padding-bottom',padding_left:'padding-left'})[name]+':'+value+'px');
        if(name==='height'&&['find/search-button','listing-detail/back-button','listing-detail/share-button'].includes(key))result.push('min-height:'+value+'px');
      }else if(['background','colour','border_colour'].includes(name)){
        if(typeof value!=='string'||!/^#[a-fA-F0-9]{6}$/.test(value))continue;
        result.push(({background:'background-color',colour:'color',
          border_colour:'border-color'})[name]+':'+value);
      }else if(name==='width'){
        if(!(key==='create-listing/language-selector'||key==='edit-listing/language-selector'?['auto','120px','160px','200px','240px']:['auto','44px','48px','52px']).includes(value))continue;
        result.push('width:'+value);
      }else if(name==='shadow'){
        if(!Object.prototype.hasOwnProperty.call(shadows,value))continue;
        result.push('box-shadow:'+shadows[value]);
      }
    }
    const overridesCompiled=['find/search-button','find/listing-card','listing-detail/back-button','listing-detail/share-button'].includes(key);
    return result.map(value=>overridesCompiled?value+'!important':value).join(';');
  }
  function cssForConfig(config,key='listing-detail/save-button'){
    if(!Object.prototype.hasOwnProperty.call(SELECTORS,key))return '';
    if(!config || typeof config!=='object' || Array.isArray(config))return '';
    let css='';
    for(const scope of ['all','mobile','desktop']){
      const declaration=declarations(config[scope],key);
      if(!declaration)continue;
      let rule=SELECTORS[key]+'{'+declaration+'}';
      if(key==='find/listing-card'&&typeof config[scope]?.background==='string'&&/^#[a-fA-F0-9]{6}$/.test(config[scope].background))rule+=SELECTORS[key]+' .card-body{background-color:var(--card,#ffffff)!important;color:var(--ink,#172033)!important}';
      css+=scope==='all'?rule:
        '@media '+(scope==='mobile'?'(max-width:767px)':'(min-width:768px)')+'{'+rule+'}';
      css+='\n';
    }
    return css;
  }
  let inflight=null;
  function copyForConfig(config){
    const value=config?.all?.text;
    return config&&Object.keys(config).length===1&&config.all&&Object.keys(config.all).length===1&&typeof value==='string'&&value===value.trim()&&Array.from(value).length>=1&&Array.from(value).length<=80&&!/[<>\u0000-\u001f\u007f]/.test(value)?value:null;
  }
  function textFor(key){return Object.prototype.hasOwnProperty.call(COPY,key)?(/^en(?:-|$)/i.test(document.documentElement.lang||'en')?copyValues.get(key):null)||COPY[key]:'';}
  function applyCopy(){if(!/^en(?:-|$)/i.test(document.documentElement.lang||'en'))return;for(const key of Object.keys(COPY))for(const node of document.querySelectorAll('[data-appearance-copy="'+key+'"]'))node.textContent=textFor(key);}
  const style=document.createElement('style');style.dataset.vacancyPublishedAppearance='';
  document.head.append(style);
  async function refresh(){
    const rows=await VACANCY_BACKEND.siteAppearancePublished();
    if(!Array.isArray(rows))throw new Error('Published appearance response unavailable');
    style.textContent=Object.keys(SELECTORS).map(key=>{const row=rows.find(item=>item?.key===key);return row?cssForConfig(row.config,key):'';}).filter(Boolean).join('\n');
    copyValues.clear();for(const key of Object.keys(COPY)){const row=rows.find(item=>item?.key===key);const value=copyForConfig(row?.config);if(value)copyValues.set(key,value);}applyCopy();
    return Number(rows.find(item=>item?.key==='listing-detail/save-button')?.revision)||0;
  }
  function ensure(){
    if(!inflight)inflight=refresh().catch(()=>0);
    return inflight;
  }
  window.VACANCY_SITE_APPEARANCE={ensure,
    refresh:async()=>{inflight=refresh().catch(()=>0);return inflight;},
    cssForConfig,textFor};
})();
