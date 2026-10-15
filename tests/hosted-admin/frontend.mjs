import {chromium,expect} from '@playwright/test';
import {frontendServer} from './frontend-server.mjs';
import {ROOT,check} from './support.mjs';
import {fileURLToPath} from 'node:url';
const room={id:'55555555-5555-4555-8555-555555555555',status:'active',rentAmount:25000,
  monthlyRent:25000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,billsIncluded:false,
  minimumStayWeeks:8,room:{id:'66666666-6666-4666-8666-666666666666',name:'Synthetic test room',
    roomType:'Room',unitDetails:{},media:[],description:'Isolated synthetic listing fixture',
    furnished:true,ensuite:false,maxOccupants:2},
  property:{id:'77777777-7777-4777-8777-777777777777',suburb:'Synthetic area',city:'Nairobi',
    state:'Nairobi',country:'Kenya',propertyType:'Shared house',bedrooms:3,bathrooms:2,
    householdSummary:'',customFeatures:[],parkingSpaces:0,internetAvailable:true},
  owner:{id:'88888888-8888-4888-8888-888888888888',displayName:'Synthetic member',bio:'',avatarUrl:''}};
export async function frontendAcceptance({key,actors,radius,dir,pass}){
  const server=await frontendServer(key);
  let browser;
  try{
    browser=await chromium.launch();
    const context=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});
    const calls=[];
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin===server.url||url.origin===ROOT)return route.continue();
      return route.abort();
    });
    const page=await context.newPage();
    page.on('request',req=>{const url=new URL(req.url());
      if(url.origin===ROOT&&url.pathname.startsWith('/rest/v1/rpc/admin_appearance'))calls.push(url.pathname);});
    const owner=actors.find(a=>a.role==='owner');
    await page.addInitScript(session=>localStorage.setItem('vacancy-session-v01',JSON.stringify(session)),owner.session);
    await page.goto(server.url+'/#home');
    await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
    // Partial test snapshot supplies a public-safe DTO, never an Auth or admin RPC mock.
    await page.evaluate(async listing=>{
      currentUser=await VACANCY_BACKEND.currentUser();
      if(!currentUser||!await VACANCY_BACKEND.adminMembership())throw Error('Real membership required');
      VACANCY_BACKEND.activeVacancies=async()=>[listing];
      VACANCY_BACKEND.trackEvent=async()=>{}; // fixture preview must not emit analytics
      vacancies=[listing];
      history.replaceState(null,'','#admin');route=parseHash();
      document.querySelector('#app').innerHTML='<p>ISOLATED QA · synthetic public listing; real test Auth and database</p><div class="admin-console"><section class="admin-section" data-admin-section="design" id="connectedDesign"></section></div>';
      // Match the real shell's lazy loading before mounting this isolated slice.
      await import('/src/admin-design-registry.js?v=20261014');
      await import('/src/admin-design-workspace.js?v=20261014');
      await mountVacancyDesignWorkspace(document.querySelector('#connectedDesign'));
    },room);
    check(await page.evaluate(()=>VACANCY_BACKEND.assuranceLevel())==='aal2','Frontend uses real AAL2');
    await expect(page.locator('[data-frame-status]')).toContainText('Actual public renderer');
    await page.locator('[data-edit-scope]').selectOption('desktop');
    await expect(page.locator('[data-style-field=radius]')).toHaveValue(String(radius));
    await page.locator('[data-style-field=radius]').fill(String(radius+2));
    await page.locator('[data-style-field=radius]').press('Tab');
    await page.locator('[data-save-draft]').click();
    await expect(page.locator('[data-review]')).toBeEnabled();
    await page.locator('[data-review]').click();
    await page.locator('[data-publish-reason]').fill('Connected isolated frontend acceptance');
    await page.locator('[data-confirm-publish]').click();
    await expect(page.locator('[data-draft-status]')).toContainText('Published revision');
    await page.screenshot({path:fileURLToPath(new URL('connected-desktop-editor.png',dir))});
    check(calls.some(p=>p.endsWith('admin_appearance_save_draft'))&&
      calls.some(p=>p.endsWith('admin_appearance_publish')),'Frontend emitted real save/publish RPCs');
    pass('Connected desktop editor: genuine AAL2, real private save/review/publish RPCs');
    const publicContext=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    await publicContext.route('**/*',route=>[server.url,ROOT].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
    const publicPage=await publicContext.newPage();
    await publicPage.goto(server.url+'/#home');
    await publicPage.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
    // Actual detail route and renderer, with synthetic public data only.
    await publicPage.evaluate(async listing=>{
      vacancies=[listing];currentUser=null;
      VACANCY_BACKEND.trackEvent=async()=>{};
      history.replaceState(null,'','#detail/'+listing.id);route=parseHash();
      await renderDetailQuiet(listing.id);
      await VACANCY_SITE_APPEARANCE.refresh();
    },room);
    await expect(publicPage.locator('.quiet-save')).toHaveCSS('border-radius',(radius+2)+'px');
    await publicPage.screenshot({path:fileURLToPath(new URL('connected-public-desktop.png',dir))});
    await publicPage.setViewportSize({width:390,height:844});
    check(await publicPage.locator('.quiet-save').evaluate(el=>getComputedStyle(el).borderRadius)!==(radius+2)+'px',
      'Desktop-only publication must not change mobile style');
    check(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');
    await publicPage.screenshot({path:fileURLToPath(new URL('connected-public-mobile.png',dir))});
    pass('Anonymous real public resolver applies desktop style; mobile keeps compiled style');
    const operator=actors.find(a=>a.role==='operator');
    const cap=await page.evaluate(async session=>{
      localStorage.setItem('vacancy-session-v01',JSON.stringify(session));
      currentUser=await VACANCY_BACKEND.currentUser();
      return VACANCY_BACKEND.adminAppearanceState('listing-detail/save-button');
    },operator.session);
    check(cap.canPublish===false,'Connected Operator publish unavailable');
    pass('Connected frontend Operator receives real server publish denial capability');
  }finally{await browser?.close();await server.close();}
}
