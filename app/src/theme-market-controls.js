const THEME_PREF_KEY='vacancy-theme-v1';

function syncVacancyThemeControls(){
  const dark=document.documentElement.dataset.theme==='dark';
  for(const button of document.querySelectorAll('#themeToggle,[data-theme-toggle]')){
    button.innerHTML=`<svg class="control-icon" aria-hidden="true"><use href="#icon-${dark?'moon':'sun'}"></use></svg>`;
    button.setAttribute('aria-label',dark?'Use light mode':'Use dark mode');
    button.setAttribute('aria-pressed',String(dark));
    button.title=dark?'Use light mode':'Use dark mode';
  }
}

function setVacancyTheme(theme,persist=true){
  const chosen=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=chosen;
  if(persist){try{localStorage.setItem(THEME_PREF_KEY,chosen)}catch{/* Keep the control usable when browser storage is blocked. */}}
  syncVacancyThemeControls();
}

function bindVacancyThemeControl(button){
  if(!button)return;
  button.onclick=()=>setVacancyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  syncVacancyThemeControls();
}

const bindHeaderBeforeTheme=bindHeader;
bindHeader=function(){
  bindHeaderBeforeTheme();
  bindVacancyThemeControl(document.querySelector('#themeToggle'));
};

window.addEventListener('storage',event=>{if(event.key===THEME_PREF_KEY)setVacancyTheme(event.newValue,false)});
setVacancyTheme(document.documentElement.dataset.theme,false);
