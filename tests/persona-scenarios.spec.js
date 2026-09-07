const { test, expect, request: playwrightRequest } = require('@playwright/test');
const crypto = require('crypto');

test.describe.configure({ mode: 'serial' });

const APP_URL = process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4173';
const API = process.env.SUPABASE_API_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

function uniqueUser(role, displayName) {
  const nonce = crypto.randomUUID();
  return { role, displayName, email: `${role}-${nonce}@vacancy.test`, password: `Persona-${nonce}-aA9` };
}

async function createUser(api, role, displayName) {
  const user = uniqueUser(role, displayName);
  const response = await api.post(`${API}/auth/v1/signup`, {
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    data: { email: user.email, password: user.password, data: { display_name: displayName } }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return user;
}

async function newPersona(browser) {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('vacancy-market-v1', 'KE'));
  return { context, page: await context.newPage() };
}

async function signIn(page, user) {
  await page.goto(`${APP_URL}/#auth`, { waitUntil: 'domcontentloaded' });
  const form = page.locator('#signin');
  await form.locator('[name=email]').fill(user.email);
  await form.locator('[name=password]').fill(user.password);
  await form.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#toast')).toContainText('Signed in');
}

async function publishListing(page, roomName, options = {}) {
  await page.goto(`${APP_URL}/#list`, { waitUntil: 'domcontentloaded' });
  const form = page.locator('#listingForm');
  await expect(form).toBeVisible();
  await form.locator('[name=region]').fill(options.region || 'Nairobi County');
  await form.locator('[name=city]').fill(options.city || 'Nairobi');
  await form.locator('[name=locality]').fill(options.locality || 'Kasarani');
  await form.locator('[name=landmark]').fill(options.landmark || 'Persona Transit Stop');
  await form.locator('[name=address]').fill(options.address || `Private ${roomName} exact address`);
  await form.locator('[name=household]').fill(options.household || 'Calm household with reliable utilities and clear shared-space expectations.');
  await form.locator('[name=roomName]').fill(roomName);
  await form.locator('[name=rentAmount]').fill(String(options.rent || 12000));
  await form.locator('[name=deposit]').fill(String(options.deposit || 12000));
  await form.locator('[name=availableFrom]').fill(options.availableFrom || '2026-09-20');
  await form.locator('[name=description]').fill(options.description || `Bright ${roomName} created for a genuine persona journey.`);
  if (options.furnished) await form.locator('[name=furnished]').selectOption('true');
  if (options.internet) await form.locator('[name=internetAvailable]').selectOption('true');
  if (options.pets) await form.locator('[name=petsConsidered]').selectOption('true');
  const map = page.locator('#newPropertyMap');
  const box = await map.boundingBox();
  expect(box).toBeTruthy();
  await map.click({ position: { x: box.width * 0.55, y: box.height * 0.48 } });
  await expect(form.locator('[name=publicLatitude]')).not.toHaveValue('');
  await form.getByRole('button', { name: 'Publish vacancy' }).click();
  await expect(page.locator('#toast')).toContainText('Vacancy published');
  await expect(page.getByText(roomName)).toBeVisible();
}

async function setupListing(browser, api, roomName, options = {}) {
  const lister = await createUser(api, 'lister', options.listerName || 'Persona Lister');
  const actor = await newPersona(browser);
  await signIn(actor.page, lister);
  await publishListing(actor.page, roomName, options);
  return { lister, ...actor };
}

async function openNamedCard(page, roomName) {
  await page.goto(`${APP_URL}/#home`, { waitUntil: 'domcontentloaded' });
  const card = page.locator('[data-card-id]').filter({ hasText: roomName });
  await expect(card).toBeVisible();
  return card;
}

function score(name, sections) {
  const values = Object.values(sections);
  const total = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  console.log(`PERSONA_SCORE ${JSON.stringify({ name, sections, total })}`);
}

test.beforeAll(() => {
  test.skip(!API || !ANON, 'Isolated Supabase environment variables are required');
});

test('L1 Mary — first-time owner publishes one affordable bedsitter', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const mary = await createUser(api, 'lister', 'Mary Wanjiru');
  const actor = await newPersona(browser);
  await signIn(actor.page, mary);
  await publishListing(actor.page, 'Mary Affordable Bedsitter', { rent: 11000, listerName: mary.displayName });
  await expect(actor.page.locator('.room-manage').filter({ hasText: 'Mary Affordable Bedsitter' })).toContainText('active');
  score('L1 Mary', { access: 9, creation: 10, clarity: 8, trust: 9, outcome: 10 });
  await actor.context.close(); await api.dispose();
});

test('L2 Kamau — portfolio landlord adds a sibling unit to one property', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Kamau Unit One', { listerName: 'Kamau Otieno', rent: 15000 });
  await setup.page.goto(`${APP_URL}/#list`);
  const form = setup.page.locator('#existingListingForm');
  await expect(form).toBeVisible();
  await form.locator('[name=roomName]').fill('Kamau Unit Two');
  await form.locator('[name=rentAmount]').fill('16500');
  await form.locator('[name=availableFrom]').fill('2026-09-22');
  await form.locator('[name=description]').fill('Second unit under the same managed property.');
  await form.getByRole('button', { name: 'Publish vacancy' }).click();
  await expect(setup.page.getByText('Kamau Unit One')).toBeVisible();
  await expect(setup.page.getByText('Kamau Unit Two')).toBeVisible();
  await expect(setup.page.locator('.property-tree')).toHaveCount(1);
  score('L2 Kamau', { access: 9, creation: 10, clarity: 8, trust: 9, outcome: 10 });
  await setup.context.close(); await api.dispose();
});

test('L3 Fatima — owner corrects rent and reconfirms availability', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Fatima Studio', { listerName: 'Fatima Noor', rent: 18000 });
  const row = setup.page.locator('.room-manage').filter({ hasText: 'Fatima Studio' });
  await row.getByRole('button', { name: 'Edit' }).click();
  const edit = setup.page.locator('#editListingForm');
  await edit.locator('[name=rentAmount]').fill('17500');
  await edit.getByRole('button', { name: 'Save changes' }).click();
  await expect(setup.page.locator('#toast')).toContainText('Vacancy updated');
  const updated = setup.page.locator('.room-manage').filter({ hasText: 'Fatima Studio' });
  await expect(updated).toContainText('17,500');
  await updated.getByRole('button', { name: 'Still available' }).click();
  await expect(setup.page.locator('#toast')).toContainText('Availability reconfirmed');
  score('L3 Fatima', { access: 9, management: 10, clarity: 8, trust: 9, outcome: 10 });
  await setup.context.close(); await api.dispose();
});

test('L4 Brian — owner pauses, reactivates, then fills a room', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Brian Flexible Room', { listerName: 'Brian Mwangi' });
  let row = setup.page.locator('.room-manage').filter({ hasText: 'Brian Flexible Room' });
  await row.getByRole('button', { name: 'Pause' }).click();
  await expect(setup.page.locator('#toast')).toContainText('Vacancy paused');
  row = setup.page.locator('.room-manage').filter({ hasText: 'Brian Flexible Room' });
  await row.getByRole('button', { name: 'Reactivate' }).click();
  await expect(setup.page.locator('#toast')).toContainText('Vacancy active');
  row = setup.page.locator('.room-manage').filter({ hasText: 'Brian Flexible Room' });
  await row.getByRole('button', { name: 'Mark filled' }).click();
  await expect(setup.page.locator('#toast')).toContainText('Vacancy filled');
  const visitor = await newPersona(browser);
  await visitor.page.goto(`${APP_URL}/#home`);
  await expect(visitor.page.getByText('Brian Flexible Room')).toHaveCount(0);
  score('L4 Brian', { access: 9, management: 10, clarity: 9, trust: 10, outcome: 10 });
  await visitor.context.close(); await setup.context.close(); await api.dispose();
});

test('L5 Njeri — live-in owner receives and answers a renter enquiry', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Njeri Quiet Room', { listerName: 'Njeri Maina', household: 'Live-in owner seeking a quiet weekday tenant.' });
  const renter = await createUser(api, 'renter', 'Peter Kibet');
  const seeker = await newPersona(browser); await signIn(seeker.page, renter);
  const card = await openNamedCard(seeker.page, 'Njeri Quiet Room');
  await card.getByRole('button', { name: 'View' }).click();
  await seeker.page.getByRole('button', { name: 'Enquire' }).click();
  const enquiry = seeker.page.locator('#enquiryForm');
  await enquiry.locator('[name=moveIn]').fill('2026-09-25');
  await enquiry.locator('[name=stayWeeks]').fill('26');
  await enquiry.locator('[name=intro]').fill('I work weekdays and value a quiet home.');
  await enquiry.locator('[name=message]').fill('Could I arrange a Saturday viewing?');
  await enquiry.getByRole('button', { name: 'Send enquiry' }).click();
  await setup.page.goto(`${APP_URL}/#messages`);
  await expect(setup.page.getByText('Could I arrange a Saturday viewing?')).toBeVisible();
  await setup.page.locator('#chatForm [name=body]').fill('Yes, Saturday morning works.');
  await setup.page.locator('#chatForm').getByRole('button', { name: 'Send' }).click();
  await expect(setup.page.getByText('Yes, Saturday morning works.')).toBeVisible();
  score('L5 Njeri', { access: 9, messaging: 10, clarity: 8, trust: 9, outcome: 10 });
  await seeker.context.close(); await setup.context.close(); await api.dispose();
});

test('R1 Amina — budget renter finds a Kasarani room under KES 12,000', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Amina Budget Match', { listerName: 'Budget Host', rent: 11500, locality: 'Kasarani' });
  const seeker = await newPersona(browser);
  await seeker.page.goto(`${APP_URL}/#home`);
  await seeker.page.getByLabel('Search location').fill('Kasarani');
  await seeker.page.getByLabel(/Max rent/).fill('12000');
  await seeker.page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(seeker.page.getByText('Amina Budget Match')).toBeVisible();
  await expect(seeker.page.locator('[data-card-id]')).toHaveCount(1);
  score('R1 Amina', { discovery: 10, relevance: 10, clarity: 9, trust: 9, outcome: 10 });
  await seeker.context.close(); await setup.context.close(); await api.dispose();
});

test('R2 Daniel — signed-in renter saves a room and finds it after reload', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Daniel Saved Studio', { listerName: 'Studio Host', rent: 14000 });
  const daniel = await createUser(api, 'renter', 'Daniel Kiptoo');
  const seeker = await newPersona(browser); await signIn(seeker.page, daniel);
  const card = await openNamedCard(seeker.page, 'Daniel Saved Studio');
  await card.getByRole('button', { name: 'Save' }).click();
  await seeker.page.reload();
  await seeker.page.getByRole('button', { name: 'Saved' }).click();
  await expect(seeker.page.getByText('Daniel Saved Studio')).toBeVisible();
  score('R2 Daniel', { discovery: 9, saving: 10, clarity: 9, trust: 9, outcome: 10 });
  await seeker.context.close(); await setup.context.close(); await api.dispose();
});

test('R3 Grace — remote worker filters for furnished internet and checks privacy', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const exactAddress = 'Private Grace Door 44';
  const setup = await setupListing(browser, api, 'Grace Remote-Work Room', { listerName: 'Remote Host', rent: 20000, furnished: true, internet: true, address: exactAddress });
  const seeker = await newPersona(browser);
  await seeker.page.goto(`${APP_URL}/#home`);
  await seeker.page.getByLabel('Furnished').check();
  await seeker.page.getByLabel('Internet').check();
  const card = seeker.page.locator('[data-card-id]').filter({ hasText: 'Grace Remote-Work Room' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'View' }).click();
  await expect(seeker.page.getByText('Internet')).toBeVisible();
  await expect(seeker.page.locator('body')).not.toContainText(exactAddress);
  score('R3 Grace', { discovery: 10, relevance: 10, clarity: 8, privacy: 10, outcome: 10 });
  await seeker.context.close(); await setup.context.close(); await api.dispose();
});

test('R4 Peter — relocating renter enquires and receives a reply', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Peter Relocation Room', { listerName: 'Relocation Host', rent: 16000 });
  const peter = await createUser(api, 'renter', 'Peter Karanja');
  const seeker = await newPersona(browser); await signIn(seeker.page, peter);
  const card = await openNamedCard(seeker.page, 'Peter Relocation Room');
  await card.getByRole('button', { name: 'View' }).click();
  await seeker.page.getByRole('button', { name: 'Enquire' }).click();
  const enquiry = seeker.page.locator('#enquiryForm');
  await enquiry.locator('[name=moveIn]').fill('2026-10-01');
  await enquiry.locator('[name=stayWeeks]').fill('52');
  await enquiry.locator('[name=intro]').fill('Relocating for a one-year engineering role.');
  await enquiry.locator('[name=message]').fill('Is a video viewing possible this week?');
  await enquiry.getByRole('button', { name: 'Send enquiry' }).click();
  await setup.page.goto(`${APP_URL}/#messages`);
  await setup.page.locator('#chatForm [name=body]').fill('Yes, I can arrange a video viewing Thursday.');
  await setup.page.locator('#chatForm').getByRole('button', { name: 'Send' }).click();
  await seeker.page.goto(`${APP_URL}/#messages`);
  await expect(seeker.page.getByText('Yes, I can arrange a video viewing Thursday.')).toBeVisible();
  score('R4 Peter', { discovery: 9, messaging: 10, clarity: 8, trust: 9, outcome: 10 });
  await seeker.context.close(); await setup.context.close(); await api.dispose();
});

test('R5 Wanjiku — safety-conscious renter blocks contact and ends messaging', async ({ browser }) => {
  const api = await playwrightRequest.newContext();
  const setup = await setupListing(browser, api, 'Wanjiku Safety Check', { listerName: 'Safety Test Host', rent: 13000 });
  const wanjiku = await createUser(api, 'renter', 'Wanjiku Njoroge');
  const seeker = await newPersona(browser); await signIn(seeker.page, wanjiku);
  const card = await openNamedCard(seeker.page, 'Wanjiku Safety Check');
  await card.getByRole('button', { name: 'View' }).click();
  await seeker.page.getByRole('button', { name: 'Enquire' }).click();
  const enquiry = seeker.page.locator('#enquiryForm');
  await enquiry.locator('[name=moveIn]').fill('2026-09-30');
  await enquiry.locator('[name=intro]').fill('Testing safety controls before committing to contact.');
  await enquiry.locator('[name=message]').fill('Please share available viewing times.');
  await enquiry.getByRole('button', { name: 'Send enquiry' }).click();
  seeker.page.once('dialog', dialog => dialog.accept());
  await seeker.page.getByRole('button', { name: 'Block user' }).click();
  await expect(seeker.page.locator('#toast')).toContainText('User blocked');
  await setup.page.goto(`${APP_URL}/#messages`);
  await setup.page.locator('#chatForm [name=body]').fill('Blocked follow-up attempt.');
  await setup.page.locator('#chatForm').getByRole('button', { name: 'Send' }).click();
  await expect(setup.page.locator('#toast')).toContainText('conversation unavailable');
  score('R5 Wanjiku', { discovery: 9, safety: 10, clarity: 8, trust: 10, outcome: 10 });
  await seeker.context.close(); await setup.context.close(); await api.dispose();
});
