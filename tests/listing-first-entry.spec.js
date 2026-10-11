const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const { install, createCloud, owner, otherOwner, sessionFor } = require('../qa/account-drafts/synthetic-cloud.cjs');

// Every browser context installs the synthetic network boundary before navigation.
// The account adapter and its owner-bound requests remain real application code.
const commits = cloud => cloud.requests.filter(request => request.path.endsWith('/commit_listing_draft')).length;
const navigation = page => page.locator(page.viewportSize().width <= 820 ? '.mobile-nav' : '.desktop-nav');
async function ready(page) { await page.waitForFunction(() => typeof booting !== 'undefined' && !booting); }
async function boot(page, context, { user = null, cloud = createCloud(), route = '#list' } = {}) {
  const state = await install(context, cloud, { signedIn: user });
  await page.goto('/' + route);
  await ready(page);
  return state;
}
async function chooser(page) {
  await expect(page.locator('#listingHost')).toHaveAttribute('data-mode', 'create');
  await expect(page.locator('[data-listing-type=House]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0);
  await expect(navigation(page)).toBeVisible();
}
async function dashboard(page) {
  await expect(page).toHaveURL(/#list$/);
  await expect(page.locator('#listingHost')).toHaveAttribute('data-mode', 'dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(navigation(page)).toBeVisible();
}
async function chooseHouse(page) {
  await chooser(page);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button', { name: 'New property', exact: true }).click();
  const form = page.locator('#listingForm');
  await expect(form).toHaveAttribute('data-journey-step', '0');
  await form.evaluate(element => element._draftMediaRestore);
  return form;
}
async function clickList(page) {
  const control = page.locator(page.viewportSize().width <= 820 ? '.mobile-nav [data-nav=list]' : '.topbar [data-nav=list]');
  await expect(control).toBeVisible();
  await control.click();
}
async function homeThenList(page) {
  await navigation(page).locator('[data-nav=home]').click();
  await expect(page).toHaveURL(/#home$/);
  await clickList(page);
}
function noPublication(state) {
  expect(state.cloud.publicWrites).toEqual([]);
  expect(state.calls.filter(call => !['ownerMediaLibrary', 'mediaLibraryFiles'].includes(call.method))).toEqual([]);
}
async function freshPage(browser, cloud, user, route = '#list') {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: test.info().project.use.viewport,
    userAgent: test.info().project.use.userAgent,
    deviceScaleFactor: test.info().project.use.deviceScaleFactor,
    isMobile: test.info().project.use.isMobile,
    hasTouch: test.info().project.use.hasTouch,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const state = await boot(page, context, { cloud, user, route });
  return { context, page, state };
}
function retainedHead(cloud, { user = owner, state = 'discarded', revision = 1 } = {}) {
  const head = {
    id: randomUUID(), owner_id: user.id, source_draft_id: randomUUID(), revision,
    current_transfer_id: revision ? randomUUID() : null, state,
    published_units: {}, created_units: {}, publish_token: null,
    created_at: '2026-10-10T12:00:00Z', updated_at: '2026-10-10T12:00:00Z',
  };
  cloud.heads.set(head.id, head);
  return head;
}

for (const user of [null, owner]) {
  const kind = user ? 'account' : 'guest';
  test(`${kind}: first List, chooser visit, reload and untouched form return stay first-entry`, async ({ page, context }) => {
    const state = await boot(page, context, { user });
    await chooser(page);
    await homeThenList(page);
    await chooser(page);
    await page.reload();
    await ready(page);
    await chooser(page);
    await chooseHouse(page);
    // Longer than the account debounce: automatic form scaffolding cannot count.
    await page.waitForTimeout(1200);
    await homeThenList(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await chooser(page);
    await page.reload();
    await ready(page);
    await chooser(page);
    expect(commits(state.cloud)).toBe(0);
    noPublication(state);
  });

  test(`${kind}: explicit incomplete Save establishes dashboard through reload and browser history`, async ({ page, context }) => {
    const state = await boot(page, context, { user });
    const form = await chooseHouse(page);
    await expect(form.locator('[data-base-name=rentAmount]')).toHaveValue('');
    await form.locator('.journey-save-exit').click();
    await dashboard(page);
    await expect(page.locator(user ? '.account-draft-row' : '.local-draft-row')).toHaveCount(1);
    await page.reload();
    await ready(page);
    await dashboard(page);
    await navigation(page).locator('[data-nav=home]').click();
    await expect(page).toHaveURL(/#home$/);
    await page.goBack();
    await dashboard(page);
    await page.goForward();
    await expect(page).toHaveURL(/#home$/);
    await clickList(page);
    await dashboard(page);
    noPublication(state);
  });

  test(`${kind}: explicit #list/new still creates or resumes after established history`, async ({ page, context }) => {
    const state = await boot(page, context, { user });
    const form = await chooseHouse(page);
    await form.locator('.journey-save-exit').click();
    await dashboard(page);
    if (user) await page.locator('[data-open-account-draft]').click();
    else await page.locator('[data-resume-guest-draft]').click();
    await expect(page).toHaveURL(/#list\/new$/);
    await expect(page.locator('#listingForm')).toHaveAttribute('data-journey-step', '0');
    await expect(navigation(page)).toBeVisible();
    await page.goto('/#list/new');
    await ready(page);
    await expect(page.locator('#listingHost')).toHaveAttribute('data-mode', 'create');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0);
    noPublication(state);
  });
}

test('guest: dashboard stays sticky after discarding the last device draft, including a new tab', async ({ page, context, browser }) => {
  const state = await boot(page, context);
  const form = await chooseHouse(page);
  await form.locator('.journey-save-exit').click();
  await dashboard(page);
  await page.locator('[data-resume-guest-draft]').click();
  await expect(form).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Discard device draft', exact: true }).click();
  await expect(page).toHaveURL(/#home$/);
  await clickList(page);
  await dashboard(page);
  await expect(page.locator('.local-draft-row')).toHaveCount(0);
  await page.reload();
  await ready(page);
  await dashboard(page);
  const second = await context.newPage();
  await second.goto('/#list');
  await ready(second);
  await dashboard(second);
  const clean = await freshPage(browser, state.cloud, null);
  try { await chooser(clean.page); } finally { await clean.context.close(); }
  noPublication(state);
});

test('account: explicit Save stays in the editor until cloud ACK, then survives clean-device restore', async ({ page, context, browser }) => {
  const cloud = createCloud();
  const state = await boot(page, context, { cloud, user: owner });
  const form = await chooseHouse(page);
  let release;
  cloud.holdCommit = new Promise(resolve => release = resolve);
  try {
    await form.locator('.journey-save-exit').click();
    await expect.poll(() => commits(cloud)).toBe(1);
    await expect(form).toBeVisible();
    await expect(form).toHaveJSProperty('inert', true);
    await expect(page.locator('#listingHost')).toHaveAttribute('data-mode', 'create');
    const beforeAck = await freshPage(browser, cloud, owner);
    try { await chooser(beforeAck.page); } finally { await beforeAck.context.close(); }
    cloud.holdCommit = null;
    release();
    await dashboard(page);
    const clean = await freshPage(browser, cloud, owner);
    try {
      await dashboard(clean.page);
      await expect(clean.page.locator('.account-draft-row')).toHaveCount(1);
    } finally { await clean.context.close(); }
  } finally { cloud.holdCommit = null; release(); }
  noPublication(state);
});

test('account: failed cloud Save cannot turn a local skeleton into first-list history', async ({ page, context, browser }) => {
  const cloud = createCloud();
  cloud.failCommit = true;
  const state = await boot(page, context, { cloud, user: owner });
  const form = await chooseHouse(page);
  await form.locator('.journey-save-exit').click();
  await expect(page.locator('#toast')).toContainText(/could not be saved/i);
  await expect(form.locator('.journey-save-exit')).toBeEnabled();
  await expect(form).toBeVisible();
  const clean = await freshPage(browser, cloud, owner);
  try { await chooser(clean.page); } finally { await clean.context.close(); }
  await page.goto('/#list');
  await ready(page);
  await chooser(page);
  expect([...cloud.heads.values()].every(head => head.revision === 0)).toBe(true);
  noPublication(state);
});

for (const state of ['discarded', 'published', 'archived']) {
  test(`account: retained ${state} committed head preserves dashboard without open drafts`, async ({ page, context }) => {
    const cloud = createCloud();
    retainedHead(cloud, { state });
    const boundary = await boot(page, context, { cloud, user: owner });
    await dashboard(page);
    await expect(page.locator('.account-draft-row')).toHaveCount(0);
    await page.reload();
    await ready(page);
    await dashboard(page);
    await page.goto('/#list/new');
    await ready(page);
    await chooser(page);
    noPublication(boundary);
  });
}

test('account: revision-zero skeleton and another owner’s retained history do not count', async ({ page, context }) => {
  const cloud = createCloud();
  retainedHead(cloud, { state: 'editing', revision: 0 });
  retainedHead(cloud, { user: otherOwner });
  const state = await boot(page, context, { cloud, user: owner });
  await chooser(page);
  expect(cloud.requests.filter(request => request.path.includes('listing_draft') && request.method === 'POST')).toEqual([]);
  noPublication(state);
});

test('guest/account switches keep their first-entry histories separate on the same browser', async ({ page, context }) => {
  const state = await boot(page, context);
  const form = await chooseHouse(page);
  await form.locator('.journey-save-exit').click();
  await dashboard(page);
  async function identity(user) {
    await page.goto('/#home');
    await ready(page);
    await page.evaluate(session => {
      if (session) localStorage.setItem('vacancy-session-v01', JSON.stringify(session));
      else localStorage.removeItem('vacancy-session-v01');
    }, user ? sessionFor(user) : null);
    await page.reload();
    await ready(page);
    await clickList(page);
  }
  await identity(owner);
  await chooser(page);
  const accountForm = await chooseHouse(page);
  await accountForm.locator('.journey-save-exit').click();
  await dashboard(page);
  await identity(otherOwner);
  await chooser(page);
  await identity(owner);
  await dashboard(page);
  await identity(null);
  await dashboard(page);
  expect([...state.cloud.heads.values()].every(head => head.owner_id === owner.id)).toBe(true);
  noPublication(state);
});

test('account: history loading and failure never flash an empty-owner chooser; retry can recover', async ({ page, context }) => {
  const cloud = createCloud();
  retainedHead(cloud);
  const state = await install(context, cloud, { signedIn: owner });
  let release, attempted = 0;
  const held = new Promise(resolve => release = resolve);
  await context.route('**/rest/v1/listing_drafts?*', async route => {
    attempted++;
    await held;
    await route.fulfill({ status: 503, json: { message: 'Synthetic history unavailable', code: 'SYNTHETIC' } });
  });
  await page.goto('/#list');
  await expect.poll(() => attempted).toBeGreaterThan(0);
  await expect(page.locator('[data-listing-type=House]')).toHaveCount(0);
  await expect(page.locator('#listingForm')).toHaveCount(0);
  release();
  await expect(page.getByRole('alert')).toContainText(/could not|unavailable|try again|connection/i);
  await expect(page.locator('[data-listing-type=House]')).toHaveCount(0);
  await context.unroute('**/rest/v1/listing_drafts?*');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await dashboard(page);
  noPublication(state);
});

test('account: a late history response cannot replace a newer route or another owner', async ({ page, context }) => {
  const cloud = createCloud();
  retainedHead(cloud);
  const state = await install(context, cloud, { signedIn: owner });
  let release, attempted = 0;
  const held = new Promise(resolve => release = resolve);
  await context.route('**/rest/v1/listing_drafts?*', async route => {
    attempted++;
    await held;
    await route.fallback();
  });
  await page.goto('/#list');
  await expect.poll(() => attempted).toBeGreaterThan(0);
  await navigation(page).locator('[data-nav=home]').click();
  await expect(page).toHaveURL(/#home$/);
  await page.evaluate(async session => {
    localStorage.setItem('vacancy-session-v01', JSON.stringify(session));
    await refreshIdentity();
  }, sessionFor(otherOwner));
  release();
  await page.waitForTimeout(400);
  await expect(page).toHaveURL(/#home$/);
  await expect(page.locator('#listingHost')).toHaveCount(0);
  await context.unroute('**/rest/v1/listing_drafts?*');
  await clickList(page);
  await chooser(page);
  noPublication(state);
});

for (const status of ['active', 'archived']) test(`existing ${status} lister without account-draft history still opens dashboard`, async ({ page, context }) => {
  const cloud = createCloud();
  const propertyId = randomUUID(), roomId = randomUUID(), vacancyId = randomUUID();
  cloud.published.set('existing-listing', {
    id: vacancyId, room_id: roomId, status, rent_amount: 25000, rent_currency: 'KES', rent_period: 'month',
    rooms: { id: roomId, name: 'Existing studio', unit_type: 'Studio', properties: {
      id: propertyId, owner_id: owner.id, title: 'Established property', suburb: 'Westlands', city: 'Nairobi', country: 'Kenya', market_code: 'KE',
    } },
  });
  const state = await boot(page, context, { cloud, user: owner });
  await dashboard(page);
  if (status === 'archived') await page.locator('#vacancyFilter').selectOption('archived');
  await expect(page.locator('#mine')).toContainText('Established property');
  expect(cloud.heads.size).toBe(0);
  await page.locator('#createNewListing').click();
  await expect(page).toHaveURL(/#list\/new$/);
  await chooser(page);
  noPublication(state);
});

test('guest: explicit Save waits for its durable local checkpoint before switching to dashboard', async ({ page, context }) => {
  const state = await boot(page, context);
  const form = await chooseHouse(page);
  await page.evaluate(() => {
    const original = indexedDB.open;
    let held = false;
    indexedDB.open = function (...args) {
      const request = original.apply(this, args);
      if (held) return request;
      held = true;
      Object.defineProperty(request, 'onsuccess', { set(callback) {
        request.addEventListener('success', event => {
          window.__firstEntryStorageHeld = true;
          window.__releaseFirstEntryStorage = () => { indexedDB.open = original; callback.call(request, event); };
        });
      } });
      return request;
    };
  });
  await form.locator('.journey-save-exit').click();
  await page.waitForFunction(() => window.__firstEntryStorageHeld);
  await expect(form).toBeVisible();
  await expect(form).toHaveJSProperty('inert', true);
  await expect(page.locator('#listingHost')).toHaveAttribute('data-mode', 'create');
  await page.evaluate(() => window.__releaseFirstEntryStorage());
  await dashboard(page);
  await expect(page.locator('.local-draft-row')).toHaveCount(1);
  expect(state.cloud.heads.size).toBe(0);
  expect(state.authRequests).toEqual([]);
  noPublication(state);
});

test('guest: failed explicit Save keeps first-entry routing until a successful retry', async ({ page, context }) => {
  const state = await boot(page, context);
  const form = await chooseHouse(page);
  await page.evaluate(() => {
    const original = indexedDB.open;
    indexedDB.open = () => { throw new DOMException('Synthetic local save failed', 'UnknownError'); };
    window.__restoreFirstEntryStorage = () => { indexedDB.open = original; };
  });
  await form.locator('.journey-save-exit').click();
  await expect(page.locator('#toast')).toContainText(/could not be saved/i);
  await expect(form.locator('.journey-save-exit')).toBeEnabled();
  await page.evaluate(() => window.__restoreFirstEntryStorage());
  await page.goto('/#list');
  await ready(page);
  await chooser(page);
  const retried = await chooseHouse(page);
  await retried.locator('.journey-save-exit').click();
  await dashboard(page);
  noPublication(state);
});

for (const user of [null, owner]) {
  test(`${user ? 'account' : 'guest'}: meaningful acknowledged autosave establishes history`, async ({ page, context }) => {
    const state = await boot(page, context, { user });
    const form = await chooseHouse(page);
    await form.locator('[name=address]').fill('Durably saved first draft');
    if (user) {
      await expect.poll(() => [...state.cloud.heads.values()].some(head => head.revision > 0)).toBe(true);
      await expect.poll(() => form.evaluate(element => VACANCY_ACCOUNT_DRAFT_UI.metadata(element)?.synced === true)).toBe(true);
    } else {
      await expect.poll(() => form.evaluate(element => Number(element.dataset.guestDraftRevision || 0))).toBeGreaterThan(0);
    }
    await homeThenList(page);
    await dashboard(page);
    await expect(page.locator(user ? '.account-draft-row' : '.local-draft-row')).toHaveCount(1);
    noPublication(state);
  });
}

test('account: existing-listing lookup failure does not become an empty-account chooser', async ({ page, context }) => {
  const state = await boot(page, context, { user: owner, route: '#home' });
  await page.evaluate(() => {
    const original = VACANCY_BACKEND.myVacancies;
    VACANCY_BACKEND.myVacancies = async () => { throw new Error('Synthetic inventory unavailable'); };
    window.__restoreFirstEntryInventory = () => { VACANCY_BACKEND.myVacancies = original; };
  });
  await clickList(page);
  await expect(page.getByRole('alert')).toContainText(/could not|unavailable/i);
  await expect(page.locator('[data-listing-type=House]')).toHaveCount(0);
  await page.evaluate(() => window.__restoreFirstEntryInventory());
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await chooser(page);
  noPublication(state);
});


test('account: another owner’s existing listing does not establish current-owner history', async ({ page, context }) => {
  const cloud = createCloud();
  cloud.published.set('foreign-listing', {
    id: randomUUID(), status: 'active',
    rooms: { id: randomUUID(), name: 'Foreign listing', properties: { id: randomUUID(), owner_id: otherOwner.id } },
  });
  const state = await boot(page, context, { cloud, user: owner });
  await chooser(page);
  noPublication(state);
});
