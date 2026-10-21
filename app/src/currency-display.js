const nativeApplySearch=applySearch;
applySearch=function(){
  const field=document.querySelector('#maxRent'),entered=field?.value;
  if(field&&entered&&displayCurrency!==market().currency&&fxRates){const native=convertAmount(Number(entered),displayCurrency,market().currency);if(native!=null)field.value=String(native)}
  nativeApplySearch();
  if(field)field.value=entered;
};

const nativeRenderHome=renderHome;
renderHome=function(){nativeRenderHome();const label=document.querySelector('#rentUnitLabel');if(label)label.textContent=`(${displayCurrency}/${market().rentPeriod})`};

const nativeRenderDetail=renderDetail;
renderDetail=function(id){nativeRenderDetail(id);const vacancy=vacancies.find(item=>item.id===id);if(vacancy?.deposit==null)return;const deposit=[...document.querySelectorAll('.detail-hero~.split .panel p.muted')].find(node=>node.textContent.trim().startsWith('Deposit '));if(!deposit)return;const shown=displayAmount(vacancy.deposit,vacancy.rentCurrency||marketForCountry(vacancy.property.country).currency);deposit.textContent=`Deposit ${shown.converted?'≈ ':''}${shown.label} ${shown.value.toLocaleString(shown.locale)}`};

// Rate responses must not rebuild an unrelated page or destroy an active form.
// Existing non-Find prices keep their labelled value until normal navigation.
function refreshDisplayCurrency(){
  if(booting)return;
  const control=document.querySelector('#marketSelect');
  if(control){
    const automatic=localStorage.getItem('vacancy-currency-mode-v1')==='auto';
    const option=control.querySelector('option[value="auto"]');
    if(option)option.textContent=`Auto · ${displayCurrency}`;
    control.value=automatic&&option?'auto':displayCurrency;
  }
  if(parseHash().name!=='home')return;
  const label=document.querySelector('#rentUnitLabel');if(label)label.textContent=`(${displayCurrency}/${market().rentPeriod})`;
  applySearch();
}
async function restoreDisplayRates(){
  if(displayCurrency===market().currency||fxRates)return;
  const requestedCurrency=displayCurrency;
  try{const response=await fetch('/api/exchange-rates'),data=await response.json();if(!response.ok)throw new Error(data.error);fxRates=data.rates;refreshDisplayCurrency()}
  catch{if(displayCurrency===requestedCurrency){displayCurrency=market().currency;localStorage.setItem(CURRENCY_PREF_KEY,displayCurrency);refreshDisplayCurrency()}}
}
restoreDisplayRates();
