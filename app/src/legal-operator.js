window.VACANCY_LEGAL_OPERATOR=Object.freeze({
  legalName:'',
  serviceAddress:'',
  jurisdiction:'',
  privacyEmail:'',
  legalEmail:''
});
window.vacancyLegalStatus=function(){const value=window.VACANCY_LEGAL_OPERATOR,missing=Object.entries(value).filter(([,item])=>!String(item||'').trim()).map(([key])=>key);return{complete:missing.length===0,missing}}
