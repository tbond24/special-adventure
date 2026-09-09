(() => {
  const icon=(name,klass='control-icon')=>`<svg class="${klass}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

  const baseHome=renderHome;
  renderHome=function(){
    baseHome();
    const panel=document.querySelector('.map-search-panel'),field=panel?.querySelector('.map-search-field'),search=document.querySelector('#searchBtn'),tools=document.querySelector('#filtersToggle');
    if(field&&search){
      search.classList.add('search-inside-action');
      search.innerHTML=icon('arrow-ne');
      search.setAttribute('aria-label','Search map');
      field.append(search);
    }
    if(tools){tools.classList.remove('tools-action');tools.classList.add('search-action');}
  };

  const baseLoading=renderLoading;
  renderLoading=function(){baseLoading();const mark=document.querySelector('.loading-mark');if(mark)mark.textContent='v'};

  const baseList=renderList;
  renderList=async function(){
    await baseList();
    const tools=document.querySelector('.vacancy-manager-tools'),list=document.querySelector('#vacancyListView'),cards=document.querySelector('#vacancyCardView');
    if(!tools||!list||!cards)return;
    localStorage.setItem('vacancy-owner-view','list');document.querySelector('#mine')?.classList.remove('cards-view');document.querySelector('#mine')?.classList.add('list-view');list.remove();cards.remove();
  };
})();
