const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const source=name=>fs.readFileSync('app/src/'+name,'utf8');
async function install(page){
 await page.evaluate(()=>{window.currentUser=null;window.__identityEvents=[];window.render=async()=>{};window.renderList=async()=>{};window.parseHash=()=>({name:location.hash.slice(1)||'home'});});
 await page.addScriptTag({content:source('backend.js')});
 await page.evaluate(()=>{VACANCY_BACKEND.recordConnectedJourney=async events=>__identityEvents.push(...events);VACANCY_BACKEND.recordSiteEngagement=async events=>__identityEvents.push(...events)});
 for(const name of ['analytics-preferences.js','analytics-controls.js','connected-journey.js','engagement-tracking.js'])await page.addScriptTag({content:source(name)});
}
async function flush(page){await page.evaluate(async()=>{await VACANCY_CONNECTED_JOURNEY.flush();await VACANCY_ENGAGEMENT.flush()})}
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname==='/identity-check')return route.fulfill({contentType:'text/html',body:'<button class="quiet-message">Contact</button>'});if(url.pathname==='/api/visitor-context')return route.fulfill({json:{city:null,country:null,approximate:true}});if(url.pathname==='/auth/v1/token')return route.fulfill({json:{access_token:'synthetic-only',refresh_token:'synthetic-only',expires_at:9999999999,user:{id:'synthetic-member'}}});if(url.pathname==='/auth/v1/logout')return route.fulfill({json:{}});return route.abort()});
});
test('one browser and visit across anonymous, login, logout and reload; inactivity starts only a new visit',async({page})=>{
 await page.clock.install();await page.goto('/identity-check#home');await install(page);
 await page.evaluate(()=>render());await page.getByRole('button',{name:'Contact',exact:true}).click();await flush(page);
 const initial=await page.evaluate(()=>VACANCY_ANALYTICS.identity());
 await page.evaluate(async()=>{const result=await VACANCY_BACKEND.signIn({email:'member@example.invalid',password:'synthetic'});currentUser=result.user;history.replaceState(null,'','#access_token=synthetic-oauth&refresh_token=synthetic-refresh&expires_in=3600');VACANCY_BACKEND.consumeOAuthCallback();history.replaceState(null,'','#auth');await render();history.replaceState(null,'','#home');await render()});
 await page.getByRole('button',{name:'Contact',exact:true}).click();await flush(page);
 await page.evaluate(async()=>{await VACANCY_BACKEND.signOut();currentUser=null;await render()});await page.getByRole('button',{name:'Contact',exact:true}).click();await flush(page);
 const events=await page.evaluate(()=>__identityEvents);expect(events.some(e=>e.point==='contact_button_pressed')).toBe(true);expect(events.some(e=>e.event_name==='lister_landing_viewed')).toBe(true);expect(new Set(events.map(e=>e.visitor_id))).toEqual(new Set([initial.visitor_id]));expect(new Set(events.map(e=>e.session_id))).toEqual(new Set([initial.session_id]));
 await page.reload();await install(page);const restored=await page.evaluate(()=>VACANCY_ANALYTICS.identity());expect(restored.visitor_id).toBe(initial.visitor_id);expect(restored.session_id).toBe(initial.session_id);
 await flush(page);await page.clock.fastForward(1800001);const later=await page.evaluate(()=>VACANCY_ANALYTICS.identity());expect(later.visitor_id).toBe(initial.visitor_id);expect(later.session_id).not.toBe(initial.session_id);
});
test('an admin browser stays excluded after logout, navigation and reload',async({page})=>{
 await page.goto('/identity-check#admin');await install(page);await page.evaluate(async()=>{currentUser={id:'synthetic-admin'};await VACANCY_BACKEND.signOut();currentUser=null;history.replaceState(null,'','#home');await render()});await page.getByRole('button',{name:'Contact',exact:true}).click();await flush(page);expect(await page.evaluate(()=>__identityEvents)).toEqual([]);expect(await page.evaluate(()=>VACANCY_ANALYTICS.identity())).toBeNull();
 await page.reload();await install(page);await page.getByRole('button',{name:'Contact',exact:true}).click();await flush(page);expect(await page.evaluate(()=>__identityEvents)).toEqual([]);
});
