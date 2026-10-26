// Browser-local layout for existing admin metrics. Metric definitions stay unchanged.
(() => {
 window.mountAdminMetricWorkspace=function(host){
  const grid=host.querySelector('[data-admin-section="overview"] .admin-stat-grid');
  if(!grid||grid.dataset.workspace)return;
  grid.dataset.workspace='true';grid.classList.add('admin-metric-workspace');
  const cards=[...grid.querySelectorAll(':scope > .stat')];
  const key='vacancy-admin-metric-layout-v1:'+String(currentUser?.id||'');
  let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  const labels=new Map();
  cards.forEach((card,index)=>{
   card.dataset.metricCard=String(index);
   card.dataset.metricSize=Array.isArray(saved?.wide)&&saved.wide.includes(String(index))?'wide':'small';
   card.hidden=Array.isArray(saved?.hidden)&&saved.hidden.includes(String(index));
   labels.set(card,[...card.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' ')||'Metric');
  });
  if(Array.isArray(saved?.order))for(const id of saved.order){const card=cards.find(c=>c.dataset.metricCard===id);if(card)grid.append(card);}
  const bar=document.createElement('div');bar.className='admin-workspace-controls';
  bar.innerHTML='<button type="button" class="console-refresh" aria-pressed="false">Arrange metrics</button><label hidden>Add card <select aria-label="Card to add"></select></label><button type="button" data-add-card hidden>Add card</button><span role="status">Layout saved on this browser</span>';
  grid.before(bar);
  const toggle=bar.querySelector('button'),picker=bar.querySelector('select'),add=bar.querySelector('[data-add-card]'),status=bar.querySelector('[role=status]');
  const empty=document.createElement('p');empty.className='metric-workspace-empty';empty.textContent='No cards shown. Choose Arrange metrics to add a card.';grid.after(empty);
  let editing=false,dragged=null;
  function sync(){
   picker.replaceChildren();
   for(const card of cards)if(card.hidden){const option=document.createElement('option');option.value=card.dataset.metricCard;option.textContent=labels.get(card);picker.append(option);}
   picker.disabled=add.disabled=!picker.options.length;
   picker.parentElement.hidden=add.hidden=!editing;
   const visible=[...grid.children].filter(c=>!c.hidden);empty.hidden=visible.length>0;
   for(const card of cards){
    const controls=card.querySelector('.metric-layout-controls');if(!controls)continue;
    controls.hidden=!editing;card.draggable=editing&&!card.hidden;
    const index=visible.indexOf(card);
    controls.querySelector('[data-layout-action=before]').disabled=index<=0;
    controls.querySelector('[data-layout-action=after]').disabled=index<0||index===visible.length-1;
    const size=controls.querySelector('[data-layout-action=size]');size.textContent=card.dataset.metricSize==='wide'?'Make smaller':'Make wider';size.setAttribute('aria-label',size.textContent+' · '+labels.get(card));
   }
  }
  function save(){
   try{localStorage.setItem(key,JSON.stringify({order:[...grid.children].map(c=>c.dataset.metricCard),wide:cards.filter(c=>c.dataset.metricSize==='wide').map(c=>c.dataset.metricCard),hidden:cards.filter(c=>c.hidden).map(c=>c.dataset.metricCard)}));status.textContent='Layout saved on this browser';}
   catch{status.textContent='Layout could not be saved. Changes last until you leave this page.';}
   sync();
  }
  for(const card of cards){
   const controls=document.createElement('div');controls.className='metric-layout-controls';controls.hidden=true;
   for(const [action,text] of [['before','Move earlier'],['after','Move later'],['size','Make wider'],['hide','Hide card']]){
    const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.layoutAction=action;button.setAttribute('aria-label',text+' · '+labels.get(card));controls.append(button);
   }
   card.append(controls);
   card.addEventListener('dragstart',event=>{if(!editing||event.target.closest('button,select')){event.preventDefault();return;}dragged=card;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',card.dataset.metricCard);});
   card.addEventListener('dragover',event=>{if(editing&&dragged&&dragged!==card)event.preventDefault();});
   card.addEventListener('drop',event=>{if(!editing||!dragged||dragged===card)return;event.preventDefault();const order=[...grid.children];if(order.indexOf(dragged)<order.indexOf(card))card.after(dragged);else card.before(dragged);dragged=null;save();});
   card.addEventListener('dragend',()=>{dragged=null;});
   controls.onclick=event=>{
    const button=event.target.closest('[data-layout-action]');if(!button)return;
    const action=button.dataset.layoutAction,visible=[...grid.children].filter(c=>!c.hidden),index=visible.indexOf(card);
    if(action==='before'&&index>0)visible[index-1].before(card);
    else if(action==='after'&&index<visible.length-1)visible[index+1].after(card);
    else if(action==='size')card.dataset.metricSize=card.dataset.metricSize==='wide'?'small':'wide';
    else if(action==='hide')card.hidden=true;
    save();if(card.hidden||button.disabled)toggle.focus();else button.focus();
   };
  }
  add.onclick=()=>{const card=cards.find(c=>c.dataset.metricCard===picker.value);if(!card)return;card.hidden=false;grid.append(card);save();card.querySelector('[data-layout-action=size]').focus();};
  toggle.onclick=()=>{editing=!editing;dragged=null;toggle.setAttribute('aria-pressed',String(editing));toggle.textContent=editing?'Done arranging':'Arrange metrics';grid.classList.toggle('arranging',editing);sync();};
  sync();
 };
})();
