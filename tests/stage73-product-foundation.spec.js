const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function open(page,hash='home'){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#${hash}`);
  await page.waitForFunction(()=>booting===false);
}

test('type hierarchy prioritises prices and listing identity',async({page})=>{
  await open(page);
  await page.evaluate(()=>{vacancies=[{id:'one',rentAmount:24000,rentCurrency:'KES',rentPeriod:'month',updatedAt:'2026-09-12',room:{name:'Room',roomType:'Studio',media:[],furnished:false,ensuite:false},property:{suburb:'Kilimani',city:'Nairobi',country:'Kenya',parkingSpaces:0,publicLatitude:-1.29,publicLongitude:36.78},owner:{}}];renderHome()});
  const sizes=await page.locator('.listing-card').evaluate(node=>({price:parseFloat(getComputedStyle(node.querySelector('.listing-price')).fontSize),meta:parseFloat(getComputedStyle(node.querySelector('.listing-location')).fontSize),title:parseFloat(getComputedStyle(node.querySelector('h3')).fontSize)}));
  expect(sizes.price).toBeGreaterThan(sizes.title);
  expect(sizes.title).toBeGreaterThan(sizes.meta);
});

test('dark mode keeps orange mark and renders a white wordmark layer',async({page})=>{
  await open(page);
  await page.evaluate(()=>document.documentElement.dataset.theme='dark');
  const style=await page.locator('.brand-logo-stack').evaluate(node=>{const layer=getComputedStyle(node,'::after');return{content:layer.content,filter:layer.filter,clip:layer.clipPath}});
  expect(style.content).not.toBe('none');
  expect(style.filter).toContain('invert(1)');
  expect(style.clip).not.toBe('none');
});

test('auth offers Google OAuth while preserving password sign in',async({page})=>{
  await page.route('**/auth/v1/authorize?**',route=>route.fulfill({status:302,headers:{location:'https://accounts.google.com/'}}));
  await open(page,'auth');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  const {url,origin}=await page.evaluate(()=>({url:VACANCY_BACKEND.googleOAuthUrl(),origin:location.origin}));
  expect(url).toContain('/auth/v1/authorize?provider=google');
  expect(decodeURIComponent(url)).toContain(origin);
});

test('OAuth callback stores a session and returns to Find',async({page})=>{
  await open(page);
  const result=await page.evaluate(()=>{
    history.replaceState(null,'','#access_token=test-access&refresh_token=test-refresh&expires_in=3600&token_type=bearer');
    VACANCY_BACKEND.consumeOAuthCallback();
    const stored=JSON.parse(localStorage.getItem('vacancy-session-v01'));
    return{access:stored.access_token,refresh:stored.refresh_token,hash:location.hash};
  });
  expect(result).toEqual({access:'test-access',refresh:'test-refresh',hash:'#home'});
});

test('listers get a direct Listings dashboard slot and renters retain Saved',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{currentUser={id:'lister'};VACANCY_BACKEND.myVacancies=async()=>[{id:'listing'}];await detectAudience()});
  await expect(page.locator('.mobile-nav [data-audience-slot]')).toHaveAttribute('data-nav','list');
  await expect(page.locator('.mobile-nav [data-audience-slot]')).toContainText('Listings');
  await page.evaluate(async()=>{currentUser={id:'renter'};VACANCY_BACKEND.myVacancies=async()=>[];await detectAudience()});
  await expect(page.locator('.mobile-nav [data-audience-slot]')).toHaveAttribute('data-nav','saved');
  await expect(page.locator('.mobile-nav [data-audience-slot]')).toContainText('Saved');
});

test('listing journey exposes a compact five-stage model',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await expect(page.locator('.journey-kicker')).toHaveText('Step 1 of 5 · Type');
  await page.getByRole('button',{name:'Room',exact:true}).click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('.listing-steps')).toContainText('Property');
  await expect(page.locator('.listing-steps')).toContainText('Unit');
  await expect(page.locator('.listing-steps')).toContainText('Location');
  await expect(page.locator('.listing-steps')).toContainText('Review');
  await expect(page.locator('.listing-steps')).toContainText('Publish');
});

test('mobile pages keep zero horizontal overflow in both themes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  for(const theme of ['light','dark']){
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  }
});
