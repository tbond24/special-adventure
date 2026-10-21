// Browser-local measurement bypass, read before any tracker is installed.
(() => {
 const key='vacancy-analytics-disabled';let disabled=false;
 try{disabled=localStorage.getItem(key)==='true'}catch{}
 window.VACANCY_ANALYTICS_PREFERENCES=Object.freeze({disabled,
  setDisabled(value){localStorage.setItem(key,value?'true':'false');location.reload();}
 });
})();
