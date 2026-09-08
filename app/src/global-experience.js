const INFORMATION_PAGES={
  privacy:{title:'Privacy',intro:'How Vacancy handles information when people find, list, save and enquire about homes.',sections:[
    ['Information we collect','Account name and email; profile details you add; property, unit, availability and photo information; private property address and separately published approximate coordinates; saved vacancies; enquiries and messages; reports and blocks; and limited product events and error codes. If you choose “Use my location,” your browser supplies coordinates for the nearby search.'],
    ['Why we use it','To create and secure accounts, publish and manage listings, show approximate locations, connect renters and listers, remember Saved items, deliver account email, prevent abuse, investigate reports, maintain the service, and understand whether core features work. Vacancy does not sell personal information or use it for advertising profiles.'],
    ['Where it is stored and shared','Supabase provides authentication, database and media storage; Vercel hosts the web application; Resend delivers account email; OpenStreetMap supplies map tiles and address data. These providers receive only the information needed to provide their service and may process it outside your country. Exact property addresses are kept private from public listing results; the public map uses approximate coordinates.'],
    ['Your choices and rights','You can edit listing information, remove listings, sign out, and permanently delete your account from You. Depending on where you live, you may also request access, correction, deletion, restriction, objection or a portable copy, and complain to your privacy regulator. A monitored privacy contact must be published before production release of this version.'],
    ['Retention and security','Account-linked content is kept while needed to operate the account and service. Account deletion removes the active account and associated product data, subject to limited security, legal and backup retention. Vacancy uses authenticated sessions, row-level access controls and private address separation, but no internet service can promise absolute security.'],
    ['Updates','Effective 8 September 2026. This notice will be updated when data practices or providers materially change. Significant changes should be shown in the product before they take effect.']
  ]},
  terms:{title:'Terms of use',intro:'Rules for using Vacancy as a listing and communication marketplace.',sections:[
    ['Using Vacancy','You must be at least 18 and able to enter a binding agreement. Provide accurate account and listing information, keep credentials secure, and use the service only for lawful housing activity.'],
    ['Marketplace role','Vacancy helps renters discover vacancies and contact listers. Vacancy is not a landlord, tenant, property manager, estate agent, insurer or payment provider, and is not a party to agreements between users. Availability confirmations reduce stale listings but do not guarantee a property, user, price, condition or transaction.'],
    ['Listings and conduct','Do not post misleading, unlawful, discriminatory, duplicate or unavailable listings; impersonate others; scrape the service; send spam or harassment; seek prohibited personal information; or bypass security. You must have authority to list a property and must follow housing, tenancy, consumer and anti-discrimination laws that apply to you.'],
    ['Payments and safety','Vacancy does not currently collect rent, deposits or booking payments. Independently inspect a property, verify identities and authority, use a written agreement, and avoid sending money before verification. Use Report and Block for suspicious activity and contact local emergency services for immediate danger.'],
    ['Moderation and accounts','Vacancy may review reports, limit visibility, pause or remove listings, restrict features, or suspend accounts to protect users and the service. Users can delete their account from You.'],
    ['Service and liability','The service is provided subject to rights that cannot lawfully be excluded. To the extent permitted by law, Vacancy is not responsible for user conduct, off-platform agreements, property condition, lost opportunity, or indirect loss. Service availability and third-party maps or email may change.'],
    ['Changes and governing terms','Effective 8 September 2026. Material changes should be announced before taking effect. Operator identity, a monitored legal contact, and governing jurisdiction must be confirmed before this version is promoted to production.']
  ]},
  storage:{title:'Device storage and cookies',intro:'What Vacancy stores in your browser and why.',sections:[
    ['Current use','Vacancy uses browser local storage for the authenticated Supabase session, theme, display currency, listing view and search radius. These items provide login security and the preferences you request. Vacancy does not currently use advertising or cross-site tracking cookies.'],
    ['Service requests','Vercel, Supabase, Resend and OpenStreetMap may receive ordinary network information such as IP address, browser details and request time when their services are used. Their own notices govern their independent processing.'],
    ['Your control','Signing out removes the local session. Account deletion removes the account session and triggers deletion of account-linked product data. You can clear this site’s storage in your browser, which also signs you out and resets preferences. If non-essential analytics or advertising storage is added later, Vacancy must request consent where required before enabling it.'],
    ['Updates','Effective 8 September 2026. This page must be updated before adding a new cookie, SDK or browser-storage purpose.']
  ]},
  safety:{title:'Safety centre',intro:'Practical steps for renters and listers, plus the controls already available in Vacancy.',sections:[
    ['Before a viewing','Keep early communication in Vacancy, check that details remain consistent, research the area, tell someone where you are going, and meet safely. Do not share identity documents, bank credentials or unnecessary personal information in messages.'],
    ['Before paying','Vacancy does not take payments. Inspect the property, confirm the lister’s identity and authority, read a written agreement, understand refund terms, and use a traceable payment method. Urgency, unusually low rent, gift cards, crypto-only payment or refusal to meet are warning signs.'],
    ['Report and block','Open a listing to report it. Signed-in users can also block a lister; blocked users cannot continue normal contact. Reports appear in the admin attention workflow for review. Save messages and receipts that may help an investigation.'],
    ['Emergency and legal help','For immediate danger, leave the situation and contact local emergency services. For fraud, tenancy disputes or discrimination, contact the police, consumer protection, tenancy or equality body in your location. Vacancy reports do not replace an emergency or legal report.']
  ]}
};

function renderInformationPage(name){
  const page=INFORMATION_PAGES[name];
  layout(`<article class="information-page"><a class="back-link" href="#home">← Back to Find</a><header><p class="eyebrow">VACANCY INFORMATION</p><h1>${page.title}</h1><p>${page.intro}</p></header>${page.sections.map(([title,body])=>`<section><h2>${title}</h2><p>${body}</p></section>`).join('')}</article>`);
  window.scrollTo({top:0,left:0,behavior:'instant'});
}

function renderNotFound(){
  layout(`<section class="not-found"><div class="not-found-code" aria-hidden="true">404<span>.</span></div><h1>This place is not on the map.</h1><p>The link may be old or the page may have moved.</p><a class="primary" href="#home">Back to Find</a></section>`);
  window.scrollTo({top:0,left:0,behavior:'instant'});
}
