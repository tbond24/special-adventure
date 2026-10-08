// Local admin presentation preferences; no tracking or metric definitions change.
(() => {
 window.mountAdminMetricWorkspace=function(host){
  const grid=host.querySelector('[data-admin-section="overview"] .admin-stat-grid');
  if(!grid||grid.dataset.workspace)return;grid.dataset.workspace='true';grid.classList.add('admin-metric-workspace');
  const cards=[...grid.querySelectorAll(':scope > .stat')],owner=String(currentUser?.id||''),key='vacancy-admin-metric-layout-v1:'+owner;
  let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
  cards.forEach((card,index)=>{card.dataset.metricCard=String(index);card.dataset.metricSize='small';});
  if(saved?.order&&Array.isArray(saved.order))for(const id of saved.order){const card=cards.find(c=>c.dataset.metricCard===id);if(card){grid.append(card);card.dataset.metricSize=Array.isArray(saved.wide)&&saved.wide.includes(id)?'wide':'small';}}
  const bar=document.createElement('div');bar.className='admin-workspace-controls';bar.innerHTML='<button type="button" class="console-refresh" aria-pressed="false">Arrange metrics</button><span>Layout saved on this browser</span>';grid.before(bar);
  const save=()=>{try{localStorage.setItem(key,JSON.stringify({order:[...grid.children].map(c=>c.dataset.metricCard),wide:[...grid.children].filter(c=>c.dataset.metricSize==='wide').map(c=>c.dataset.metricCard)}));}catch{bar.querySelector('span').textContent='Layout could not be saved on this browser';}};
  let editing=false,dragged=null;
  for(const card of cards){
   const label=[...card.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).join(' ')||'Metric';
   const controls=document.createElement('div');controls.className='metric-layout-controls';controls.hidden=true;
   for(const [action,text] of [['before','Move earlier'],['after','Move later'],['size','Make wider']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.layoutAction=action;button.setAttribute('aria-label',text+' · '+label);controls.append(button);}
   card.append(controls);card.addEventListener('dragstart',event=>{if(!editing){event.preventDefault();return}dragged=card;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',card.dataset.metricCard);});
   card.addEventListener('dragover',event=>{if(editing&&dragged&&dragged!==card)event.preventDefault();});
   card.addEventListener('drop',event=>{if(!editing||!dragged||dragged===card)return;event.preventDefault();const order=[...grid.children];if(order.indexOf(dragged)<order.indexOf(card))card.after(dragged);else card.before(dragged);dragged=null;save();});card.addEventListener('dragend',()=>{dragged=null});
   controls.onclick=event=>{const button=event.target.closest('[data-layout-action]');if(!button)return;const action=button.dataset.layoutAction;if(action==='before'&&card.previousElementSibling)card.previousElementSibling.before(card);else if(action==='after'&&card.nextElementSibling)card.nextElementSibling.after(card);else if(action==='size'){card.dataset.metricSize=card.dataset.metricSize==='wide'?'small':'wide';button.textContent=card.dataset.metricSize==='wide'?'Make smaller':'Make wider';button.setAttribute('aria-label',button.textContent+' · '+label);}save();button.focus();};
  }
  bar.querySelector('button').onclick=event=>{editing=!editing;event.currentTarget.setAttribute('aria-pressed',String(editing));event.currentTarget.textContent=editing?'Done arranging':'Arrange metrics';grid.classList.toggle('arranging',editing);for(const card of cards){card.draggable=editing;card.querySelector('.metric-layout-controls').hidden=!editing;}};
 };
})();
