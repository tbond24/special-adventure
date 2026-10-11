/* Private account drafts. No local storage mutation or public photo URLs.
 * Only the explicit fenced publication methods may publish listing content.
 * The caller must durably checkpoint its fields + Files before calling save().
 * draftRequest binds every request and response to the verified expected owner.
 */
window.VACANCY_ACCOUNT_DRAFT = (() => {
  const BUCKET = 'listing-draft-media';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const SHA256 = /^[0-9a-f]{64}$/;
  const EXTENSIONS = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const STATES = new Set(['editing','publishing','published','archived','discarded']);
  const verifiedMedia = new Map(), fileHashes = new WeakMap();
  const mediaIdentity = asset => canonical(Object.fromEntries(Object.entries(asset).filter(([key]) => key !== 'order')));
  const verifiedKey = (ownerId, asset) => ownerId + ':' + asset.path;
  function rememberMedia(ownerId, asset) {
    if (verifiedMedia.size >= 1024) verifiedMedia.delete(verifiedMedia.keys().next().value);
    verifiedMedia.set(verifiedKey(ownerId, asset), mediaIdentity(asset));
  }
  async function fileHash(file) {
    if (!fileHashes.has(file)) fileHashes.set(file, hash(await file.arrayBuffer()));
    try { return await fileHashes.get(file); } catch (error) { fileHashes.delete(file); throw error; }
  }
  const LOCAL_KEYS = new Set(['savedAt','savedMedia','_accountDraft','_guestDraft','_accountSourceId','_draftMediaKey','_draftMediaPreviousKeys','_legacySourceKey','_legacySourceSnapshot']);
  function failure(code, message, cause) {
    const error = new Error(message); error.code = code;
    if (cause) { error.cause = cause; if (cause.status) error.status = cause.status; }
    return error;
  }
  const invalid = message => failure('INVALID_DRAFT', message);
  const integrity = message => failure('DRAFT_INTEGRITY', message + ' Your local draft has not been changed.');
  const conflict = () => failure('DRAFT_CONFLICT', 'This draft changed on another device. Your local draft is still available; reload the account version or keep your local copy.');
  const isId = value => typeof value === 'string' && UUID.test(value);
  function requireId(value, label) { if (!isId(value)) throw invalid(`${label} is invalid.`); return value; }
  function revision(value) { if (!Number.isSafeInteger(value) || value < 0) throw invalid('A valid saved draft revision is required.'); return value; }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  function copyPayload(value, allowEmpty = false) {
    let result;
    try { result = JSON.parse(JSON.stringify(value)); } catch { throw invalid('The listing fields could not be copied safely.'); }
    if (!object(result)) throw invalid('Listing fields are required.');
    for (const key of LOCAL_KEYS) delete result[key];
    if (result.version !== 1 || !object(result.shared) || !Array.isArray(result.units) || !allowEmpty && !result.units.length) throw invalid('The listing field snapshot is incomplete.');
    const ids = result.units.map(unit => requireId(unit?._requestId, 'Unit request ID'));
    if (new Set(ids).size !== ids.length) throw invalid('Unit request IDs must be distinct.');
    let propertyId = null, editId = null;
    if (typeof result.scope !== 'string') throw invalid('The listing draft scope is invalid.');
    if (result.scope.startsWith('edit-')) {
      editId = requireId(result.scope.slice(5), 'Edited listing ID');
      if (result.editVacancy !== editId) throw invalid('The edited listing reference changed.');
    } else if (result.scope?.startsWith('property-')) {
      propertyId = requireId(result.scope.slice(9), 'Property ID');
      if (result.editVacancy) throw invalid('The property reference does not match this draft.');
    } else if (result.scope !== 'new-property' || result.editVacancy) throw invalid('The listing draft scope is invalid.');
    if (new TextEncoder().encode(canonical(result)).byteLength > 262144) throw invalid('The listing fields exceed the account draft size limit.');
    return {payload:result, propertyId, editId};
  }
  function copyMedia(rows, payload) {
    if (!Array.isArray(rows) || rows.length !== payload.units.length) throw invalid('Every unit needs its saved photo row, including units with no photos.');
    return rows.map((row, index) => {
      if (row?.id !== payload.units[index]._requestId || !Array.isArray(row.files) || row.files.length > 8) throw invalid('The saved photo rows no longer match the listing units.');
      const files = row.files.slice();
      for (const file of files) {
        if (!file || typeof file.arrayBuffer !== 'function' || typeof file.name !== 'string' || !file.name || file.name.length > 1024 || !EXTENSIONS[file.type] || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 10485760 || !Number.isSafeInteger(file.lastModified) || file.lastModified < 0) {
          throw invalid('Draft photos must be JPEG, PNG or WebP Files, up to 10 MiB each, with their original file details.');
        }
      }
      return {id:row.id, files};
    });
  }
  async function hash(bytes) {
    if (!globalThis.crypto?.subtle?.digest) throw failure('CRYPTO_UNAVAILABLE', 'Photo verification is unavailable in this browser. Your local draft has not been changed.');
    const result = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(result)].map(value => value.toString(16).padStart(2,'0')).join('');
  }
  async function identity(value) {
    const hex = (await hash(new TextEncoder().encode(canonical(value)))).split('');
    // UUIDv8: a deterministic, domain-separated SHA-256 operation identity.
    hex[12] = '8'; hex[16] = ((parseInt(hex[16],16) & 3) | 8).toString(16);
    const id = hex.slice(0,32).join('');
    return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
  }
  function normalize(cause) {
    if (cause?.code?.startsWith?.('DRAFT_') || ['INVALID_DRAFT','CRYPTO_UNAVAILABLE','ACCOUNT_CHANGED','AUTH_REQUIRED','QUOTA_EXCEEDED','RATE_LIMITED','NETWORK_ERROR'].includes(cause?.code)) return cause;
    if (cause?.code === '40001' || /revision conflict|publish.*conflict|lease.*expired/i.test(cause?.message || '')) return conflict();
    if (/account changed|signed.in account changed/i.test(cause?.message || '')) return failure('ACCOUNT_CHANGED', 'The signed-in account changed. Sign in to the intended account to retry; your local draft has not been changed.', cause);
    if (cause?.status === 401 || cause?.status === 403 || cause?.code === '42501') return failure('AUTH_REQUIRED', 'Verify the account that owns this draft before continuing. Your local draft has not been changed.', cause);
    if (cause?.status === 413 || cause?.status === 507 || /quota|storage full|exceeded.*limit/i.test(cause?.message || '')) return failure('QUOTA_EXCEEDED', 'Account photo storage is full or its size limit was reached. Your local draft has not been changed.', cause);
    if (cause?.status === 429) return failure('RATE_LIMITED', 'Draft sync is temporarily rate-limited. Wait and retry; your local draft has not been changed.', cause);
    if (cause?.name === 'TypeError' || cause?.name === 'AbortError' || cause?.name === 'TimeoutError' || /network|failed to fetch|offline|timed? ?out/i.test(cause?.message || '')) return failure('NETWORK_ERROR', 'Account draft sync could not finish. Check your connection and retry; your local draft has not been changed.', cause);
    return failure('DRAFT_UNAVAILABLE', `The account draft could not be verified. Your local draft has not been changed.${cause?.message ? ' ' + cause.message : ''}`, cause);
  }
  async function request(ownerId, path, options = {}) {
    requireId(ownerId, 'Account ID');
    if (typeof window.VACANCY_BACKEND?.draftRequest !== 'function') throw failure('DRAFT_UNAVAILABLE', 'Account drafts are unavailable. Keep the saved draft on this device and retry later.');
    return window.VACANCY_BACKEND.draftRequest(ownerId, path, options);
  }
  const uncertain = cause => normalize(cause).code === 'NETWORK_ERROR';
  async function reconcile(operation, recover) {
    try { return await operation(); } catch (cause) {
      if (!uncertain(cause)) throw cause;
      try { return await recover(); } catch (recoveryError) {
        if (['ACCOUNT_CHANGED','AUTH_REQUIRED','DRAFT_INTEGRITY','DRAFT_CONFLICT'].includes(normalize(recoveryError).code)) throw recoveryError;
        throw cause;
      }
    }
  }
  const rpc = (ownerId, name, body) => request(ownerId, '/rest/v1/rpc/' + name, {method:'POST',body:JSON.stringify(body)});
  function one(value, label) {
    if (Array.isArray(value)) { if (value.length !== 1 || !object(value[0])) throw integrity(`The ${label} response is incomplete.`); return value[0]; }
    if (!object(value)) throw integrity(`The ${label} response is incomplete.`);
    return value;
  }
  function checkHead(value, ownerId, draftId) {
    const head = one(value, 'draft');
    if (head.owner_id !== ownerId || !isId(head.id) || draftId && head.id !== draftId || !isId(head.source_draft_id) || !Number.isSafeInteger(head.revision) || head.revision < 0 || !STATES.has(head.state) || head.revision > 0 && !isId(head.current_transfer_id) || head.revision === 0 && head.current_transfer_id != null) throw integrity('The account draft identity or revision did not match.');
    if (head.publish_token != null && !isId(head.publish_token) || head.state === 'publishing' && !isId(head.publish_token)) throw integrity('The publication identity did not match.');
    for (const key of ['published_units','created_units']) if (head[key] != null && (!object(head[key]) || Object.entries(head[key]).some(([unit,vacancy]) => !isId(unit) || !isId(vacancy)))) throw integrity('The publication acknowledgement is invalid.');
    return head;
  }
  async function readHead(ownerId, draftId) {
    requireId(draftId, 'Draft ID');
    return checkHead(await request(ownerId, `/rest/v1/listing_drafts?select=*&owner_id=eq.${ownerId}&id=eq.${draftId}&limit=1`), ownerId, draftId);
  }
  async function readManifest(ownerId, draftId, transferId) {
    return one(await request(ownerId, `/rest/v1/listing_draft_manifests?select=*&owner_id=eq.${ownerId}&draft_id=eq.${draftId}&transfer_id=eq.${transferId}&limit=1`), 'photo manifest');
  }
  function checkManifest(manifest, ownerId, draftId, transferId, expected, allowEmpty = false) {
    if (manifest.owner_id !== ownerId || manifest.draft_id !== draftId || manifest.transfer_id !== transferId || !Number.isSafeInteger(manifest.base_revision) || manifest.base_revision < 0 || !Array.isArray(manifest.assets)) throw integrity('The saved photo manifest identity did not match.');
    if (expected && (manifest.base_revision !== expected.revision || canonical(manifest.payload) !== canonical(expected.payload) || canonical(manifest.assets) !== canonical(expected.assets) || (manifest.property_id ?? null) !== expected.propertyId || (manifest.edit_vacancy_id ?? null) !== expected.editId)) throw integrity('The server acknowledged different fields or photos.');
    let snapshot;
    try { snapshot = copyPayload(manifest.payload, allowEmpty); } catch { throw integrity('The saved listing snapshot is invalid.'); }
    if (canonical(snapshot.payload) !== canonical(manifest.payload) || (manifest.property_id ?? null) !== snapshot.propertyId || (manifest.edit_vacancy_id ?? null) !== snapshot.editId) throw integrity('The saved listing references are inconsistent.');
    const unitIds = new Set(snapshot.payload.units.map(unit => unit._requestId)), paths = new Set(), ids = new Set(), orders = new Map();
    for (const asset of manifest.assets) {
      const extension = EXTENSIONS[asset?.mime];
      if (!object(asset) || !isId(asset.assetId) || !unitIds.has(asset.unitRequestId) || !extension || !SHA256.test(asset.sha256) || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1 || asset.bytes > 10485760 || !Number.isSafeInteger(asset.order) || asset.order < 0 || asset.order > 7 || typeof asset.fileName !== 'string' || !asset.fileName || asset.fileName.length > 1024 || !Number.isSafeInteger(asset.lastModified) || asset.lastModified < 0 || asset.path !== `${ownerId}/${draftId}/${asset.unitRequestId}/${asset.assetId}.${extension}` || paths.has(asset.path) || ids.has(asset.assetId)) throw integrity('A saved photo has invalid identity, path or file details.');
      paths.add(asset.path); ids.add(asset.assetId);
      const order = orders.get(asset.unitRequestId) || [];
      order.push(asset.order); orders.set(asset.unitRequestId, order);
    }
    for (const order of orders.values()) if (order.sort((a,b) => a-b).some((value,index) => value !== index)) throw integrity('The saved photo order is incomplete.');
    return manifest;
  }
  function checkCommitted(head, manifest) {
    if (head.current_transfer_id !== manifest.transfer_id || manifest.committed_revision !== manifest.base_revision + 1 || head.revision < manifest.committed_revision || !manifest.committed_at) throw conflict();
  }
  const storagePath = asset => `/storage/v1/object/${BUCKET}/${asset.path}`;
  async function download(ownerId, asset) {
    const blob = await request(ownerId, storagePath(asset), {method:'GET',responseType:'blob',cache:'no-store'});
    if (!blob || typeof blob.arrayBuffer !== 'function' || blob.size !== asset.bytes || blob.type !== asset.mime || await hash(await blob.arrayBuffer()) !== asset.sha256) throw integrity('A saved photo did not pass its size, type and SHA-256 check.');
    rememberMedia(ownerId, asset);
    const file = new File([blob], asset.fileName, {type:asset.mime,lastModified:asset.lastModified});
    fileHashes.set(file, Promise.resolve(asset.sha256));
    return file;
  }
  function result(head, manifest, media) {
    return {draftId:head.id,ownerId:head.owner_id,sourceGuestId:head.source_draft_id,revision:head.revision,transferId:head.current_transfer_id,state:head.state,publishedUnits:{...(head.published_units || {})},createdUnits:{...(head.created_units || {})},publishToken:head.publish_token || null,createdAt:head.created_at,updatedAt:head.updated_at,data:{...manifest.payload,savedAt:head.updated_at,savedMedia:true},...(media ? {media} : {})};
  }
  async function save({ownerId,draftId,sourceGuestId,expectedRevision,data,media} = {}) {
    try {
      requireId(ownerId, 'Account ID');
      for (const metadata of [data?._accountDraft,data?._guestDraft]) if (metadata?.ownerId && metadata.ownerId !== ownerId) throw failure('ACCOUNT_CHANGED','This local draft belongs to another account. Sign in to its owner to continue.');
      if (expectedRevision === undefined && !draftId) expectedRevision = 0;
      revision(expectedRevision);
      const snapshot = copyPayload(data), rows = copyMedia(media, snapshot.payload);
      const sourceId = sourceGuestId || data?._guestDraft?.id || data?._accountDraft?.sourceGuestId || data?._accountDraft?.sourceId || snapshot.payload.units[0]._requestId;
      requireId(sourceId, 'Source draft ID');
      // Existing heads do not supply an implicit expectedRevision: a stale client
      // must never silently adopt another device's revision and overwrite it.
      const existingId = draftId;
      const begin = () => rpc(ownerId, 'begin_listing_draft', {p_source:sourceId});
      const head = draftId ? await readHead(ownerId, draftId) : checkHead(await reconcile(begin, begin), ownerId);
      draftId = head.id;
      if ((!existingId || sourceGuestId || data?._accountDraft?.sourceGuestId || data?._accountDraft?.sourceId || data?._guestDraft?.id) && head.source_draft_id !== sourceId) throw integrity('The source draft identity did not match.');
      let currentManifest = null;
      if (head.current_transfer_id) {
        currentManifest = checkManifest(await readManifest(ownerId, draftId, head.current_transfer_id), ownerId, draftId, head.current_transfer_id);
        checkCommitted(head, currentManifest);
      }
      const assets = [], files = [], usedPaths = new Set(), occurrences = new Map();
      for (const row of rows) for (const [order,file] of row.files.entries()) {
        const sha256 = await fileHash(file);
        const content = {unitRequestId:row.id,mime:file.type,bytes:file.size,sha256,fileName:file.name,lastModified:file.lastModified};
        const key = canonical(content), occurrence = occurrences.get(key) || 0;
        occurrences.set(key, occurrence + 1);
        // Order belongs to the manifest, not the immutable photo. Reuse legacy
        // paths too, but never reuse one path twice for duplicate photo entries.
        const reusable = currentManifest?.assets.find(asset => !usedPaths.has(asset.path) && Object.entries(content).every(([key,value]) => asset[key] === value));
        const assetId = reusable?.assetId || await identity({kind:'vacancy-draft-photo-v2',ownerId,draftId,...content,occurrence});
        const asset = {assetId,...content,order,path:`${ownerId}/${draftId}/${row.id}/${assetId}.${EXTENSIONS[file.type]}`};
        usedPaths.add(asset.path); assets.push(asset); files.push(file);
      }
      const expected = {...snapshot,revision:expectedRevision,assets};
      const transferId = await identity({kind:'vacancy-draft-transfer-v1',ownerId,draftId,...expected});
      if (head.revision === expectedRevision && head.state === 'editing' && currentManifest &&
          canonical(currentManifest.payload) === canonical(snapshot.payload) && canonical(currentManifest.assets) === canonical(assets)) {
        for (const asset of assets) if (verifiedMedia.get(verifiedKey(ownerId,asset)) !== mediaIdentity(asset)) await download(ownerId,asset);
        const latest = await readHead(ownerId,draftId);
        checkCommitted(latest,currentManifest);
        if (latest.state !== 'editing' || latest.revision !== expectedRevision) throw conflict();
        return result(latest,currentManifest,rows);
      }
      const staged = one(await reconcile(
        () => rpc(ownerId, 'stage_listing_draft', {p_draft:draftId,p_transfer:transferId,p_expected:expectedRevision,p_payload:snapshot.payload,p_assets:assets,p_property:snapshot.propertyId,p_edit:snapshot.editId}),
        () => readManifest(ownerId,draftId,transferId)
      ), 'staged manifest');
      checkManifest(staged, ownerId, draftId, transferId, expected);
      for (const [index,asset] of assets.entries()) {
        if (verifiedMedia.get(verifiedKey(ownerId,asset)) === mediaIdentity(asset)) continue;
        let uploadFailure;
        if (staged.committed_revision == null) {
          try { await request(ownerId, storagePath(asset), {method:'POST',headers:{'Content-Type':asset.mime,'x-upsert':'false'},body:files[index]}); }
          catch (cause) {
            uploadFailure = cause;
            // A collision is not success until the authenticated readback proves
            // the existing immutable object is exactly this photo.
            if (!(cause?.status === 409 || cause?.status === 400 && /already exists|duplicate/i.test(cause.message || '') || uncertain(cause))) throw cause;
            // A lost upload response may mean the bytes arrived. Readback below
            // is authoritative; never issue an overwrite to guess the outcome.
          }
        }
        try { await download(ownerId, asset); } catch (cause) {
          if (uploadFailure && uncertain(uploadFailure) && !['ACCOUNT_CHANGED','AUTH_REQUIRED','DRAFT_INTEGRITY'].includes(normalize(cause).code)) throw uploadFailure;
          throw cause;
        }
      }
      const committedHead = checkHead(await reconcile(
        () => rpc(ownerId, 'commit_listing_draft', {p_draft:draftId,p_transfer:transferId,p_expected:expectedRevision}),
        async () => {
          const recovered = await readHead(ownerId,draftId);
          if (recovered.current_transfer_id !== transferId) {
            if (recovered.revision !== expectedRevision) throw conflict();
            throw failure('NETWORK_ERROR','The account save is not confirmed yet. Retry with the retained local draft.');
          }
          return recovered;
        }
      ), ownerId, draftId);
      const committed = checkManifest(await readManifest(ownerId, draftId, transferId), ownerId, draftId, transferId, expected);
      checkCommitted(committedHead, committed);
      const latest = await readHead(ownerId, draftId);
      checkCommitted(latest, committed);
      if (latest.state !== 'editing' || latest.revision !== committed.committed_revision) throw conflict();
      return result(latest, committed, rows);
    } catch (cause) { throw normalize(cause); }
  }
  async function load(ownerId, draftId) {
    try {
      const head = await readHead(ownerId, draftId);
      if (!head.current_transfer_id || !['editing','publishing'].includes(head.state)) throw failure('DRAFT_UNAVAILABLE', 'This account draft is empty or no longer open for editing.');
      const manifest = checkManifest(await readManifest(ownerId, draftId, head.current_transfer_id), ownerId, draftId, head.current_transfer_id);
      checkCommitted(head, manifest);
      const media = manifest.payload.units.map(unit => ({id:unit._requestId,files:[]}));
      for (const row of media) for (const asset of manifest.assets.filter(asset => asset.unitRequestId === row.id).sort((a,b) => a.order-b.order)) row.files.push(await download(ownerId, asset));
      const latest = await readHead(ownerId, draftId);
      checkCommitted(latest, manifest);
      if (latest.state !== head.state || latest.revision !== head.revision) throw conflict();
      return result(latest, manifest, media);
    } catch (cause) { throw normalize(cause); }
  }
  async function list(ownerId) {
    try {
      requireId(ownerId, 'Account ID');
      const rows = await request(ownerId, `/rest/v1/listing_drafts?select=*&owner_id=eq.${ownerId}&state=in.(editing,publishing)&revision=gt.0&order=updated_at.desc,id.asc`);
      if (!Array.isArray(rows)) throw integrity('The account draft list is incomplete.');
      const results = [], seen = new Set();
      for (const row of rows) {
        const head = checkHead(row, ownerId);
        if (seen.has(head.id) || !['editing','publishing'].includes(head.state)) throw integrity('The account draft list contains an unexpected draft.');
        seen.add(head.id);
        const manifest = checkManifest(await readManifest(ownerId, head.id, head.current_transfer_id), ownerId, head.id, head.current_transfer_id);
        checkCommitted(head, manifest); results.push(result(head, manifest));
      }
      return results;
    } catch (cause) { throw normalize(cause); }
  }
  function headResult(head) {
    return {draftId:head.id,ownerId:head.owner_id,sourceGuestId:head.source_draft_id,
      revision:head.revision,transferId:head.current_transfer_id,state:head.state,
      publishToken:head.publish_token || null,publishedUnits:{...(head.published_units || {})},createdUnits:{...(head.created_units || {})},
      createdAt:head.created_at,updatedAt:head.updated_at};
  }
  function publicationArgs(args = {}) {
    requireId(args.ownerId, 'Account ID'); requireId(args.draftId, 'Draft ID');
    revision(args.expectedRevision); requireId(args.publishToken, 'Publication token');
    return {p_draft:args.draftId,p_expected:args.expectedRevision,p_token:args.publishToken};
  }
  async function setState(ownerId, draftId, expectedRevision, state) {
    try {
      requireId(draftId, 'Draft ID'); revision(expectedRevision);
      if (!['editing','archived'].includes(state)) throw invalid('The requested draft state is invalid.');
      const head = checkHead(await reconcile(
        () => rpc(ownerId, 'set_listing_draft_state', {p_draft:draftId,p_expected:expectedRevision,p_state:state}),
        () => readHead(ownerId,draftId)
      ), ownerId, draftId);
      if (head.revision !== expectedRevision + 1 || head.state !== state) throw conflict();
      return headResult(head);
    } catch (cause) { throw normalize(cause); }
  }
  async function beginPublish(args = {}) {
    try {
      const publishToken = args.publishToken || globalThis.crypto?.randomUUID?.();
      const body = publicationArgs({...args,publishToken});
      const head = checkHead(await reconcile(
        () => rpc(args.ownerId, 'begin_listing_draft_publish', body),
        () => readHead(args.ownerId,args.draftId)
      ), args.ownerId,args.draftId);
      if (head.revision !== args.expectedRevision + 1 || head.state !== 'publishing' || head.publish_token !== publishToken) throw conflict();
      return headResult(head);
    } catch (cause) { throw normalize(cause); }
  }
  async function publishAction(args = {}) {
    try {
      const body = publicationArgs(args);
      requireId(args.requestId, 'Unit request ID');
      if (!['create_listing','create_room','unit_details','property_nickname','property_features','link_media','edit_listing','publish_unit','complete_edit'].includes(args.action) || !object(args.args)) throw invalid('The publication action is invalid.');
      Object.assign(body,{p_request:args.requestId,p_action:args.action,p_args:JSON.parse(JSON.stringify(args.args))});
      // The server stores an exact last-action receipt. An identical retry can
      // read that receipt, but cannot mutate again or adopt a newer revision.
      const action = () => rpc(args.ownerId,'listing_draft_publish_action',body);
      const value = one(await reconcile(action, action), 'publication action');
      const head = checkHead(value.head,args.ownerId,args.draftId);
      if (head.revision !== args.expectedRevision + 1 || head.state !== 'publishing' || head.publish_token !== args.publishToken || !Object.hasOwn(value,'result')) throw conflict();
      if (['publish_unit','complete_edit'].includes(args.action) && head.published_units?.[args.requestId] !== args.args.p_vacancy_id) throw integrity('The published unit acknowledgement did not match.');
      return {head:headResult(head),result:value.result};
    } catch (cause) { throw normalize(cause); }
  }
  async function publishUnit(args = {}) {
    requireId(args.vacancyId, 'Listing ID');
    return (await publishAction({...args,action:args.edit ? 'complete_edit' : 'publish_unit',args:{p_vacancy_id:args.vacancyId}})).head;
  }
  async function finishPublish(args = {}) {
    try {
      const body = publicationArgs(args);
      body.p_transfer = await identity({kind:'vacancy-draft-finish-v2',ownerId:args.ownerId,...body});
      const before = await readHead(args.ownerId,args.draftId);
      const alreadyFinished = before.revision === args.expectedRevision + 1 && before.finish_token === args.publishToken && before.finish_transfer_id === body.p_transfer;
      let previous;
      if (!alreadyFinished) {
        if (before.revision !== args.expectedRevision || before.state !== 'publishing' || before.publish_token !== args.publishToken) throw conflict();
        previous = checkManifest(await readManifest(args.ownerId,args.draftId,before.current_transfer_id),args.ownerId,args.draftId,before.current_transfer_id);
        checkCommitted(before,previous);
      }
      const head = alreadyFinished ? before : checkHead(await reconcile(
        () => rpc(args.ownerId, 'finish_listing_draft_publish', body),
        () => readHead(args.ownerId,args.draftId)
      ), args.ownerId,args.draftId);
      if (head.revision !== args.expectedRevision + 1 || !['editing','published'].includes(head.state) || head.publish_token != null) throw conflict();
      if (head.current_transfer_id !== body.p_transfer || head.finish_token !== args.publishToken || head.finish_transfer_id !== body.p_transfer) throw conflict();
      const manifest = checkManifest(await readManifest(args.ownerId,args.draftId,body.p_transfer),args.ownerId,args.draftId,body.p_transfer,undefined,head.state === 'published');
      checkCommitted(head,manifest);
      if (manifest.base_revision !== args.expectedRevision || manifest.committed_revision !== head.revision ||
        (head.state === 'published') !== (manifest.payload.units.length === 0) || manifest.payload.units.some(unit => head.published_units?.[unit._requestId])) throw integrity('The remaining draft acknowledgement did not match.');
      if (previous) {
        const expectedPayload = {...previous.payload,units:previous.payload.units.filter(unit => !before.published_units?.[unit._requestId])};
        const expectedAssets = previous.assets.filter(asset => !before.published_units?.[asset.unitRequestId]);
        let expectedProperty = previous.property_id ?? null;
        // A newly created property becomes the stable destination for remaining
        // units. The server validates its ownership and created-unit mapping.
        if (previous.payload.scope === 'new-property' && Object.keys(before.created_units || {}).length && isId(manifest.property_id)) {
          expectedProperty = manifest.property_id;
          expectedPayload.scope = 'property-' + expectedProperty;
        }
        if (canonical(manifest.payload) !== canonical(expectedPayload) || canonical(manifest.assets) !== canonical(expectedAssets) ||
          (manifest.property_id ?? null) !== expectedProperty || (manifest.edit_vacancy_id ?? null) !== (previous.edit_vacancy_id ?? null)) throw integrity('The remaining draft fields or photos changed unexpectedly.');
      }
      if (head.state === 'published') {
        const latest = await readHead(args.ownerId,args.draftId);
        if (latest.revision !== head.revision || latest.state !== head.state || latest.current_transfer_id !== body.p_transfer) throw conflict();
        return headResult(latest);
      }
      const remaining = await load(args.ownerId,args.draftId);
      if (remaining.revision !== head.revision || remaining.transferId !== body.p_transfer) throw conflict();
      return remaining;
    } catch (cause) { throw normalize(cause); }
  }
  return Object.freeze({save,load,list,setState,beginPublish,publishAction,publishUnit,finishPublish,
    archive:(ownerId,draftId,expectedRevision) => setState(ownerId,draftId,expectedRevision,'archived')});
})();
