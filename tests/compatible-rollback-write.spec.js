const {test, expect} = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {createCloud, install, owner} = require('../qa/account-drafts/synthetic-cloud.cjs');

// Real original-UI browser code, local storage and native IndexedDB. Every
// remote HTTP request is intercepted by synthetic-cloud before navigation.
test.use({serviceWorkers: 'block'});
const alternativeRuntime = Boolean(process.env.APP_ROOT);
let server, origin;
test.beforeAll(async () => {
  const root = process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : path.resolve(__dirname, '../app');
  const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403); res.end(); return;}
    fs.readFile(file, (error, data) => {
      res.writeHead(error ? 404 : 200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
      res.end(error ? 'Not found' : data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {await new Promise(resolve => server.close(resolve));});

const unit = '30000000-0000-4000-8000-000000000003';
const guest = '40000000-0000-4000-8000-000000000004';
const png = [...Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64')];
const addedPhoto = {name: 'edited-photo.png', mimeType: 'image/png', buffer: Buffer.from([...png, 4, 5, 6])};
const draftWrites = cloud => cloud.requests.filter(req => req.method === 'POST' && (req.path.includes('listing_draft') || req.path.includes('listing-draft-media')));
const commits = cloud => cloud.requests.filter(req => req.path.endsWith('/commit_listing_draft')).length;
const cloudHead = cloud => [...cloud.heads.values()][0];
const cloudManifest = cloud => cloud.manifests.get(cloudHead(cloud).id + '/' + cloudHead(cloud).current_transfer_id);

async function ready(page) {await page.waitForFunction(() => typeof booting !== 'undefined' && !booting);}
async function boot(page, context, cloud = createCloud()) {
  const state = await install(context, cloud, {signedIn: owner});
  await page.goto(origin + '/#list');
  await ready(page);
  return state;
}

async function seed(page, {legacy = false, pointer = true, claimed = false} = {}) {
  return page.evaluate(async ({owner, unit, guest, png, legacy, pointer, claimed}) => {
    const key = `vacancy-listing-draft-v${legacy ? 1 : 2}:${owner.id}:${claimed ? 'new-property:guest-' + guest : 'new-property'}`;
    const mediaKey = pointer ? key + ':media:previous-generation' : key;
    // Payload format stays v1; only the signed-in storage namespace is v2.
    const data = {
      version: 1, scope: 'new-property', savedMedia: true, editVacancy: null,
      shared: {propertyTitle: 'Rollback owned studio', country: 'Kenya', region: 'Nairobi', city: 'Nairobi', locality: 'Westlands', address: 'Exact original device address', publicLatitude: '-1.26', publicLongitude: '36.8'},
      units: [{_requestId: unit, _titleMode: 'manual', roomName: 'Owned recovery studio', unitType: 'Studio', rentAmount: '25000', rentCurrency: 'KES', rentPeriod: 'month', description: claimed ? 'Latest already-claimed account edits' : 'Exact device-only description', _privateName: 'Rollback private unit'}],
      _accountDraft: {ownerId: owner.id, sourceId: unit, revision: 0, synced: false},
      ...(pointer ? {_draftMediaKey: mediaKey} : {}),
      ...(claimed ? {_guestDraft: {id: guest, revision: 1, ownerId: owner.id}} : {}),
    };
    const files = [1, 2].map(n => new File([new Uint8Array([...png, n])], 'owned-latest-' + n + '.png', {type: 'image/png', lastModified: 123 + n}));
    await draftMediaStore('put', mediaKey, [{id: unit, files}]);
    if (pointer) await draftMediaStore('put', key, [{id: unit, files: [new File(['stale base row'], 'stale-base.png', {type: 'image/png', lastModified: 1})]}]);
    // Whitespace is deliberate: original metadata must remain byte-for-byte.
    const raw = JSON.stringify(data, null, 2);
    localStorage.setItem(key, raw);
    if (claimed) {
      const oldData = {...data, units: [{...data.units[0], description: 'Stale original guest description'}]};
      await draftMediaStore('put', 'vacancy-guest-listing-bundle-v1:' + guest, {
        version: 1, id: guest, revision: 1, savedAt: Date.now(), ownerId: owner.id, draftKey: key, data: oldData,
        media: [{id: unit, files: [new File(['stale original guest bytes'], 'stale-guest.png', {type: 'image/png', lastModified: 2})]}],
      });
      sessionStorage.setItem('vacancy-guest-listing-active-v1', guest);
      const now = Date.now();
      sessionStorage.setItem('vacancy-guest-listing-auth-v1', JSON.stringify({version: 1, draftId: guest, revision: 1, createdAt: now, expiresAt: now + 86400000}));
    }
    renderLocalDraftRows();
    return {key, mediaKey, raw};
  }, {owner, unit, guest, png, legacy, pointer, claimed});
}

async function inspect(page, key) {
  return page.evaluate(async key => {
    const raw = localStorage.getItem(key), data = JSON.parse(raw);
    const readRows = async storageKey => {
      const rows = await draftMediaStore('get', storageKey);
      if (!rows) return null;
      return Promise.all(rows.map(async row => ({id: row.id, files: await Promise.all(row.files.map(async file => ({name: file.name, type: file.type, lastModified: file.lastModified, bytes: [...new Uint8Array(await file.arrayBuffer())]})))})));
    };
    return {raw, data, media: await readRows(data?._draftMediaKey || key), baseMedia: await readRows(key)};
  }, key);
}

async function guestBundle(page) {
  return page.evaluate(async guest => {
    const bundle = await draftMediaStore('get', 'vacancy-guest-listing-bundle-v1:' + guest);
    return {...bundle, media: await Promise.all(bundle.media.map(async row => ({id: row.id, files: await Promise.all(row.files.map(async file => ({name: file.name, type: file.type, lastModified: file.lastModified, bytes: [...new Uint8Array(await file.arrayBuffer())]})))})))};
  }, guest);
}

async function restored(form) {
  await form.evaluate(f => f._draftMediaRestore);
  return form.evaluate(async f => ({
    key: listingDraftKey(f), owner: f.dataset.draftOwnerId,
    description: f.querySelector('[data-base-name=description]').value,
    title: f.querySelector('[data-base-name=roomName]').value,
    address: f.elements.address.value,
    media: await Promise.all([...f.querySelectorAll('.unit-editor')].map(async row => ({
      id: row.dataset.requestId,
      files: await Promise.all(selectedPhotoFiles(row.querySelector('input[type=file]')).map(async file => ({name: file.name, type: file.type, lastModified: file.lastModified, bytes: [...new Uint8Array(await file.arrayBuffer())]}))),
    }))),
  }));
}

async function assertOriginalForm(page) {
  const form = page.locator('#listingForm');
  await expect(form).toBeVisible();
  await form.evaluate(f => f._draftMediaRestore);
  if (!alternativeRuntime) {
    await expect(form).not.toHaveClass(/listing-accordion/);
    await expect(form.locator('.listing-accordion-section')).toHaveCount(0);
    await expect(form.locator('.listing-publish-account')).toContainText(owner.email);
  }
  await expect(form.locator('.journey-save-exit')).toHaveText('Save and exit');
  return form;
}

async function resume(page, {legacy = false} = {}) {
  if (legacy) page.once('dialog', dialog => dialog.accept());
  await page.locator('.local-draft-row [data-resume-draft]').click();
  await expect(page).toHaveURL(/#list\/new$/);
  return assertOriginalForm(page);
}

function noPublication(state) {
  expect(state.cloud.publicWrites).toEqual([]);
  expect(state.calls.filter(call => !['ownerMediaLibrary', 'mediaLibraryFiles'].includes(call.method))).toEqual([]);
  expect(state.cloud.requests.filter(req => /\/(begin_listing_draft_publish|listing_draft_publish_action|publish_listing_draft_unit|finish_listing_draft_publish)$/.test(req.path))).toEqual([]);
}

function assertCloudBytes(cloud, expected) {
  const head = cloudHead(cloud), manifest = cloudManifest(cloud);
  expect(head.owner_id).toBe(owner.id);
  expect(head.state).toBe('editing');
  expect(manifest.committed_revision).toBe(head.revision);
  expect(manifest.payload.units[0].description).toBe(expected.description);
  expect(manifest.payload.units[0].roomName).toBe(expected.title);
  expect(manifest.payload.shared.address).toBe(expected.address);
  for (const key of ['_draftMediaKey', '_draftMediaPreviousKeys', '_legacySourceKey', '_legacySourceSnapshot']) expect(manifest.payload).not.toHaveProperty(key);
  const files = expected.media.flatMap(row => row.files);
  expect(manifest.assets).toHaveLength(files.length);
  for (const [index, asset] of manifest.assets.entries()) {
    expect(asset.unitRequestId).toBe(expected.media[0].id);
    expect(asset.order).toBe(index);
    expect(asset.fileName).toBe(files[index].name);
    expect(asset.lastModified).toBe(files[index].lastModified);
    expect(asset.mime).toBe(files[index].type);
    expect([...cloud.objects.get(asset.path).bytes]).toEqual(files[index].bytes);
    expect(cloud.objects.get(asset.path).owner).toBe(owner.id);
  }
}

async function editAndAcknowledge(page, form, state, description) {
  const key = await form.evaluate(f => listingDraftKey(f));
  expect(key).toMatch(new RegExp('^vacancy-listing-draft-v2:' + owner.id + ':'));
  let release;
  state.cloud.holdCommit = new Promise(resolve => {release = resolve;});
  const initialCommits = commits(state.cloud);
  try {
    if (await form.getAttribute('data-journey-step') === '0') await form.locator('.journey-next').click();
    await form.locator('[data-base-name=description]').fill(description);
    await form.locator('input[type=file]').setInputFiles(addedPhoto);
    await expect(form.locator('.photo-selection-item')).toHaveCount(3);
    const expected = await restored(form);
    await form.locator('.journey-save-exit').click();
    await expect.poll(() => commits(state.cloud)).toBeGreaterThan(initialCommits);
    const beforeAck = await inspect(page, key);
    expect(beforeAck.data._accountDraft.synced).toBe(false);
    expect(beforeAck.data._draftMediaKey).toMatch(new RegExp('^' + key + ':media:'));
    expect(beforeAck.media).toEqual(expected.media);
    expect(beforeAck.data.units[0].description).toBe(description);
    await expect(page).toHaveURL(/#list\/new$/);
    await expect(form.locator('[data-account-draft-status] span')).toHaveText('Saving to your account…');
    state.cloud.holdCommit = null; release();
    await expect(page).toHaveURL(/#list$/);
    const afterAck = await inspect(page, key);
    expect(afterAck.data._draftMediaKey).toBe(beforeAck.data._draftMediaKey);
    expect(afterAck.media).toEqual(expected.media);
    expect(afterAck.data._accountDraft.synced).toBe(true);
    expect(afterAck.data._accountDraft.revision).toBe(cloudHead(state.cloud).revision);
    assertCloudBytes(state.cloud, expected);
    noPublication(state);
    return {key, expected, afterAck};
  } finally {state.cloud.holdCommit = null; release();}
}

async function checkLocalReload(page, saved) {
  await page.reload(); await ready(page);
  expect(await inspect(page, saved.key)).toEqual(saved.afterAck);
  // Original UI consumes the opening-draft slot. A synced cache has no local
  // dashboard row, so reselect this verified key to isolate local rehydration;
  // the independent clean-context case exercises the normal cloud dashboard.
  await page.evaluate(key => sessionStorage.setItem('vacancy-opening-draft', key), saved.key);
  await page.goto(origin + '/#list/new');
  const form = await assertOriginalForm(page);
  expect(await restored(form)).toEqual(saved.expected);
  await expect(form.locator('[data-account-draft-status] span')).toBeVisible();
  await expect(form.locator('[data-account-draft-status] span')).toHaveText('Saved to account');
  await page.evaluate(key => sessionStorage.setItem('vacancy-opening-draft', key), saved.key);
  await page.reload(); await ready(page);
  expect(await restored(await assertOriginalForm(page))).toEqual(saved.expected);
  expect(await inspect(page, saved.key)).toEqual(saved.afterAck);
}

async function checkCleanCloudResume(browser, page, cloud, expected) {
  const fresh = await browser.newContext({viewport: page.viewportSize(), serviceWorkers: 'block'});
  try {
    const state = await install(fresh, cloud, {signedIn: owner}), other = await fresh.newPage();
    await other.goto(origin + '/#list'); await ready(other);
    expect(await other.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('vacancy-listing-draft')))).toEqual([]);
    await expect(other.locator('[data-open-account-draft]')).toHaveCount(1);
    const before = draftWrites(cloud).length;
    await other.locator('[data-open-account-draft]').click();
    const recovered = await restored(await assertOriginalForm(other));
    expect(recovered.key).toMatch(new RegExp('^vacancy-listing-draft-v2:' + owner.id + ':'));
    expect({...recovered, key: expected.key}).toEqual(expected);
    await other.evaluate(key => sessionStorage.setItem('vacancy-opening-draft', key), recovered.key);
    await other.reload(); await ready(other);
    expect({...await restored(await assertOriginalForm(other)), key: expected.key}).toEqual(expected);
    expect(draftWrites(cloud)).toHaveLength(before);
    noPublication(state);
  } finally {await fresh.close();}
}

test('v2 unsynced pointer draft edits and Save and exit retain exact acknowledged photos through local and clean cloud reload', async ({page, context, browser}) => {
  const state = await boot(page, context), seeded = await seed(page), original = await inspect(page, seeded.key);
  const form = await resume(page);
  expect((await restored(form)).media).toEqual(original.media);
  expect(draftWrites(state.cloud)).toEqual([]);
  const saved = await editAndAcknowledge(page, form, state, 'Durable original-UI v2 edited description');
  await checkLocalReload(page, saved);
  await checkCleanCloudResume(browser, page, state.cloud, saved.expected);
  noPublication(state);
});

for (const pointer of [false, true]) test(`v1 ${pointer ? 'pointer' : 'raw-row'} copy stays byte-for-byte untouched through v2 edit, successful ACK and reload`, async ({page, context, browser}) => {
  const state = await boot(page, context), seeded = await seed(page, {legacy: true, pointer});
  const old = await inspect(page, seeded.key);
  await expect(page.locator('.local-draft-row [data-delete-draft]')).toHaveCount(0);
  const form = await resume(page, {legacy: true});
  const recovered = await restored(form);
  expect(recovered.key).not.toBe(seeded.key);
  expect(recovered.media).toEqual(old.media);
  expect(recovered.description).toBe(old.data.units[0].description);
  expect(await inspect(page, seeded.key)).toEqual(old);
  expect(draftWrites(state.cloud)).toEqual([]);
  const saved = await editAndAcknowledge(page, form, state, 'Successful v2 copy-only recovery edits');
  expect(await inspect(page, seeded.key)).toEqual(old);
  await checkLocalReload(page, saved);
  expect(await inspect(page, seeded.key)).toEqual(old);
  await checkCleanCloudResume(browser, page, state.cloud, saved.expected);
  expect(await inspect(page, seeded.key)).toEqual(old);
  noPublication(state);
});

test('already-claimed v1 guest opens latest owned text and photos, then saves durable v2 without altering original snapshots', async ({page, context, browser}) => {
  const state = await boot(page, context), seeded = await seed(page, {legacy: true, pointer: true, claimed: true});
  const old = await inspect(page, seeded.key), oldGuest = await guestBundle(page);
  await page.goto(origin + '/#auth');
  await expect(page.getByRole('button', {name: 'Open saved account draft', exact: true})).toBeVisible();
  expect(draftWrites(state.cloud)).toEqual([]);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Open saved account draft', exact: true}).click();
  const form = await assertOriginalForm(page), recovered = await restored(form);
  expect(recovered.description).toBe('Latest already-claimed account edits');
  expect(recovered.media).toEqual(old.media);
  expect(recovered.media.flatMap(row => row.files.map(file => file.name))).not.toContain('stale-guest.png');
  expect(await guestBundle(page)).toEqual(oldGuest);
  expect(await inspect(page, seeded.key)).toEqual(old);
  expect(draftWrites(state.cloud)).toEqual([]);
  const saved = await editAndAcknowledge(page, form, state, 'Durable latest owned guest recovery edit');
  await checkLocalReload(page, saved);
  await checkCleanCloudResume(browser, page, state.cloud, saved.expected);
  expect(await inspect(page, seeded.key)).toEqual(old);
  expect(await guestBundle(page)).toEqual(oldGuest);
  noPublication(state);
});

test('newer cross-tab photo pointer remains unsynced and retains exact bytes through an older cloud ACK and logout', async ({page, context}, testInfo) => {
  const state = await boot(page, context), seeded = await seed(page), form = await resume(page);
  const key = await form.evaluate(f => listingDraftKey(f));
  await form.evaluate(f => {
    window.__rollbackWriteEvents = [];
    const note = (event, details) => window.__rollbackWriteEvents.push({at: performance.now(), event, ...details});
    const current = () => ({raw: localStorage.getItem(listingDraftKey(f)), form: listingDraftData(f), files: [...f.querySelectorAll('input[type=file]')].flatMap(input => selectedPhotoFiles(input).map(file => file.name))});
    for (const event of ['input', 'change', 'vacancy:photos-changed', 'vacancy:location-used']) f.addEventListener(event, e => note(event, {target: e.target.name || e.target.tagName, ...current()}), true);
    const write = writeListingCheckpoint;
    writeListingCheckpoint = async (...args) => {
      note('checkpoint-start', {input: args[1], stack: new Error().stack, ...current()});
      try {return await write(...args);} finally {note('checkpoint-finish', current());}
    };
    window.__rollbackMark = event => note(event, current());
  });
  let release, checkpointEvents;
  state.cloud.holdCommit = new Promise(resolve => {release = resolve;});
  try {
    if (await form.getAttribute('data-journey-step') === '0') await form.locator('.journey-next').click();
    await form.locator('[data-base-name=description]').fill('Same fields shared by two tabs');
    await expect.poll(() => commits(state.cloud)).toBe(1);
    const older = await inspect(page, key), other = await context.newPage();
    try {
      await other.goto(origin + '/#home'); await ready(other);
      await other.evaluate(async key => {
        const data = JSON.parse(localStorage.getItem(key)), oldPointer = data._draftMediaKey;
        const media = await draftMediaStore('get', oldPointer);
        media[0].files.push(new File(['exact second-tab newer photo bytes'], 'second-tab-only.png', {type: 'image/png', lastModified: 456}));
        const pointer = key + ':media:' + crypto.randomUUID();
        await draftMediaStore('put', pointer, media);
        data._draftMediaPreviousKeys = [...new Set([oldPointer, ...(data._draftMediaPreviousKeys || [])])];
        data._draftMediaKey = pointer;
        data._accountDraft.synced = false;
        localStorage.setItem(key, JSON.stringify(data));
      }, key);
    } finally {await other.close();}
    const newer = await inspect(page, key);
    expect(newer.data.units).toEqual(older.data.units);
    expect(newer.data._draftMediaKey).not.toBe(older.data._draftMediaKey);
    expect(newer.media[0].files).toHaveLength(3);
    state.cloud.holdCommit = null; release();
    if (alternativeRuntime) await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state', 'saved');
    else await expect(form.locator('[data-account-draft-status] span')).toHaveText('Saved to account');
    expect(cloudManifest(state.cloud).assets.map(asset => asset.fileName)).toEqual(older.media[0].files.map(file => file.name));
    expect(await inspect(page, key)).toEqual(newer);
    expect(newer.data._accountDraft.synced).toBe(false);
    await page.evaluate(() => window.__rollbackMark('acknowledged-before-navigation'));
    await page.evaluate(() => nav('account'));
    await page.evaluate(() => window.__rollbackMark('account-navigation'));
    await page.locator('#signout').click();
    await expect(page).toHaveURL(/#home$/);
    expect(await inspect(page, key)).toEqual(newer);
    checkpointEvents = await page.evaluate(() => window.__rollbackWriteEvents);
    await page.reload(); await ready(page);
    expect(await inspect(page, key)).toEqual(newer);
    expect(commits(state.cloud)).toBe(1);
    noPublication(state);
    expect(seeded.key).toBe(key);
  } finally {
    state.cloud.holdCommit = null; release();
    await testInfo.attach('cross-tab-checkpoint-events.json', {body: JSON.stringify({events: checkpointEvents || await page.evaluate(() => window.__rollbackWriteEvents), requests: state.cloud.requests}, null, 2), contentType: 'application/json'});
  }
});
