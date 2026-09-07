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

async function restoreDisplayRates(){
  if(displayCurrency===market().currency||fxRates)return;
  try{const response=await fetch('/api/exchange-rates'),data=await response.json();if(!response.ok)throw new Error(data.error);fxRates=data.rates;if(!booting)render()}
  catch{displayCurrency=market().currency;localStorage.setItem(CURRENCY_PREF_KEY,displayCurrency);if(!booting)render()}
}
restoreDisplayRates();
