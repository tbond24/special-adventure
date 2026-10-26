const THEME_PREF_KEY='vacancy-theme-v1';
const ADMIN_THEME_PREF_KEY='vacancy-admin-theme-v1';
const themeKey=scope=>scope==='admin'?ADMIN_THEME_PREF_KEY:THEME_PREF_KEY;
const currentThemeScope=()=>location.hash.replace(/^#/,'').split(/[/?]/)[0]==='admin'||location.pathname==='/__admin-preview'&&!location.hash?'admin':'site';
function storedTheme(scope){try{return localStorage.getItem(themeKey(scope))==='dark'?'dark':'light'}catch{return 'light'}}
const vacancyThemes={site:storedTheme('site'),admin:storedTheme('admin')};

function syncVacancyThemeControls(){
  for(const button of document.querySelectorAll('#themeToggle,[data-theme-toggle]')){
    const scope=button.dataset.themeScope||'site',dark=vacancyThemes[scope]==='dark';
    button.innerHTML=`<svg class="control-icon" aria-hidden="true"><use href="#icon-${dark?'moon':'sun'}"></use></svg>`;
    button.setAttribute('aria-label',dark?'Use light mode':'Use dark mode');
    button.setAttribute('aria-pressed',String(dark));
    button.title=dark?'Use light mode':'Use dark mode';
  }
}

function applyVacancyTheme(){
  document.documentElement.dataset.theme=vacancyThemes[currentThemeScope()];
  syncVacancyThemeControls();
}

function setVacancyTheme(theme,persist=true,scope=currentThemeScope()){
  const chosen=theme==='dark'?'dark':'light';
  vacancyThemes[scope]=chosen;
  if(persist){try{localStorage.setItem(themeKey(scope),chosen)}catch{/* Keep each control usable when browser storage is blocked. */}}
  applyVacancyTheme();
}

function bindVacancyThemeControl(button,scope='site'){
  if(!button)return;
  button.dataset.themeScope=scope;
  button.onclick=()=>setVacancyTheme(vacancyThemes[scope]==='dark'?'light':'dark',true,scope);
  syncVacancyThemeControls();
}

const bindHeaderBeforeTheme=bindHeader;
bindHeader=function(){
  bindHeaderBeforeTheme();
  applyVacancyTheme();
  bindVacancyThemeControl(document.querySelector('#themeToggle'));
};

window.addEventListener('storage',event=>{
  if(event.key===THEME_PREF_KEY)setVacancyTheme(event.newValue,false,'site');
  else if(event.key===ADMIN_THEME_PREF_KEY)setVacancyTheme(event.newValue,false,'admin');
  else if(event.key===null){vacancyThemes.site=storedTheme('site');vacancyThemes.admin=storedTheme('admin');applyVacancyTheme();}
});
window.addEventListener('hashchange',applyVacancyTheme);
window.addEventListener('popstate',applyVacancyTheme);
applyVacancyTheme();
