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
  const fieldsFor=key=>key==='create-listing/language-selector'||key==='edit-listing/language-selector'?{...fields,width:languageWidth}:fields;
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
    })])
  }),...['create','edit'].map(mode=>Object.freeze({
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
    return Number.isInteger(value)&&value>=field.min&&value<=field.max;
  }
  function validConfig(config,elementKey){
    if(!config||typeof config!=='object'||Array.isArray(config))return false;
    return Object.entries(config).every(([scope,values])=>
      ['all','mobile','desktop'].includes(scope)
      &&values&&typeof values==='object'&&!Array.isArray(values)
      &&Object.entries(values).every(([key,value])=>validField(key,value,elementKey)));
  }
  window.VACANCY_ADMIN_DESIGN_REGISTRY=Object.freeze({pages,fields,fieldsFor,validField,validConfig});
})();
