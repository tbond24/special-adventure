const THEME_PREF_KEY='vacancy-theme-v1';

function setVacancyTheme(theme){
  const chosen=theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=chosen;
  localStorage.setItem(THEME_PREF_KEY,chosen);
  const button=document.querySelector('#themeToggle');
  if(button){
    const dark=chosen==='dark';
    button.innerHTML=`<svg class="control-icon" aria-hidden="true"><use href="#icon-${dark?'sun':'moon'}"></use></svg>`;
    button.setAttribute('aria-label',dark?'Use light mode':'Use dark mode');
    button.title=dark?'Use light mode':'Use dark mode';
  }
}

const bindHeaderBeforeTheme=bindHeader;
bindHeader=function(){
  bindHeaderBeforeTheme();
  const theme=document.querySelector('#themeToggle');
  if(theme)theme.onclick=()=>setVacancyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  setVacancyTheme(document.documentElement.dataset.theme);
};

setVacancyTheme(document.documentElement.dataset.theme);
