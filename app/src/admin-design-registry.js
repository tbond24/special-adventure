// Explicit bindings, not a DOM scan or a generic CSS editor.
// Each Create/Edit language instance is bound to its actual host.
(() => {
  const fields = Object.freeze({
    width: {label:'Width',kind:'choice',choices:['auto','44px','48px','52px']},
    height: {label:'Height',kind:'integer',min:28,max:72,unit:'px'},
    radius: {label:'Border radius',kind:'integer',min:0,max:40,unit:'px'},
    background: {label:'Background colour',kind:'colour'},
    colour: {label:'Text / icon colour',kind:'colour'},
    opacity: {label:'Opacity',kind:'integer',min:20,max:100,unit:'%'},
    border_width: {label:'Border width',kind:'integer',min:0,max:3,unit:'px'},
    border_colour: {label:'Border colour',kind:'colour'},
    shadow: {label:'Shadow',kind:'choice',choices:['none','subtle','medium']},
    margin_top: {label:'Margin top',kind:'integer',min:0,max:32,unit:'px'},
    margin_right: {label:'Margin right',kind:'integer',min:0,max:32,unit:'px'},
    margin_bottom: {label:'Margin bottom',kind:'integer',min:0,max:32,unit:'px'},
    margin_left: {label:'Margin left',kind:'integer',min:0,max:32,unit:'px'}
  });
  const languageWidth={label:'Width',kind:'choice',choices:['auto','120px','160px','200px','240px']};
  const textField={label:'English heading',kind:'text',max:80};
  const cardFields=Object.fromEntries(['radius','background','border_width','border_colour','shadow','margin_top','margin_right','margin_bottom','margin_left'].map(key=>[key,fields[key]]));
  for(const side of ['top','right','bottom','left'])cardFields['padding_'+side]={label:'Padding '+side,kind:'integer',min:0,max:32,unit:'px'};
  const fieldsFor=key=>key==='create-listing/language-selector'||key==='edit-listing/language-selector'?{...fields,width:languageWidth}:key==='find/listing-card'?cardFields:key==='listing-detail/about-heading'||key==='listing-detail/features-heading'?{text:textField}:fields;
  const pages = Object.freeze([Object.freeze({
    key:'listing-detail',
    name:'Listing detail',
    route:'/listings/:id/:slug (or #detail/:id)',
    elements:Object.freeze([Object.freeze({
      key:'listing-detail/save-button',
      page:'listing-detail',
      name:'Save listing',
      selector:'.quiet-detail .quiet-save',
      category:'Existing listing action',
      fields:Object.keys(fields)
    }),...[
      {key:'listing-detail/back-button',name:'Back button',selector:'.quiet-detail .quiet-back'},
      {key:'listing-detail/share-button',name:'Share button',selector:'.quiet-detail .quiet-share'},
      {key:'listing-detail/about-heading',name:'About heading',selector:'.quiet-detail .quiet-description > h2',kind:'copy',defaultText:'About this place'},
      {key:'listing-detail/features-heading',name:'Amenities heading',selector:'.quiet-detail .quiet-features > h2',kind:'copy',defaultText:'Amenities & features'}
    ].map(e=>Object.freeze({...e,page:'listing-detail',category:e.kind==='copy'?'Approved English interface heading':'Existing listing action',fields:Object.keys(fieldsFor(e.key))}))])
  }),Object.freeze({key:'find',name:'Find',route:'#home',elements:Object.freeze([
    Object.freeze({key:'find/search-button',page:'find',name:'Search button',selector:'.map-first-shell .map-search-panel #searchBtn',category:'Existing Find action',fields:Object.keys(fields)}),
    Object.freeze({key:'find/listing-card',page:'find',name:'Listing card frame',selector:'.discovery-results #cards .listing-card',category:'Existing public card frame',fields:Object.keys(cardFields)})
  ])}),...['create','edit'].map(mode=>Object.freeze({
    key:mode+'-listing',name:(mode==='create'?'Create':'Edit')+' listing',
    route:mode==='create'?'#list':'#edit/:owned-vacancy-id',
    elements:Object.freeze([Object.freeze({key:mode+'-listing/language-selector',page:mode+'-listing',name:'Listing language',
      selector:'#listingHost[data-language-page="'+mode+'"] .listing-language select',category:'Existing listing language selector',fields:Object.keys(fields)})])
  }))]);
  function validField(key,value,elementKey){
    const field=fieldsFor(elementKey)[key];
    if(!field)return false;
    if(field.kind==='choice')return typeof value==='string'&&field.choices.includes(value);
    if(field.kind==='colour')return typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
    if(field.kind==='text')return typeof value==='string'&&value===value.trim()&&Array.from(value).length>=1&&Array.from(value).length<=field.max&&!/[<>\u0000-\u001f\u007f]/.test(value);
    return Number.isInteger(value)&&value>=field.min&&value<=field.max;
  }
  function validConfig(config,elementKey){
    if(!config||typeof config!=='object'||Array.isArray(config))return false;
    if(elementKey==='listing-detail/about-heading'||elementKey==='listing-detail/features-heading')return Object.keys(config).length===0||Object.keys(config).length===1&&config.all&&typeof config.all==='object'&&!Array.isArray(config.all)&&Object.keys(config.all).length===1&&Object.prototype.hasOwnProperty.call(config.all,'text')&&validField('text',config.all.text,elementKey);
    return Object.entries(config).every(([scope,values])=>
      (elementKey?.endsWith('-heading')?scope==='all':['all','mobile','desktop'].includes(scope))
      &&values&&typeof values==='object'&&!Array.isArray(values)
      &&Object.entries(values).every(([key,value])=>validField(key,value,elementKey)));
  }
  window.VACANCY_ADMIN_DESIGN_REGISTRY=Object.freeze({pages,fields,fieldsFor,validField,validConfig});
})();
