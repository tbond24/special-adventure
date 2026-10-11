(() => {
  // Message-contact collection is retired; existing stored preferences are untouched.

  const detailBeforeContacts=renderDetail;
  renderDetail=function(id){detailBeforeContacts(id);const enquiry=document.querySelector('#enquire,[data-enquire],#enquireButton,.enquire-action');if(!enquiry)return;VACANCY_BACKEND.contactOptions(id).then(options=>{const routes=[options?.in_app&&'In-app',options?.email&&'Email notification',options?.phone&&'Phone',options?.whatsapp&&'WhatsApp'].filter(Boolean);const note=document.createElement('small');note.className='contact-route-note';note.textContent=`Lister accepts: ${routes.join(', ')||'In-app'}`;enquiry.insertAdjacentElement('afterend',note)}).catch(()=>{})}
})();
