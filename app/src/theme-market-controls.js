const THEME_PREF_KEY='vacancy-theme-v1';

function setVacancyTheme(theme){
  const chosen=theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=chosen;
  localStorage.setItem(THEME_PREF_KEY,chosen);
  const button=document.querySelector('#themeToggle');
  if(button){
    const dark=chosen==='dark';
    button.textContent=dark?'☀':'☾';
    button.setAttribute('aria-label',dark?'Use light mode':'Use dark mode');
    button.title=dark?'Use light mode':'Use dark mode';
  }
}

const bindHeaderBeforeTheme=bindHeader;
bindHeader=function(){
  bindHeaderBeforeTheme();
  const country=document.querySelector('#countrySelect');
  if(country){
    country.disabled=booting;
    country.innerHTML=Object.values(MARKETS).map(item=>`<option value="${item.code}" ${item.code===marketCode?'selected':''}>${item.flag} ${item.label}</option>`).join('');
    country.onchange=()=>{
      if(!MARKETS[country.value])return;
      marketCode=country.value;
      localStorage.setItem(MARKET_PREF_KEY,marketCode);
      searchCenter=null;
      exploreSelectedId=null;
      render();
    };
  }
  const theme=document.querySelector('#themeToggle');
  if(theme)theme.onclick=()=>setVacancyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  setVacancyTheme(document.documentElement.dataset.theme);
};

setVacancyTheme(document.documentElement.dataset.theme);
