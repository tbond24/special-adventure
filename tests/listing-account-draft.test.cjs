const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const {webcrypto} = require('node:crypto');
const {File, Blob} = require('node:buffer');

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const SOURCE = '33333333-3333-4333-8333-333333333333';
const DRAFT = '44444444-4444-4444-8444-444444444444';
const UNIT = '55555555-5555-4555-8555-555555555555';
const UNIT2 = '66666666-6666-4666-8666-666666666666';
const VACANCY = '77777777-7777-4777-8777-777777777777';
const TOKEN = '88888888-8888-4888-8888-888888888888';
const clone = value => JSON.parse(JSON.stringify(value));
const err = (code, message = code, status) => Object.assign(new Error(message),{code,status});
const network = () => Object.assign(new TypeError('Failed to fetch'),{code:'NETWORK_ERROR'});
function fields(two = false) {
  return {version:1,scope:'new-property',editVacancy:null,savedAt:'local-time',savedMedia:true,
    _accountDraft:{ownerId:OWNER},_guestDraft:{id:SOURCE},locationLabel:'Nairobi, Kenya',
    shared:{address:'  Apartment 7 / 2nd floor  ',lat:'-1.2921',lng:'36.8219',propertyNickname:'A & B',unknownField:'keep me'},
    units:[{_requestId:UNIT,roomName:'Studio',rent:'07500.50',_titleMode:'manual',_privateName:'Private name',unitDetails:'{"beds":1}',unknownUnitField:'keep too'},
      ...(two ? [{_requestId:UNIT2,roomName:'Flat',rent:'10000',_privateName:'Back room'}] : [])],
    journey:{location:'pin',answers:[true,null,'résumé']}};
}
function photos(two = false) {
  return [{id:UNIT,files:[new File(['photo-one'],'original résumé.jpg',{type:'image/jpeg',lastModified:1700000000000})]},
    ...(two ? [{id:UNIT2,files:[new File(['photo-two'],'back room.webp',{type:'image/webp',lastModified:1700000000123})]}] : [])];
}
function mock() {
  const state = {head:null,manifests:new Map(),objects:new Map(),requests:[],owner:OWNER,
    before:null,after:null,forbiddenLocalTouches:0};
  const tick = head => { head.revision++; head.updated_at = `2026-10-10T12:00:${String(head.revision).padStart(2,'0')}Z`; };
  function cas(body) { if (state.head.revision !== body.p_expected) throw err('40001','Draft revision conflict'); }
  async function draftRequest(owner,path,options = {}) {
    const request = {owner,path,options,body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body};
    state.requests.push(request);
    if (owner !== state.owner) throw err('ACCOUNT_CHANGED');
    if (state.before) await state.before(request,state);
    if (owner !== state.owner) throw err('ACCOUNT_CHANGED');
    let result;
    const body = request.body, name = path.split('/').pop();
    if (path.startsWith('/rest/v1/rpc/')) {
      if (name === 'begin_listing_draft') {
        if (!state.head) state.head = {id:DRAFT,owner_id:owner,source_draft_id:body.p_source,revision:0,
          state:'editing',current_transfer_id:null,published_units:{},created_units:{},publish_token:null,
          created_at:'2026-10-10T12:00:00Z',updated_at:'2026-10-10T12:00:00Z'};
        if (state.head.source_draft_id !== body.p_source) throw err('SOURCE_COLLISION');
        result = clone(state.head);
      } else if (name === 'stage_listing_draft') {
        const existing = state.manifests.get(body.p_transfer);
        const candidate = {owner_id:owner,draft_id:DRAFT,transfer_id:body.p_transfer,base_revision:body.p_expected,
          payload:body.p_payload,assets:body.p_assets,property_id:body.p_property,edit_vacancy_id:body.p_edit};
        if (existing) {
          for (const key of Object.keys(candidate)) assert.deepEqual(existing[key],candidate[key]);
          result = clone(existing);
        } else {
          cas(body); if (state.head.state !== 'editing') throw err('40001');
          state.manifests.set(body.p_transfer,{...clone(candidate),committed_revision:null,committed_at:null});
          result = clone(state.manifests.get(body.p_transfer));
        }
      } else if (name === 'commit_listing_draft') {
        const m = state.manifests.get(body.p_transfer); assert.ok(m);
        assert.equal(body.p_expected,m.base_revision);
        if (m.committed_revision === null) {
          cas(body); if (state.head.state !== 'editing') throw err('40001');
          for (const asset of m.assets) assert.ok(state.objects.has(asset.path),'Cannot commit missing photo');
          tick(state.head); state.head.current_transfer_id = m.transfer_id;
          m.committed_revision = state.head.revision; m.committed_at = state.head.updated_at;
        }
        result = clone(state.head);
      } else if (name === 'set_listing_draft_state') {
        cas(body); if (!['editing','archived'].includes(body.p_state)) throw err('40001');
        tick(state.head); state.head.state = body.p_state; result = clone(state.head);
      } else if (name === 'begin_listing_draft_publish') {
        if (!(state.head.state === 'publishing' && state.head.publish_token === body.p_token && state.head.revision === body.p_expected + 1)) {
          cas(body); assert.equal(state.head.state,'editing'); tick(state.head);
          state.head.state = 'publishing'; state.head.publish_token = body.p_token;
        }
        result = clone(state.head);
      } else if (name === 'listing_draft_publish_action') {
        const receipt = state.head.last_action;
        if (receipt && receipt.expected_revision === body.p_expected && receipt.publish_token === body.p_token &&
          receipt.request_id === body.p_request && receipt.action === body.p_action &&
          JSON.stringify(receipt.args) === JSON.stringify(body.p_args) && state.head.revision === body.p_expected+1) {
          result = {head:clone(state.head),result:clone(receipt.result)};
        } else {
          cas(body); assert.equal(state.head.state,'publishing'); assert.equal(state.head.publish_token,body.p_token);
          if (['publish_unit','complete_edit'].includes(body.p_action)) state.head.published_units[body.p_request] = body.p_args.p_vacancy_id;
          if (['create_listing','create_room'].includes(body.p_action)) state.head.created_units[body.p_request] = VACANCY;
          tick(state.head); const actionResult = {vacancy_id:VACANCY};
          state.head.last_action = {expected_revision:body.p_expected,publish_token:body.p_token,
            request_id:body.p_request,action:body.p_action,args:clone(body.p_args),result:actionResult,revision:state.head.revision};
          result = {head:clone(state.head),result:clone(actionResult)};
        }
      } else if (name === 'finish_listing_draft_publish') {
        if (!(state.head.finish_token === body.p_token && state.head.finish_transfer_id === body.p_transfer && state.head.revision === body.p_expected+1)) {
          cas(body); assert.equal(state.head.state,'publishing'); assert.equal(state.head.publish_token,body.p_token);
          const old = state.manifests.get(state.head.current_transfer_id), payload = clone(old.payload);
          payload.units = payload.units.filter(unit => !state.head.published_units[unit._requestId]);
          const ids = new Set(payload.units.map(unit => unit._requestId));
          const propertyId=Object.keys(state.head.created_units).length && !old.edit_vacancy_id ? '99999999-9999-4999-8999-999999999999' : old.property_id;
          if (propertyId && payload.scope==='new-property') payload.scope='property-'+propertyId;
          tick(state.head); state.head.state = payload.units.length ? 'editing' : 'published'; state.head.publish_token = null;
          state.head.finish_token = body.p_token; state.head.finish_transfer_id = body.p_transfer;
          state.head.current_transfer_id = body.p_transfer;
          state.manifests.set(body.p_transfer,{...clone(old),payload,property_id:propertyId,assets:old.assets.filter(asset => ids.has(asset.unitRequestId)),
            transfer_id:body.p_transfer,base_revision:body.p_expected,committed_revision:state.head.revision,committed_at:state.head.updated_at});
        }
        result = clone(state.head);
      } else throw new Error(`Unexpected RPC ${name}`);
    } else if (path.startsWith('/rest/v1/listing_drafts?')) {
      result = state.head ? [clone(state.head)].filter(head => !path.includes('state=in.') || ['editing','publishing'].includes(head.state) && head.revision>0) : [];
    } else if (path.startsWith('/rest/v1/listing_draft_manifests?')) {
      const id = new URL('https://mock.invalid'+path).searchParams.get('transfer_id').slice(3);
      result = state.manifests.has(id) ? [clone(state.manifests.get(id))] : [];
    } else if (path.startsWith('/storage/v1/object/listing-draft-media/')) {
      const objectPath = path.slice('/storage/v1/object/listing-draft-media/'.length);
      assert.equal(objectPath.split('/')[0],owner); assert.ok(!path.includes('/public/'));
      if (options.method === 'POST') {
        assert.equal(options.headers['x-upsert'],'false');
        if (state.objects.has(objectPath)) throw err('Duplicate','The resource already exists',409);
        state.objects.set(objectPath,new Blob([await body.arrayBuffer()],{type:body.type})); result = {Key:objectPath};
      } else {
        assert.equal(options.responseType,'blob');
        if (!state.objects.has(objectPath)) throw err('NotFound','Object unavailable',404);
        result = state.objects.get(objectPath);
      }
    } else throw new Error(`Unexpected path ${path}`);
    if (state.after) result = await state.after(request,result,state);
    if (owner !== state.owner) throw err('ACCOUNT_CHANGED');
    return result;
  }
  const deniedLocal = new Proxy({}, {get() { state.forbiddenLocalTouches++; throw new Error('Adapter touched local storage'); }});
  state.newClient = () => {
    const context = vm.createContext({window:{VACANCY_BACKEND:{draftRequest}},crypto:webcrypto,File,Blob,TextEncoder,URL,console,
      localStorage:deniedLocal,indexedDB:deniedLocal});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/src/listing-account-draft.js'),'utf8'),context);
    return context.window.VACANCY_ACCOUNT_DRAFT;
  };
  state.api = state.newClient();
  state.save = (overrides = {}) => state.api.save({ownerId:OWNER,sourceGuestId:SOURCE,expectedRevision:0,data:fields(),media:photos(),...overrides});
  return state;
}
const code = expected => error => error.code === expected;
async function assertFilesEqual(a,b) {
  assert.equal(a.length,b.length);
  for (let row=0;row<a.length;row++) {
    assert.equal(a[row].id,b[row].id); assert.equal(a[row].files.length,b[row].files.length);
    for (let i=0;i<a[row].files.length;i++) {
      const left=a[row].files[i],right=b[row].files[i];
      assert.equal(left.name,right.name); assert.equal(left.type,right.type); assert.equal(left.lastModified,right.lastModified);
      assert.deepEqual(Buffer.from(await left.arrayBuffer()),Buffer.from(await right.arrayBuffer()));
    }
  }
}

test('save preserves complete fields, private Files and IDs; canonical payload strips only local metadata',async () => {
  const s=mock(),data=fields(true),media=photos(true),before=clone(data);
  const result=await s.save({data,media});
  assert.equal(result.revision,1); assert.equal(result.state,'editing'); assert.equal(result.ownerId,OWNER);
  assert.deepEqual(data,before); assert.equal(s.forbiddenLocalTouches,0);
  const stored=s.manifests.get(result.transferId).payload,expected=clone(data);
  for (const key of ['savedAt','savedMedia','_accountDraft','_guestDraft']) delete expected[key];
  assert.deepEqual(stored,expected); await assertFilesEqual(result.media,media);
  const loaded=await s.api.load(OWNER,DRAFT); await assertFilesEqual(loaded.media,media);
  assert.equal(loaded.data.units[0].rent,'07500.50'); assert.equal(loaded.data.shared.unknownField,'keep me');
});

test('metadata-only list is owner scoped and a clean second device can load every private File',async () => {
  const s=mock(); await s.save({data:fields(true),media:photos(true)}); const start=s.requests.length;
  const secondDevice=s.newClient();
  const list=await secondDevice.list(OWNER); assert.equal(list.length,1); assert.equal(list[0].media,undefined);
  assert.ok(s.requests.slice(start).every(r => !r.path.startsWith('/storage/')));
  assert.ok(s.requests.slice(start).every(r => r.path.includes(`owner_id=eq.${OWNER}`)));
  const result=await secondDevice.load(OWNER,DRAFT); await assertFilesEqual(result.media,photos(true));
  assert.equal(s.forbiddenLocalTouches,0);
});

test('same save is idempotent after acknowledgement loss; local timestamps do not change transfer identity',async () => {
  const s=mock(); const first=await s.save(); const data=fields(); data.savedAt='later'; data._accountDraft={other:'local only'};
  const second=await s.save({data}); assert.equal(second.transferId,first.transferId); assert.equal(second.revision,1);
  assert.equal(s.objects.size,1); assert.equal(s.manifests.size,1);
});

for (const lost of ['begin_listing_draft','stage_listing_draft','upload','commit_listing_draft']) test(`lost ${lost} response reconciles only exact immutable acknowledgement`,async () => {
  const s=mock(); let lostOnce=false;
  s.after=async (request,result) => {
    const match=lost==='upload' ? request.path.startsWith('/storage/') && request.options.method==='POST' : request.path.endsWith('/'+lost);
    if (match && !lostOnce) {lostOnce=true;throw network();} return result;
  };
  const result=await s.save(); assert.equal(result.revision,1); assert.equal(s.objects.size,1); assert.equal(s.manifests.size,1);
  assert.equal(s.forbiddenLocalTouches,0);
});

test('partial upload failure leaves old committed head and caller Files unchanged; retry resumes immutable transfer',async () => {
  const s=mock(),data=fields(true),media=photos(true); const old=await s.save({data,media});
  data.shared.address='New address'; media[1].files.push(new File(['third'],'third.png',{type:'image/png',lastModified:42}));
  let fail=true; s.before=async request => {if (fail && request.options.method==='POST' && request.body?.name==='third.png') throw network();};
  await assert.rejects(s.save({draftId:DRAFT,expectedRevision:1,data,media}),code('NETWORK_ERROR'));
  assert.equal(s.head.current_transfer_id,old.transferId); assert.equal(s.head.revision,1); assert.equal(media[1].files.length,2);
  fail=false; const saved=await s.save({draftId:DRAFT,expectedRevision:1,data,media}); assert.equal(saved.revision,2);
  await assertFilesEqual((await s.api.load(OWNER,DRAFT)).media,media); assert.equal(s.forbiddenLocalTouches,0);
});

test('photo readback mismatch cannot commit or claim success',async () => {
  const s=mock(); s.after=async (r,result) => r.options.responseType==='blob' ? new Blob(['bad-bytes'],{type:'image/jpeg'}) : result;
  await assert.rejects(s.save(),code('DRAFT_INTEGRITY')); assert.equal(s.head.revision,0);
  assert.equal(s.requests.some(r => r.path.endsWith('/commit_listing_draft')),false);
});

test('exact field/asset acknowledgement mismatch fails safely before upload',async () => {
  const s=mock(); s.after=async (r,result) => {if(r.path.endsWith('/stage_listing_draft')) result.payload.shared.address='Changed by server';return result;};
  await assert.rejects(s.save(),code('DRAFT_INTEGRITY')); assert.equal(s.objects.size,0); assert.equal(s.head.revision,0);
});

test('stale revision never adopts the newest head even if supplied draft ID is valid',async () => {
  const s=mock(); await s.save(); const data=fields(); data.shared.address='Stale other-device data';
  await assert.rejects(s.save({draftId:DRAFT,expectedRevision:0,data}),code('DRAFT_CONFLICT'));
  await assert.rejects(s.api.save({ownerId:OWNER,draftId:DRAFT,sourceGuestId:SOURCE,data,media:photos()}),code('INVALID_DRAFT'));
  assert.equal(s.head.revision,1); assert.equal(s.manifests.get(s.head.current_transfer_id).payload.shared.address,fields().shared.address);
});

test('another device committing during save acknowledgement is a conflict',async () => {
  const s=mock(); s.after=async (r,result,state) => {
    if(r.path.endsWith('/commit_listing_draft')) {state.head.revision++;state.head.current_transfer_id='99999999-9999-4999-8999-999999999999';} return result;
  };
  await assert.rejects(s.save(),code('DRAFT_CONFLICT'));
});

test('account switch during upload invalidates the response and keeps caller data',async () => {
  const s=mock(),data=fields(),media=photos(); const before=clone(data);
  s.after=async (r,result,state) => {if (r.path.startsWith('/storage/') && r.options.method==='POST') state.owner=OTHER; return result;};
  await assert.rejects(s.save({data,media}),code('ACCOUNT_CHANGED'));
  assert.equal(s.head.revision,0); assert.deepEqual(data,before); await assertFilesEqual(media,photos()); assert.equal(s.forbiddenLocalTouches,0);
});

test('forged owner, malformed head and invalid metadata do not escape validation',async () => {
  for (const mutate of [head=>({...head,owner_id:OTHER}),()=>null,head=>({...head,revision:'1'})]) {
    const s=mock(); s.after=async (r,result) => r.path.endsWith('/begin_listing_draft') ? mutate(result) : result;
    await assert.rejects(s.save(),code('DRAFT_INTEGRITY'));
  }
  const s=mock(),data=fields(); data.units[0]._requestId='not-a-uuid';
  await assert.rejects(s.save({data}),code('INVALID_DRAFT')); assert.equal(s.requests.length,0);
});

for (const [error,expected] of [[err('quota','Storage quota exceeded',507),'QUOTA_EXCEEDED'],[err('denied','denied',403),'AUTH_REQUIRED'],[err('limit','limit',429),'RATE_LIMITED']]) test(`${expected} retains local fields and Files`,async () => {
  const s=mock(),data=fields(),before=clone(data),media=photos();
  s.before=async r => {if(r.path.startsWith('/storage/') && r.options.method==='POST') throw error;};
  await assert.rejects(s.save({data,media}),code(expected)); assert.deepEqual(data,before); assert.equal(media[0].files[0].name,'original résumé.jpg'); assert.equal(s.head.revision,0);
});

test('load catches a lifecycle revision change while restoring private bytes',async () => {
  const s=mock(); await s.save(); let changed=false;
  s.after=async(r,result,state)=>{if(!changed && r.options.responseType==='blob'){changed=true;state.head.revision++;}return result;};
  await assert.rejects(s.api.load(OWNER,DRAFT),code('DRAFT_CONFLICT'));
});

test('archive uses CAS and increments revision, without local or remote deletion',async () => {
  const s=mock(); await s.save(); const archived=await s.api.archive(OWNER,DRAFT,1);
  assert.equal(archived.state,'archived'); assert.equal(archived.revision,2); assert.equal(s.objects.size,1); assert.equal(s.manifests.size,1);
  await assert.rejects(s.api.archive(OWNER,DRAFT,1),code('DRAFT_CONFLICT'));
  assert.ok(!s.requests.some(r => r.options.method==='DELETE')); assert.equal((await s.api.list(OWNER)).length,0);
});

test('publication partial finish restores remaining unit IDs/Files and permits saving edits',async () => {
  const s=mock(); await s.save({data:fields(true),media:photos(true)});
  const begun=await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  assert.equal(begun.revision,2); assert.equal(begun.publishToken,TOKEN);
  const publishing=await s.api.load(OWNER,DRAFT); assert.equal(publishing.revision,2); assert.equal(publishing.state,'publishing');
  const published=await s.api.publishUnit({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,vacancyId:VACANCY});
  assert.equal(published.revision,3);
  const remaining=await s.api.finishPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:3,publishToken:TOKEN});
  assert.equal(remaining.state,'editing'); assert.equal(remaining.revision,4); assert.equal(remaining.publishToken,null);
  assert.deepEqual(clone(remaining.data.units).map(u=>u._requestId),[UNIT2]); await assertFilesEqual(remaining.media,[photos(true)[1]]);
  remaining.data.units[0].roomName='Updated after partial publish';
  const saved=await s.api.save({ownerId:OWNER,draftId:DRAFT,sourceGuestId:SOURCE,expectedRevision:4,data:remaining.data,media:remaining.media});
  assert.equal(saved.revision,5); assert.equal(saved.data.units[0]._requestId,UNIT2); assert.equal(saved.publishedUnits[UNIT],VACANCY);
});

test('explicit recovery with no published units only returns to editing; it never invokes publication',async () => {
  const s=mock(); await s.save(); await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  const restored=await s.api.finishPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN});
  assert.equal(restored.state,'editing'); assert.equal(restored.data.units[0]._requestId,UNIT);
  assert.ok(!s.requests.some(r=>r.path.endsWith('/listing_draft_publish_action')));
});

test('lost action response retries exact durable receipt without repeating the mutation',async () => {
  const s=mock(); await s.save(); await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  let lost=false;s.after=async(r,result)=>{if(!lost&&r.path.endsWith('/listing_draft_publish_action')){lost=true;throw network();}return result;};
  const action=await s.api.publishAction({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,action:'create_listing',args:{p_client_request_id:UNIT}});
  assert.equal(action.head.revision,3); assert.equal(action.head.createdUnits[UNIT],VACANCY); assert.equal(action.result.vacancy_id,VACANCY); assert.equal(s.head.revision,3);
});

test('full publication and edit completion produce final head without re-publication on recovery',async () => {
  for(const edit of [false,true]) {
    const s=mock();const data=fields();if(edit){data.scope='edit-'+VACANCY;data.editVacancy=VACANCY;}
    await s.save({data}); await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
    await s.api.publishUnit({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,vacancyId:VACANCY,edit});
    const done=await s.api.finishPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:3,publishToken:TOKEN});
    assert.equal(done.state,'published');assert.equal(done.revision,4);assert.equal(done.data,undefined);
    assert.equal((await s.api.list(OWNER)).length,0); assert.equal(s.objects.size,1);
  }
});

test('publication creates stable property scope for the remaining units',async () => {
  const s=mock(); await s.save({data:fields(true),media:photos(true)});
  await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  const created=await s.api.publishAction({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,action:'create_listing',args:{p_request_id:UNIT}});
  assert.equal(created.head.createdUnits[UNIT],VACANCY);
  await s.api.publishUnit({ownerId:OWNER,draftId:DRAFT,expectedRevision:3,publishToken:TOKEN,requestId:UNIT,vacancyId:VACANCY});
  const remaining=await s.api.finishPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:4,publishToken:TOKEN});
  assert.equal(remaining.data.scope,'property-99999999-9999-4999-8999-999999999999');
  assert.equal(remaining.data.units[0]._requestId,UNIT2); assert.equal(remaining.data.shared.address,fields().shared.address);
});

for(const full of [false,true]) test(`lost ${full?'complete':'partial'} finish response and identical retry reuse exact committed remaining manifest`,async () => {
  const s=mock();await s.save({data:fields(!full),media:photos(!full)});
  await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  await s.api.publishUnit({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,vacancyId:VACANCY});
  let lost=false;s.after=async(r,result)=>{if(!lost&&r.path.endsWith('/finish_listing_draft_publish')){lost=true;throw network();}return result;};
  const args={ownerId:OWNER,draftId:DRAFT,expectedRevision:3,publishToken:TOKEN};
  const first=await s.api.finishPublish(args),again=await s.api.finishPublish(args);
  assert.equal(first.state,full?'published':'editing');assert.equal(again.transferId,first.transferId);assert.equal(again.revision,4);
  assert.equal(s.manifests.size,2); assert.equal(s.requests.filter(r=>r.path.endsWith('/finish_listing_draft_publish')).length,1);
});

test('finish rejects changed remaining fields even if revision, token and transfer appear correct',async () => {
  const s=mock();await s.save({data:fields(true),media:photos(true)});
  await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  await s.api.publishUnit({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,vacancyId:VACANCY});
  s.after=async(r,result,state)=>{if(r.path.endsWith('/finish_listing_draft_publish')) state.manifests.get(state.head.current_transfer_id).payload.shared.address='Wrong';return result;};
  await assert.rejects(s.api.finishPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:3,publishToken:TOKEN}),code('DRAFT_INTEGRITY'));
});

test('stale publication action cannot adopt concurrent progress or publish after explicit recovery',async () => {
  const s=mock();await s.save();await s.api.beginPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:1,publishToken:TOKEN});
  await s.api.finishPublish({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN});
  await assert.rejects(s.api.publishUnit({ownerId:OWNER,draftId:DRAFT,expectedRevision:2,publishToken:TOKEN,requestId:UNIT,vacancyId:VACANCY}),code('DRAFT_CONFLICT'));
  assert.equal(s.head.state,'editing');assert.deepEqual(s.head.published_units,{});
});

test('account switch during restore rejects even a fully downloaded private response',async () => {
  const s=mock();await s.save();s.after=async(r,result,state)=>{if(r.options.responseType==='blob')state.owner=OTHER;return result;};
  await assert.rejects(s.api.load(OWNER,DRAFT),code('ACCOUNT_CHANGED'));
});

test('new file metadata or unsupported photo type is rejected before network access',async () => {
  const s=mock(),rows=photos();rows[0].files=[new File(['svg'],'vector.svg',{type:'image/svg+xml',lastModified:42})];
  await assert.rejects(s.save({media:rows}),code('INVALID_DRAFT'));assert.equal(s.requests.length,0);
});

test('owner-bound local cache cannot be uploaded to a different account',async () => {
  for(const key of ['_accountDraft','_guestDraft']) {
    const s=mock(),data=fields();data[key]={ownerId:OTHER,id:SOURCE};
    await assert.rejects(s.save({data}),code('ACCOUNT_CHANGED'));assert.equal(s.requests.length,0);
  }
});

test('units with zero photos retain empty media rows without any Storage requests',async () => {
  const s=mock();const saved=await s.save({media:[{id:UNIT,files:[]}]});
  const loaded=await s.newClient().load(OWNER,DRAFT);
  assert.equal(saved.revision,1);assert.equal(loaded.media.length,1);assert.equal(loaded.media[0].id,UNIT);assert.equal(loaded.media[0].files.length,0);
  assert.ok(!s.requests.some(r=>r.path.startsWith('/storage/')));
});

test('acknowledged unchanged save performs no new transfer, upload or photo readback',async()=>{
  const s=mock(),data=fields(),media=photos();await s.save({data,media});const start=s.requests.length;
  const second=await s.save({draftId:DRAFT,expectedRevision:1,data:{...data,savedAt:'new timestamp'},media});
  assert.equal(second.revision,1);assert.equal(s.manifests.size,1);
  assert.ok(s.requests.slice(start).every(r=>!r.path.startsWith('/storage/')&&!r.path.startsWith('/rest/v1/rpc/')));
});

test('text-only edits reuse verified owner-bound bytes without upload or download',async()=>{
  const s=mock(),data=fields(),media=photos();await s.save({data,media});data.shared.address='Edited address';const start=s.requests.length;
  const saved=await s.save({draftId:DRAFT,expectedRevision:1,data,media});assert.equal(saved.revision,2);
  assert.equal(s.requests.slice(start).filter(r=>r.path.startsWith('/storage/')).length,0);
});

test('reordering and removing photos change only the manifest, and same-name changed bytes upload',async()=>{
  const s=mock(),data=fields(),media=photos();media[0].files.push(new File(['different'],'second.jpg',{type:'image/jpeg',lastModified:7}));
  await s.save({data,media});let start=s.requests.length;media[0].files.reverse();
  await s.save({draftId:DRAFT,expectedRevision:1,data,media});assert.equal(s.objects.size,2);assert.equal(s.requests.slice(start).filter(r=>r.path.startsWith('/storage/')).length,0);
  start=s.requests.length;media[0].files.pop();await s.save({draftId:DRAFT,expectedRevision:2,data,media});assert.equal(s.objects.size,2);assert.equal(s.requests.slice(start).filter(r=>r.path.startsWith('/storage/')).length,0);
  const old=media[0].files[0];media[0].files[0]=new File(['replaced bytes'],old.name,{type:old.type,lastModified:old.lastModified});start=s.requests.length;
  await s.save({draftId:DRAFT,expectedRevision:3,data,media});assert.equal(s.objects.size,3);assert.equal(s.requests.slice(start).filter(r=>r.path.startsWith('/storage/')&&r.options.method==='POST').length,1);
});

test('duplicate identical photos receive distinct immutable paths',async()=>{
  const s=mock(),data=fields(),media=photos();media[0].files.push(media[0].files[0]);
  const saved=await s.save({data,media});assert.equal(s.objects.size,2);const manifest=s.manifests.get(saved.transferId);assert.equal(new Set(manifest.assets.map(asset=>asset.path)).size,2);
});

test('fresh client must verify private bytes before no-op acknowledgement and restored Files can be reused',async()=>{
  const s=mock(),data=fields(),media=photos();await s.save({data,media});const fresh=s.newClient();let start=s.requests.length;
  await fresh.save({ownerId:OWNER,draftId:DRAFT,sourceGuestId:SOURCE,expectedRevision:1,data,media});
  assert.equal(s.requests.slice(start).filter(r=>r.options.responseType==='blob').length,1);
  const loaded=await fresh.load(OWNER,DRAFT);loaded.data.shared.address='Restored then edited';start=s.requests.length;
  await fresh.save({ownerId:OWNER,draftId:DRAFT,sourceGuestId:SOURCE,expectedRevision:1,data:loaded.data,media:loaded.media});
  assert.equal(s.requests.slice(start).filter(r=>r.path.startsWith('/storage/')).length,0);
});

test('local media pointer and retained checkpoint identities never reach the account manifest',async()=>{
  const s=mock(),data=fields();data._draftMediaKey='private-local-pointer';data._draftMediaPreviousKeys=['old-local-pointer'];const saved=await s.save({data});
  assert.equal(s.manifests.get(saved.transferId).payload._draftMediaKey,undefined);assert.equal(s.manifests.get(saved.transferId).payload._draftMediaPreviousKeys,undefined);
});

test('lost commit before server acknowledgement stays retryable without claiming revision conflict',async()=>{
  const s=mock();s.before=async request=>{if(request.path.endsWith('/commit_listing_draft'))throw network()};
  await assert.rejects(s.save(),code('NETWORK_ERROR'));assert.equal(s.head.revision,0);s.before=null;
  const saved=await s.save();assert.equal(saved.revision,1);assert.equal(s.manifests.size,1);assert.equal(s.objects.size,1);
});
