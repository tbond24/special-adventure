(() => {
  const editBeforeConsolidation=renderEdit;
  const fieldNames=node=>new Set([...node.querySelectorAll('[name]')].map(field=>field.name));
  function sectionFor(node){const names=fieldNames(node);if(node.classList?.contains('media-manager')||names.has('images'))return'photos';if([...names].some(name=>['rentAmount','rentCurrency','rentPeriod','deposit','availableFrom','minimumStayWeeks'].includes(name)))return'pricing';if([...names].some(name=>['unitType','roomName','maxOccupants','furnished','ensuite','billsIncluded','smokingOverride','petsOverride','description'].includes(name)))return'unit';return'property'}
  function consolidateEdit(form){
    if(!form||form.dataset.consolidatedEdit)return;form.dataset.consolidatedEdit='true';form.classList.add('guided-listing','unified-edit-flow');
    form.querySelectorAll('[name="household"],[name="description"]').forEach(field=>field.required=false);
    const groups={property:[],photos:[],unit:[],pricing:[]},actions=[];
    [...form.children].forEach(node=>{if(node.matches('h2'))return;if(node.matches('.row.wide')){actions.push(node);return}groups[sectionFor(node)].push(node)});
    const definitions=[['property','Property & location'],['photos','Photos'],['unit','Unit details'],['pricing','Pricing & availability']];
    const stepper=document.createElement('nav');stepper.className='listing-top-stepper edit-listing-stepper';stepper.setAttribute('aria-label','Edit listing steps');
    definitions.forEach(([key,label],index)=>stepper.insertAdjacentHTML('beforeend',`<button type="button" data-edit-step="${key}"${index===0?' class="active"':''}><b>${index+1}</b><span>${label}</span></button>`));
    stepper.insertAdjacentHTML('beforeend','<span><b>5</b><span>Save</span></span>');form.prepend(stepper);
    const sections=definitions.map(([key,label],index)=>{const section=document.createElement('details');section.className='composer-section unified-edit-section';section.dataset.editSection=key;section.open=index===0;section.innerHTML=`<summary><span class="section-state"></span><strong>${label}</strong><small>${index===0?'Tap to close':'Tap to open'}</small></summary><div class="composer-section-body"></div>`;groups[key].forEach(node=>section.lastElementChild.append(node));if(index<definitions.length-1){const next=document.createElement('button');next.type='button';next.className='primary section-continue';next.textContent='Continue';section.lastElementChild.append(next)}form.append(section);return section});
    actions.forEach(node=>form.append(node));
    function open(index){sections.forEach((section,i)=>section.open=i===index);stepper.querySelectorAll('button').forEach((button,i)=>button.classList.toggle('active',i===index));sections[index]?.scrollIntoView({behavior:'smooth',block:'start'})}
    sections.forEach((section,index)=>{section.querySelector('summary').onclick=()=>setTimeout(()=>{if(section.open)open(index)},0);section.querySelector('.section-continue')?.addEventListener('click',()=>{const required=[...section.querySelectorAll('[required]')],invalid=required.find(field=>!field.checkValidity());if(invalid){invalid.reportValidity();return}section.dataset.complete='true';stepper.querySelector(`[data-edit-step="${section.dataset.editSection}"]`)?.classList.add('complete');open(index+1)})});
    stepper.querySelectorAll('button').forEach((button,index)=>button.onclick=()=>open(index));
  }
  renderEdit=async function(id){await editBeforeConsolidation(id);consolidateEdit(document.querySelector('#editListingForm'))}
})();
