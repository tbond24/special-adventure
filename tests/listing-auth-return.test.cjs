const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app/src/listing-auth-return.js', 'utf8');
const key = 'vacancy-listing-auth-return-v1';
function fixture(hash = '#list/new') {
  const data = new Map(), listeners = {};
  const context = {location:{hash}, sessionStorage:{getItem:k => data.get(k) ?? null, setItem:(k,v) => data.set(k,v), removeItem:k => data.delete(k)}, Date, URLSearchParams, window:{addEventListener:(name,fn) => listeners[name] = fn}};
  vm.runInNewContext(source, context);
  return {helper:context.window.VACANCY_LISTING_AUTH_RETURN, data, context, listeners};
}
test('listing return is single-use and can only resolve to two fixed internal routes', () => {
  const {helper,data} = fixture();
  assert.equal(helper.take(), 'home');
  helper.remember(); assert.equal(helper.take(), 'list/new'); assert.equal(helper.take(), 'home');
  for (const value of ['https://example.com', '//example.com', '#admin', 'NaN', 'Infinity', String(Date.now()+60000), String(Date.now()-31*60000)]) {
    data.set(key,value); assert.equal(helper.take(), 'home'); assert.equal(data.has(key), false);
  }
});
test('only the exact composer entry records a pending destination', () => {
  for (const route of ['#home','#auth','#list','#edit/123','#list/new/extra','#list/new?next=https://example.com']) {
    const {helper,data} = fixture(route); helper.remember(); assert.equal(data.size,0);
  }
});
test('auth and recovery keep the intent; leaving sign-in cancels it', () => {
  const {helper,data,context,listeners} = fixture();
  helper.remember();
  for (const hash of ['#auth','#forgot-password','#reset-password','#list/new']) {
    context.location.hash=hash; listeners.hashchange(); assert.equal(data.has(key),true);
  }
  context.location.hash='#home'; listeners.hashchange(); assert.equal(helper.take(),'home');
});
test('unavailable session storage does not break authentication', () => {
  const {helper,context} = fixture();
  context.sessionStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')},removeItem(){throw new Error('blocked')}};
  assert.doesNotThrow(()=>helper.remember()); assert.equal(helper.take(),'home');
});
test('OAuth consumes composer intent while guest upgrades keep their existing auth route', () => {
  for (const upgrading of [false,true]) {
    const {helper,context,data} = fixture(); helper.remember();
    const local = new Map(upgrading?[['vacancy-guest-upgrade-pending','synthetic-guest']]:[]);
    let destination;
    Object.assign(context,{URLSearchParams,history:{replaceState:(_,__,path)=>destination=path},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)}});
    Object.assign(context.location,{hash:'#access_token=synthetic-access&refresh_token=synthetic-refresh',pathname:'/',search:''});
    vm.runInNewContext(fs.readFileSync('app/src/backend.js','utf8'),context);
    context.window.VACANCY_BACKEND.consumeOAuthCallback();
    assert.equal(destination,upgrading?'/#auth':'/#list/new');
    assert.equal(data.has(key),upgrading);
  }
});

test('confirmation and recovery callbacks keep intent until their handlers normalize the route', () => {
  const {helper,context,listeners} = fixture();
  for (const hash of ['#access_token=synthetic&type=signup', '#access_token=synthetic&type=recovery', '#error=access_denied']) {
    context.location.hash='#list/new'; helper.remember();
    context.location.hash=hash; listeners.hashchange();
    assert.equal(helper.take(),'list/new');
  }
});
test('a new document at home cancels a pending destination', () => {
  const {helper,context,data} = fixture(); helper.remember();
  context.location.hash='#home'; vm.runInNewContext(source,context);
  assert.equal(data.has(key),false);
});
