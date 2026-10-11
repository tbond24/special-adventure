const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const {File, Blob} = require('node:buffer');
const {webcrypto} = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../app/src/listing-draft-storage.js'), 'utf8');
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const UNIT = '33333333-3333-4333-8333-333333333333';
const SECOND = '44444444-4444-4444-8444-444444444444';
const EDIT = '55555555-5555-4555-8555-555555555555';
const legacy = (owner = OWNER, suffix = 'new-property') => `vacancy-listing-draft-v1:${owner}:${suffix}`;
const current = (owner = OWNER, suffix = 'new-property') => `vacancy-listing-draft-v2:${owner}:${suffix}`;
const clone = value => JSON.parse(JSON.stringify(value));
function fields() {
  return {version:1, scope:'new-property', editVacancy:null, savedMedia:true, savedAt:'original time',
    shared:{address:'  Original address \u0000 résumé  ', rentAmount:'00025.50', unknown:'retain'},
    units:[{_requestId:UNIT, roomName:'  front  ', unitDetails:'{"unusual":true}', _privateName:'keep'}],
    journey:{location:'pin', answers:[null, true, 'unchanged']},
    _accountDraft:{ownerId:OWNER, id:EDIT, revision:7, sourceId:SECOND, state:'editing', synced:true},
    _guestDraft:{ownerId:OWNER, id:SECOND, revision:3}, _accountSourceId:SECOND};
}
function photos() {
  return [{id:UNIT, files:[new File([new Uint8Array([0, 1, 255, 42, 128])], 'original résumé.jpg', {type:'image/jpeg', lastModified:1700000000000})]}];
}
function copyRows(rows) {
  return rows?.map(row => ({...row, files:row.files.map(file => file instanceof File ? new File([file], file.name, {type:file.type, lastModified:file.lastModified}) : file)}));
}
function copyRecord(value) {
  if (value == null || Array.isArray(value)) return copyRows(value);
  return {...clone(value), media:copyRows(value.media)};
}
function fixture({runtime = true} = {}) {
  const storage = new Map(), records = new Map(), calls = [];
  const state = {storage, records, calls, quota:false, uncertain:false, onGet:null, onPut:null};
  const localStorage = {
    get length() { return storage.size; },
    key(index) { return [...storage.keys()][index] ?? null; },
    getItem(key) { if (state.uncertain && key.startsWith('vacancy-listing-draft-v2:') && storage.has(key)) throw Error('readback unavailable'); return storage.get(key) ?? null; },
    setItem(key, value) { if (state.quota) throw Error('metadata quota'); storage.set(key, value); },
    removeItem(key) { storage.delete(key); }
  };
  const context = vm.createContext({window:{}, globalThis:undefined, localStorage, File, Blob, crypto:webcrypto,
    ...(runtime ? {currentUser:{id:OWNER}} : {}),
    async draftMediaStore(mode, key, value) {
      calls.push({mode, key});
      if (mode === 'get') { if (state.onGet) await state.onGet(key); return copyRecord(records.get(key)); }
      if (mode === 'put') { if (state.onPut) await state.onPut(key, value); records.set(key, copyRows(value)); return; }
      if (mode === 'delete') records.delete(key);
    }});
  vm.runInContext('globalThis = this;', context);
  vm.runInContext(source, context);
  return {...state, state, context, api:context.window.VACANCY_LISTING_STORAGE,
    seed(data = fields(), media = photos(), key = legacy()) {
      const raw = JSON.stringify(data, null, 2); storage.set(key, raw);
      if (media !== undefined && media !== null) records.set(data._draftMediaKey || key, media);
      return raw;
    }};
}
async function equalMedia(expected, actual) {
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    assert.equal(actual[i].id, expected[i].id);
    assert.equal(actual[i].files.length, expected[i].files.length);
    for (let j = 0; j < expected[i].files.length; j++) {
      const a = expected[i].files[j], b = actual[i].files[j];
      for (const prop of ['name','type','size','lastModified']) assert.equal(b[prop], a[prop]);
      assert.deepEqual(Buffer.from(await b.arrayBuffer()), Buffer.from(await a.arrayBuffer()));
    }
  }
}
function v2Keys(f) { return [...f.storage.keys()].filter(key => f.api.isCurrent(key, OWNER)); }

test('signed-in v2 helpers keep owner and v1 namespaces separate', () => {
  const f = fixture(), api = f.api;
  assert.equal(api.prefix(OWNER), current(OWNER, ''));
  assert.equal(api.key(OWNER, 'property:one'), current(OWNER, 'property:one'));
  assert.equal(api.assertCurrent(current(), OWNER), current());
  for (const bad of [legacy(), current(OTHER), current(OWNER, ''), 'vacancy-listing-draft-v2:guest:one', null]) {
    assert.equal(api.isCurrent(bad, OWNER), false);
    assert.throws(() => api.assertCurrent(bad, OWNER), /current account storage/);
  }
  assert.equal(api.isLegacy(legacy(), OWNER), true);
  assert.equal(api.isLegacy(legacy(OTHER), OWNER), false);
  for (const owner of ['', 'guest', 'anonymous', `${OWNER}:other`, null]) assert.throws(() => api.prefix(owner));
});

for (const withPointer of [false, true]) test(`explicit legacy import preserves exact fields and File bytes (${withPointer ? 'v1 pointer' : 'no pointer'})`, async () => {
  const f = fixture(), data = fields(), media = photos();
  if (withPointer) { data._draftMediaKey = legacy() + ':media:old'; data._draftMediaPreviousKeys = [legacy() + ':media:older']; }
  const raw = f.seed(data, media), originalMedia = f.records.get(data._draftMediaKey || legacy());
  const result = await f.api.importLegacy(OWNER, legacy());
  assert.ok(f.api.isCurrent(result.key, OWNER));
  const copied = JSON.parse(f.storage.get(result.key));
  assert.deepEqual(clone(result.data), copied);
  assert.equal(copied.version, 1);
  for (const name of ['shared','units','journey','_guestDraft','_accountSourceId','savedAt']) assert.deepEqual(copied[name], data[name]);
  assert.deepEqual(copied._accountDraft, {...data._accountDraft, synced:false});
  assert.equal(copied._legacySourceKey, legacy());
  assert.equal(copied._legacySourceSnapshot, raw);
  assert.deepEqual(copied._draftMediaPreviousKeys, []);
  assert.ok(copied._draftMediaKey.startsWith(result.key + ':media:'));
  await equalMedia(media, f.records.get(copied._draftMediaKey));
  assert.equal(f.storage.get(legacy()), raw);
  assert.equal(f.records.get(data._draftMediaKey || legacy()), originalMedia);
  assert.equal(f.records.size, 2);
});

test('valid fields-only legacy drafts get explicit empty photo rows', async () => {
  const f = fixture(), data = fields(); delete data.savedMedia;
  const raw = f.seed(data, null), result = await f.api.importLegacy(OWNER, legacy());
  assert.deepEqual(clone(f.records.get(result.data._draftMediaKey)), [{id:UNIT, files:[]}]);
  assert.equal(f.storage.get(legacy()), raw);
});

for (const changed of ['source owner','account owner','guest owner','foreign owner pointer','foreign draft pointer']) test(`rejects ${changed} before any IDB access`, async () => {
  const f = fixture(), data = fields(); let sourceKey = legacy();
  if (changed === 'source owner') sourceKey = legacy(OTHER);
  if (changed === 'account owner') data._accountDraft.ownerId = OTHER;
  if (changed === 'guest owner') data._guestDraft.ownerId = OTHER;
  if (changed === 'foreign owner pointer') data._draftMediaKey = legacy(OTHER) + ':media:one';
  if (changed === 'foreign draft pointer') data._draftMediaKey = legacy(OWNER, 'other') + ':media:one';
  const raw = f.seed(data, photos(), sourceKey);
  await assert.rejects(f.api.importLegacy(OWNER, sourceKey), /account|another draft/);
  assert.equal(f.calls.length, 0); assert.equal(f.storage.get(sourceKey), raw); assert.equal(v2Keys(f).length, 0);
});

test('a legacy source changed during its media read cannot commit v2 metadata or photos', async () => {
  const f = fixture(); f.seed();
  f.state.onGet = key => { if (key === legacy()) { const changed = fields(); changed.shared.address = 'Other tab edit'; f.storage.set(legacy(), JSON.stringify(changed)); } };
  await assert.rejects(f.api.importLegacy(OWNER, legacy()), /older draft changed/);
  assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 1);
  assert.equal(JSON.parse(f.storage.get(legacy())).shared.address, 'Other tab edit');
});

test('a source changed during destination verification removes only the unpublished copy', async () => {
  const f = fixture(), raw = f.seed();
  f.records.set('unrelated:media', photos());
  f.state.onGet = key => { if (key.startsWith('vacancy-listing-draft-v2:')) f.storage.set(legacy(), raw + ' '); };
  await assert.rejects(f.api.importLegacy(OWNER, legacy()), /older draft changed/);
  assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 2);
  assert.ok(f.records.has('unrelated:media')); assert.ok(f.records.has(legacy()));
});

test('metadata quota leaves all v1 records unchanged with no orphan import pointer', async () => {
  const f = fixture(), raw = f.seed(), media = f.records.get(legacy()); f.state.quota = true;
  await assert.rejects(f.api.importLegacy(OWNER, legacy()), /metadata quota/);
  assert.equal(f.storage.get(legacy()), raw); assert.equal(f.records.get(legacy()), media);
  assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 1);
});

test('successful metadata set with uncertain readback retains published pointer and original', async () => {
  const f = fixture(), raw = f.seed();
  const set = f.context.localStorage.setItem;
  f.context.localStorage.setItem = (key, value) => { set(key, value); f.state.uncertain = true; };
  await assert.rejects(f.api.importLegacy(OWNER, legacy()), /readback unavailable/);
  assert.equal(v2Keys(f).length, 1);
  const copied = JSON.parse(f.storage.get(v2Keys(f)[0])); assert.ok(f.records.has(copied._draftMediaKey));
  assert.equal(f.storage.get(legacy()), raw); assert.equal(f.records.size, 2);
});

test('reimporting the same raw source reuses its existing copy without overwriting edits', async () => {
  const f = fixture(), raw = f.seed(), first = await f.api.importLegacy(OWNER, legacy());
  const edited = JSON.parse(f.storage.get(first.key)); edited.shared.address = 'New v2 edit';
  f.storage.set(first.key, JSON.stringify(edited)); const saved = f.storage.get(first.key), calls = f.calls.length;
  const again = await f.api.importLegacy(OWNER, legacy());
  assert.equal(again.key, first.key); assert.equal(again.data.shared.address, 'New v2 edit');
  assert.equal(f.storage.get(first.key), saved); assert.equal(f.calls.length, calls);
  assert.equal(f.storage.get(legacy()), raw); assert.equal(v2Keys(f).length, 1);
});

test('concurrent imports of the same source share one immutable destination', async () => {
  const f = fixture(); f.seed();
  const [a, b] = await Promise.all([f.api.importLegacy(OWNER, legacy()), f.api.importLegacy(OWNER, legacy())]);
  assert.equal(a.key, b.key); assert.equal(v2Keys(f).length, 1);
  assert.equal(f.calls.filter(call => call.mode === 'put').length, 1);
});

test('changed legacy content creates a separate copy without overwriting the older v2 edits', async () => {
  const f = fixture(); f.seed(); const first = await f.api.importLegacy(OWNER, legacy());
  const edited = JSON.parse(f.storage.get(first.key)); edited.shared.address = 'Keep v2 edits';
  f.storage.set(first.key, JSON.stringify(edited)); const saved = f.storage.get(first.key);
  const changed = fields(); changed.shared.address = 'Changed v1'; const raw = f.seed(changed);
  const second = await f.api.importLegacy(OWNER, legacy());
  assert.notEqual(second.key, first.key); assert.equal(second.data.shared.address, 'Changed v1');
  assert.equal(f.storage.get(first.key), saved); assert.equal(f.storage.get(legacy()), raw);
  assert.equal(v2Keys(f).length, 2); assert.equal(f.records.size, 3);
});

for (const stage of ['before read','during source read','during copy write','during copy verification']) test(`owner switch ${stage} blocks import and retains original`, async () => {
  const f = fixture(), raw = f.seed();
  const switchOwner = () => { f.context.currentUser = {id:OTHER}; };
  if (stage === 'before read') switchOwner();
  if (stage === 'during source read') f.state.onGet = key => { if (key === legacy()) switchOwner(); };
  if (stage === 'during copy write') f.state.onPut = switchOwner;
  if (stage === 'during copy verification') f.state.onGet = key => { if (key.startsWith('vacancy-listing-draft-v2:')) switchOwner(); };
  await assert.rejects(f.api.importLegacy(OWNER, legacy()), /signed-in account changed/);
  assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 1); assert.equal(f.storage.get(legacy()), raw);
});

test('helper also works when application auth globals are absent', async () => {
  const f = fixture({runtime:false}); f.seed(); assert.ok((await f.api.importLegacy(OWNER, legacy())).key);
});

for (const change of ['version','scope','edit','unit identity','duplicate units','missing row','extra row','wrong row','too many files','not File','missing saved media']) test(`invalid ${change} fails closed without changing the source`, async () => {
  const f = fixture(), data = fields(); let rows = photos();
  if (change === 'version') data.version = 2;
  if (change === 'scope') data.scope = 'property-not-an-id';
  if (change === 'edit') { data.scope = 'edit-' + EDIT; data.editVacancy = SECOND; }
  if (change === 'unit identity') data.units[0]._requestId = 'not-a-uuid';
  if (change === 'duplicate units') data.units.push({...data.units[0]});
  if (change === 'missing row') rows = [];
  if (change === 'extra row') rows.push({id:SECOND, files:[]});
  if (change === 'wrong row') rows[0].id = SECOND;
  if (change === 'too many files') rows[0].files = Array(9).fill(rows[0].files[0]);
  if (change === 'not File') rows[0].files = [new Blob(['fake'], {type:'image/jpeg'})];
  if (change === 'missing saved media') rows = null;
  const raw = f.seed(data, rows), oldKeys = [...f.records.keys()];
  await assert.rejects(f.api.importLegacy(OWNER, legacy()));
  assert.equal(f.storage.get(legacy()), raw); assert.equal(v2Keys(f).length, 0); assert.deepEqual([...f.records.keys()], oldKeys);
});

test('corrupted destination bytes fail verification and remove only the attempted import', async () => {
  const f = fixture(), raw = f.seed();
  f.state.onGet = key => {
    if (!key.startsWith('vacancy-listing-draft-v2:')) return;
    f.records.set(key, [{id:UNIT, files:[new File([new Uint8Array([0, 1, 254, 42, 128])], 'original résumé.jpg', {type:'image/jpeg', lastModified:1700000000000})]}]);
  };
  await assert.rejects(f.api.importLegacy(OWNER, legacy()), /photo bytes could not be verified/);
  assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 1); assert.equal(f.storage.get(legacy()), raw);
});

const GUEST = '66666666-6666-4666-8666-666666666666';
const claimedKey = legacy(OWNER, 'new-property:guest-' + GUEST);
const bundleKey = 'vacancy-guest-listing-bundle-v1:' + GUEST;
function claim(f) {
  const data = fields(); delete data._guestDraft; delete data._accountDraft; delete data._accountSourceId;
  const bundle = {version:1, id:GUEST, ownerId:OWNER, draftKey:claimedKey, revision:4,
    savedAt:1700000000010, data, media:photos()};
  f.records.set(bundleKey, bundle);
  // These orphaned old destination rows are deliberately different. Recovery
  // must use the retained bundle's atomic fields and Files together.
  f.records.set(claimedKey, [{id:UNIT, files:[new File(['stale media'], 'stale.jpg', {type:'image/jpeg'})]}]);
  return bundle;
}

test('an explicitly requested incomplete guest claim copies the retained atomic fields and Files', async () => {
  const f = fixture(), bundle = claim(f), originalMedia = f.records.get(claimedKey);
  const result = await f.api.importLegacy(OWNER, claimedKey);
  assert.equal(f.storage.has(claimedKey), false);
  assert.equal(f.records.get(bundleKey), bundle); assert.equal(f.records.get(claimedKey), originalMedia);
  for (const name of ['shared','units','journey','savedAt']) assert.deepEqual(clone(result.data[name]), bundle.data[name]);
  assert.deepEqual(clone(result.data._guestDraft), {id:GUEST, revision:4, ownerId:OWNER});
  assert.deepEqual(clone(result.data._accountDraft), {ownerId:OWNER, synced:false});
  assert.equal(result.data._legacySourceKey, claimedKey);
  assert.match(result.data._legacySourceSnapshot, /^retained-guest-bundle-v1:/);
  await equalMedia(bundle.media, f.records.get(result.data._draftMediaKey));
  assert.equal(f.calls.some(call => call.key === claimedKey), false);
  assert.equal(f.calls.some(call => call.mode !== 'get' && call.key === bundleKey), false);
});

test('repeated explicit recovery preserves v2 edits and does not create duplicate copies', async () => {
  const f = fixture(); claim(f); const first = await f.api.importLegacy(OWNER, claimedKey);
  const edited = JSON.parse(f.storage.get(first.key)); edited.shared.address = 'Keep newer imported edits';
  f.storage.set(first.key, JSON.stringify(edited)); const raw = f.storage.get(first.key);
  const second = await f.api.importLegacy(OWNER, claimedKey);
  assert.equal(second.key, first.key); assert.equal(f.storage.get(first.key), raw);
  assert.equal(second.data.shared.address, 'Keep newer imported edits'); assert.equal(v2Keys(f).length, 1);
  assert.equal(f.calls.filter(call => call.mode === 'put').length, 1);
});

test('changed retained Files with the same claim revision create a separate verified copy', async () => {
  const f = fixture(), bundle = claim(f); const first = await f.api.importLegacy(OWNER, claimedKey);
  const firstRaw = f.storage.get(first.key);
  bundle.media[0].files = [new File([new Uint8Array([0, 1, 254, 42, 128])], 'original résumé.jpg', {type:'image/jpeg', lastModified:1700000000000})];
  const second = await f.api.importLegacy(OWNER, claimedKey);
  assert.notEqual(second.key, first.key); assert.equal(f.storage.get(first.key), firstRaw);
  assert.notEqual(first.data._legacySourceSnapshot, second.data._legacySourceSnapshot);
  await equalMedia(bundle.media, f.records.get(second.data._draftMediaKey));
});

for (const raw of ['{broken json', 'null', '{}', '']) test(`existing malformed metadata never uses guest fallback (${JSON.stringify(raw)})`, async () => {
  const f = fixture(); claim(f); f.storage.set(claimedKey, raw);
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey));
  assert.equal(f.calls.length, 0); assert.equal(f.storage.get(claimedKey), raw); assert.equal(v2Keys(f).length, 0);
});

test('existing valid v1 metadata and its newer media always take precedence over the retained bundle', async () => {
  const f = fixture(), bundle = claim(f), newer = fields(); newer.shared.address = 'Newer account edits';
  const rows = [{id:UNIT, files:[new File(['newer bytes'], 'newer.jpg', {type:'image/jpeg', lastModified:1900000000000})]}];
  const raw = f.seed(newer, rows, claimedKey), result = await f.api.importLegacy(OWNER, claimedKey);
  assert.equal(result.data.shared.address, 'Newer account edits'); assert.equal(result.data._legacySourceSnapshot, raw);
  await equalMedia(rows, f.records.get(result.data._draftMediaKey));
  assert.equal(f.calls.some(call => call.key === bundleKey), false); assert.equal(f.records.get(bundleKey), bundle);
});

for (const suffix of ['new-property', 'new-property:guest-invalid', 'edit-' + GUEST, 'new-property:guest-' + GUEST + ':extra']) test(`missing metadata fallback rejects unmatched identity ${suffix} before IDB read`, async () => {
  const f = fixture(); claim(f);
  await assert.rejects(f.api.importLegacy(OWNER, legacy(OWNER, suffix)), /could not be found/);
  assert.equal(f.calls.length, 0); assert.equal(v2Keys(f).length, 0);
});

for (const changed of ['version','id','owner','draftKey','revision','discarded','scope','units','media','guest identity']) test(`invalid retained guest ${changed} cannot be imported`, async () => {
  const f = fixture(), bundle = claim(f);
  if (changed === 'version') bundle.version = 2;
  if (changed === 'id') bundle.id = SECOND;
  if (changed === 'owner') bundle.ownerId = OTHER;
  if (changed === 'draftKey') bundle.draftKey = legacy();
  if (changed === 'revision') bundle.revision = 0;
  if (changed === 'discarded') bundle.discarded = true;
  if (changed === 'scope') bundle.data.scope = 'property-' + EDIT;
  if (changed === 'units') bundle.data.units[0]._requestId = 'invalid';
  if (changed === 'media') bundle.media[0].id = SECOND;
  if (changed === 'guest identity') bundle.data._guestDraft = {ownerId:OWNER, id:SECOND, revision:4};
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey));
  assert.equal(f.storage.has(claimedKey), false); assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 2);
  assert.equal(f.calls.some(call => call.mode !== 'get'), false);
});

for (const stage of ['initial read','before write','after write']) test(`old tab finishing v1 metadata ${stage} blocks atomic-bundle recovery`, async () => {
  const f = fixture(); claim(f); let reads = 0; const raw = JSON.stringify(fields());
  f.state.onGet = key => {
    if (key === bundleKey && ++reads === {'initial read':1, 'before write':2, 'after write':3}[stage]) f.storage.set(claimedKey, raw);
  };
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey), /older draft changed/);
  assert.equal(f.storage.get(claimedKey), raw); assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 2);
});

for (const changed of ['owner','revision','fields','file bytes','file order']) test(`retained bundle ${changed} changed during copying prevents metadata publication`, async () => {
  const f = fixture(), bundle = claim(f); let reads = 0;
  if (changed === 'file order') bundle.media[0].files.push(new File(['other'], 'other.jpg', {type:'image/jpeg', lastModified:1700000000000}));
  f.state.onGet = key => {
    if (key !== bundleKey || ++reads !== 3) return;
    if (changed === 'owner') bundle.ownerId = OTHER;
    if (changed === 'revision') bundle.revision++;
    if (changed === 'fields') bundle.data.shared.address = 'Changed concurrently';
    if (changed === 'file bytes') bundle.media[0].files = [new File([new Uint8Array([0, 1, 254, 42, 128])], 'original résumé.jpg', {type:'image/jpeg', lastModified:1700000000000})];
    if (changed === 'file order') bundle.media[0].files.reverse();
  };
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey), /claim could not be verified|retained guest draft changed/);
  assert.equal(f.storage.has(claimedKey), false); assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 2);
});

test('owner switch during retained bundle verification removes only the new unpublished media', async () => {
  const f = fixture(); claim(f); let reads = 0;
  f.state.onGet = key => { if (key === bundleKey && ++reads === 3) f.context.currentUser = {id:OTHER}; };
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey), /signed-in account changed/);
  assert.equal(f.storage.has(claimedKey), false); assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 2);
});

test('metadata quota after retained bundle copy preserves both original bundle and old media', async () => {
  const f = fixture(), bundle = claim(f), old = f.records.get(claimedKey); f.state.quota = true;
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey), /metadata quota/);
  assert.equal(f.records.get(bundleKey), bundle); assert.equal(f.records.get(claimedKey), old);
  assert.equal(v2Keys(f).length, 0); assert.equal(f.records.size, 2);
});

test('uncertain metadata readback after retained bundle recovery keeps its published Files', async () => {
  const f = fixture(); claim(f); const set = f.context.localStorage.setItem;
  f.context.localStorage.setItem = (key, value) => { set(key, value); f.state.uncertain = true; };
  await assert.rejects(f.api.importLegacy(OWNER, claimedKey), /readback unavailable/);
  const saved = JSON.parse(f.storage.get(v2Keys(f)[0]));
  assert.ok(f.records.has(saved._draftMediaKey)); assert.equal(f.records.size, 3); assert.equal(f.storage.has(claimedKey), false);
});
