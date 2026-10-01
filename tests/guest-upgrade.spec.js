const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;

test('guest upgrade links email and sets password without replacing the guest identity',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  const requests=[];
  await page.route('**/auth/v1/user',route=>{
    if(route.request().method()!=='PUT')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'guest-one',is_anonymous:requests.length===0,email_confirmed_at:requests.length?new Date().toISOString():null})});
    requests.push({authorization:route.request().headers().authorization,body:route.request().postDataJSON()});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'guest-one',email:requests[0].body.email})});
  });
  await page.evaluate(()=>{
    const token='header.eyJleHAiOjQxMDI0NDQ4MDB9.sig';
    localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:token,refresh_token:'guest-refresh'}));
    currentUser={id:'guest-one',is_anonymous:true};
    VACANCY_BACKEND.currentUser=async()=>currentUser;
    VACANCY_BACKEND.savedIds=async()=>[];
    nav('auth');
  });
  await page.getByRole('button',{name:'Create account'}).click();
  await expect(page.locator('input[name="password"]')).toBeHidden();
  await page.getByLabel('Name').fill('Amina');
  await page.getByLabel('Email').fill('amina@example.test');
  await page.getByRole('button',{name:'Create account'}).last().click();
  await expect(page.locator('#toast')).toContainText('Check your email');
  expect(requests[0].body).toEqual({email:'amina@example.test',data:{display_name:'Amina'}});
  expect(requests[0].authorization).toContain('Bearer header.');
  expect(await page.evaluate(()=>localStorage.getItem('vacancy-guest-upgrade-pending'))).toBe('guest-one');

  await page.evaluate(()=>{currentUser={id:'guest-one',is_anonymous:false,email_confirmed_at:new Date().toISOString()};renderAuth()});
  await expect(page.getByRole('heading',{name:'Finish your account'})).toBeVisible();
  await page.locator('input[name="password"]').fill('Password123456A');
  await page.getByRole('button',{name:'Finish account'}).click();
  await expect.poll(()=>requests.length).toBe(2);
  expect(requests[1].body).toEqual({password:'Password123456A'});
  expect(await page.evaluate(()=>localStorage.getItem('vacancy-guest-upgrade-pending'))).toBeNull();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')).refresh_token)).toBe('guest-refresh');
});

test('failed email link leaves the guest session and chat identity intact',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.route('**/auth/v1/user',route=>route.request().method()==='PUT'?route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({msg:'Email already registered'})}):route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'guest-one',is_anonymous:true})}));
  await page.evaluate(()=>{localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'header.eyJleHAiOjQxMDI0NDQ4MDB9.sig',refresh_token:'guest-refresh'}));currentUser={id:'guest-one',is_anonymous:true};VACANCY_BACKEND.currentUser=async()=>currentUser;nav('auth')});
  await page.getByRole('button',{name:'Create account'}).click();
  await page.getByLabel('Name').fill('Amina');
  await page.getByLabel('Email').fill('taken@example.test');
  await page.getByRole('button',{name:'Create account'}).last().click();
  await expect(page.locator('#toast')).toContainText('Email already registered');
  expect(await page.evaluate(()=>localStorage.getItem('vacancy-guest-upgrade-pending'))).toBeNull();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-session-v01')).refresh_token)).toBe('guest-refresh');
});
