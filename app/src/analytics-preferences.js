// Browser-local measurement bypass, read before any tracker is installed.
(() => {
 const key='vacancy-analytics-disabled';let disabled=false;
 // Remember this browser as excluded once it enters admin, including after sign-out.
 const ghost=()=>{if(/^#admin(?:$|\/)/.test(location.hash)){disabled=true;try{localStorage.setItem(key,'true')}catch{}}};
 ghost();window.addEventListener('hashchange',ghost);
 try{disabled=localStorage.getItem(key)==='true'}catch{}
 window.VACANCY_ANALYTICS_PREFERENCES=Object.freeze({get disabled(){try{return disabled||localStorage.getItem(key)==='true'}catch{return disabled}},
  exclude(){disabled=true;try{localStorage.setItem(key,'true')}catch{}},
  setDisabled(value){localStorage.setItem(key,value?'true':'false');location.reload();}
 });
})();
