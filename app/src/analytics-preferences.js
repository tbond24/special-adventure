// Browser-local measurement bypass, read before any tracker is installed.
(() => {
 const key='vacancy-analytics-disabled';let disabled=false;
 // Set Google's documented property switch before the head tag is configured.
 const syncGoogle=()=>{let stored=false;try{stored=localStorage.getItem(key)==='true'}catch{}window['ga-disable-G-H059DTQC6T']=disabled||stored||/^#admin(?:$|[/?])/.test(location.hash)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;};
 // Remember this browser as excluded once it enters admin, including after sign-out.
 const ghost=()=>{if(/^#admin(?:$|[/?])/.test(location.hash)){disabled=true;try{localStorage.setItem(key,'true')}catch{}}syncGoogle();};
 ghost();window.addEventListener('hashchange',ghost);
 try{disabled=localStorage.getItem(key)==='true'}catch{}
 window.VACANCY_ANALYTICS_PREFERENCES=Object.freeze({get disabled(){try{return disabled||localStorage.getItem(key)==='true'}catch{return disabled}},
  exclude(){disabled=true;try{localStorage.setItem(key,'true')}catch{}syncGoogle();},
  setDisabled(value){localStorage.setItem(key,value?'true':'false');disabled=!!value;syncGoogle();location.reload();}
 });
 syncGoogle();window.addEventListener('storage',event=>{if(event.key===key||event.key===null)syncGoogle();});
})();
