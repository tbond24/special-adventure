// Explicit bindings, not a DOM scan or a generic CSS editor.
// Language controls are registered on their actual Create/Edit hosts.
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
    key:'listing-'+mode,name:mode==='create'?'Create listing':'Edit listing',
    route:mode==='create'?'#list/new':'#edit/:id',
    elements:Object.freeze([Object.freeze({key:'listing-'+mode+'/language-selector',page:'listing-'+mode,
      name:'Language selector',selector:'#listingHost[data-mode="'+mode+'"] > .listing-language select',
      category:'Existing form language control',fields:[...Object.keys(fields),'padding_top','padding_right','padding_bottom','padding_left']})])
  }))]);
  const elements=pages.flatMap(p=>p.elements);
  const fieldsFor=elementKey=>{
    if(!elements.some(e=>e.key===elementKey))return {};
    if(elementKey==='listing-detail/save-button')return fields;
    return {...fields,width:{...fields.width,choices:['auto','160px','200px','240px']},
      ...Object.fromEntries(['top','right','bottom','left'].map(side=>['padding_'+side,{label:'Padding '+side,kind:'integer',min:0,max:24,unit:'px'}]))};
  };
  function validField(key,value,elementKey='listing-detail/save-button'){
    const field=fieldsFor(elementKey)[key];if(!field)return false;
    if(field.kind==='choice')return typeof value==='string'&&field.choices.includes(value);
    if(field.kind==='colour')return typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
    return Number.isInteger(value)&&value>=field.min&&value<=field.max;
  }
  function validConfig(config,elementKey='listing-detail/save-button'){
    if(!elements.some(e=>e.key===elementKey)||!config||typeof config!=='object'||Array.isArray(config)||JSON.stringify(config).length>4096)return false;
    return Object.entries(config).every(([scope,values])=>['all','mobile','desktop'].includes(scope)
      &&values&&typeof values==='object'&&!Array.isArray(values)
      &&Object.entries(values).every(([field,value])=>validField(field,value,elementKey)));
  }
  window.VACANCY_ADMIN_DESIGN_REGISTRY=Object.freeze({pages,fields,fieldsFor,validField,validConfig});
})();
