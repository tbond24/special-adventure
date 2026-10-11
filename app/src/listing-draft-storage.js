/* Signed-in device storage has its own version boundary. The account payload
 * and guest handoff formats deliberately remain version 1. Legacy import is
 * explicit, copy-only, and never synchronizes or removes the source draft. */
window.VACANCY_LISTING_STORAGE = (() => {
  const CURRENT = 'vacancy-listing-draft-v2:', LEGACY = 'vacancy-listing-draft-v1:';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const imports = new Map();
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function invalid(message) { return new Error(message + ' The original saved draft has not been changed.'); }
  function validOwner(owner) { return typeof owner === 'string' && !!owner && !/[:\s]/.test(owner) && !['guest','anonymous'].includes(owner); }
  function prefix(owner) {
    if (!validOwner(owner)) throw invalid('A signed-in draft owner is required.');
    return CURRENT + owner + ':';
  }
  function key(owner, suffix) {
    if (typeof suffix !== 'string' || !suffix) throw invalid('A draft storage identity is required.');
    return prefix(owner) + suffix;
  }
  function scoped(value, owner, namespace) {
    if (!validOwner(owner) || typeof value !== 'string') return false;
    const start = namespace + owner + ':';
    return value.startsWith(start) && value.length > start.length;
  }
  const isCurrent = (value, owner) => scoped(value, owner, CURRENT);
  const isLegacy = (value, owner) => scoped(value, owner, LEGACY);
  function assertCurrent(value, owner) {
    if (!isCurrent(value, owner)) throw invalid('This saved draft does not belong to the current account storage.');
    return value;
  }
  function assertOwner(owner) {
    // Standalone callers can use the helper without an application auth global.
    // When that global exists, signed-out/anonymous users must also be rejected.
    if (typeof currentUser !== 'undefined') {
      if (!currentUser || currentUser.is_anonymous || currentUser.id !== owner) throw invalid('The signed-in account changed.');
    } else if (Object.prototype.hasOwnProperty.call(globalThis, 'currentUser')) {
      throw invalid('The signed-in account changed.');
    }
  }
  function validate(data, owner) {
    if (!object(data) || data.version !== 1 || !object(data.shared) || !Array.isArray(data.units) || !data.units.length) throw invalid('The saved listing fields are incomplete.');
    for (const name of ['_accountDraft','_guestDraft']) {
      const meta = data[name];
      if (meta != null && !object(meta) || meta && Object.prototype.hasOwnProperty.call(meta, 'ownerId') && meta.ownerId !== owner) throw invalid('The saved draft belongs to another account.');
    }
    const ids = data.units.map(unit => unit?._requestId);
    if (data.units.some(unit => !object(unit)) || ids.some(id => typeof id !== 'string' || !UUID.test(id)) || new Set(ids).size !== ids.length) throw invalid('The saved unit identities are invalid.');
    const scope = data.scope;
    if (typeof scope !== 'string') throw invalid('The saved listing scope is invalid.');
    if (scope.startsWith('edit-')) {
      if (!UUID.test(scope.slice(5)) || data.editVacancy !== scope.slice(5)) throw invalid('The saved edit identity is invalid.');
    } else if (scope.startsWith('property-')) {
      if (!UUID.test(scope.slice(9)) || data.editVacancy) throw invalid('The saved property identity is invalid.');
    } else if (scope !== 'new-property' || data.editVacancy) throw invalid('The saved listing scope is invalid.');
    return data;
  }
  function mediaPointer(storageKey, data) {
    const pointer = data._draftMediaKey || storageKey;
    if (typeof pointer !== 'string' || pointer !== storageKey && !pointer.startsWith(storageKey + ':media:')) throw invalid('The saved photo pointer belongs to another draft.');
    return pointer;
  }
  function mediaRows(rows, data) {
    if (!Array.isArray(rows) || rows.length !== data.units.length || rows.some((row, index) => !object(row) || row.id !== data.units[index]._requestId || !Array.isArray(row.files) || row.files.length > 8 || row.files.some(file => typeof File !== 'function' || !(file instanceof File)))) throw invalid('The saved photos do not match every listing unit.');
    return rows.map(row => ({...row, files:row.files.slice()}));
  }
  function unchanged(sourceKey, raw, owner) {
    assertOwner(owner);
    if (localStorage.getItem(sourceKey) !== raw) throw invalid('The older draft changed while it was being copied. Retry the import.');
  }
  function existing(owner, sourceKey, snapshot, raw = snapshot) {
    // Do not replace an imported copy, including one edited since its import.
    for (let i = 0; i < localStorage.length; i++) {
      const savedKey = localStorage.key(i);
      if (!isCurrent(savedKey, owner)) continue;
      let data;
      try { data = JSON.parse(localStorage.getItem(savedKey)); } catch { continue; }
      if (data?._legacySourceKey !== sourceKey || data?._legacySourceSnapshot !== snapshot) continue;
      validate(data, owner);
      mediaPointer(savedKey, data);
      unchanged(sourceKey, raw, owner);
      return {key:savedKey, data};
    }
    return null;
  }
  async function verifyMedia(expected, actual, data) {
    const rows = mediaRows(actual, data);
    for (let i = 0; i < expected.length; i++) {
      if (expected[i].files.length !== rows[i].files.length) throw invalid('The copied photo count could not be verified.');
      for (let j = 0; j < expected[i].files.length; j++) {
        const original = expected[i].files[j], copy = rows[i].files[j];
        if (original.name !== copy.name || original.type !== copy.type || original.size !== copy.size || original.lastModified !== copy.lastModified || (original.webkitRelativePath || '') !== (copy.webkitRelativePath || '')) throw invalid('The copied photo details could not be verified.');
        const a = new Uint8Array(await original.arrayBuffer()), b = new Uint8Array(await copy.arrayBuffer());
        if (a.length !== b.length || a.some((byte, index) => byte !== b[index])) throw invalid('The copied photo bytes could not be verified.');
      }
    }
  }
  function guestBundle(bundle, id, owner, sourceKey) {
    if (!object(bundle) || bundle.version !== 1 || bundle.id !== id || bundle.ownerId !== owner || bundle.draftKey !== sourceKey || bundle.discarded || !Number.isSafeInteger(bundle.revision) || bundle.revision < 1) throw invalid('The retained guest draft claim could not be verified.');
    validate(bundle.data, owner);
    if (bundle.data.scope !== 'new-property' || bundle.data.editVacancy || bundle.data._guestDraft && (bundle.data._guestDraft.id !== id || bundle.data._guestDraft.revision !== bundle.revision)) throw invalid('The retained guest draft identity is invalid.');
    mediaRows(bundle.media, bundle.data);
    return bundle;
  }
  async function bundleSnapshot(bundle) {
    if (!crypto.subtle?.digest) throw invalid('Saved photo verification is unavailable in this browser.');
    const media = [];
    for (const row of bundle.media) {
      const files = [];
      for (const file of row.files) {
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
        files.push({name:file.name, type:file.type, size:file.size, lastModified:file.lastModified,
          relativePath:file.webkitRelativePath || '', sha256:Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')});
      }
      media.push({...row, files});
    }
    // Includes the atomic claim, revision, all fields, file details and bytes.
    // The prefix separates this identity from any raw localStorage JSON source.
    return 'retained-guest-bundle-v1:' + JSON.stringify({...bundle, media});
  }
  async function recoverGuestClaim(owner, sourceKey) {
    const start = LEGACY + owner + ':new-property:guest-', id = sourceKey.slice(start.length);
    if (!sourceKey.startsWith(start) || !UUID.test(id)) throw invalid('The older saved draft could not be found.');
    const bundleKey = 'vacancy-guest-listing-bundle-v1:' + id;
    unchanged(sourceKey, null, owner);
    const bundle = guestBundle(await draftMediaStore('get', bundleKey), id, owner, sourceKey);
    unchanged(sourceKey, null, owner);
    const snapshot = await bundleSnapshot(bundle);
    unchanged(sourceKey, null, owner);
    const verify = async () => {
      unchanged(sourceKey, null, owner);
      const latest = guestBundle(await draftMediaStore('get', bundleKey), id, owner, sourceKey);
      unchanged(sourceKey, null, owner);
      if (await bundleSnapshot(latest) !== snapshot) throw invalid('The retained guest draft changed while it was being copied. Retry the import.');
      unchanged(sourceKey, null, owner);
    };
    const data = {...bundle.data, savedMedia:true,
      _guestDraft:{...(bundle.data._guestDraft || {}), id, revision:bundle.revision, ownerId:owner}};
    return copyLegacy(owner, sourceKey, null, data, {snapshot, rows:bundle.media, verify});
  }
  async function copyLegacy(owner, sourceKey, raw, data, recovery) {
    const snapshot = recovery?.snapshot ?? raw;
    const sourceMediaKey = mediaPointer(sourceKey, data);
    const prior = existing(owner, sourceKey, snapshot, raw);
    if (prior) { if (recovery) await recovery.verify(); unchanged(sourceKey, raw, owner); return prior; }
    unchanged(sourceKey, raw, owner);
    let sourceRows = recovery ? recovery.rows : await draftMediaStore('get', sourceMediaKey);
    unchanged(sourceKey, raw, owner);
    // Fields-only legacy drafts can have no IDB record. A draft claiming saved
    // photos must never silently become an empty-photo draft.
    if (sourceRows == null && !data.savedMedia && !data._draftMediaKey) sourceRows = data.units.map(unit => ({id:unit._requestId, files:[]}));
    const rows = mediaRows(sourceRows, data);
    let destination;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = key(owner, 'imported-' + crypto.randomUUID());
      if (localStorage.getItem(candidate) === null) { destination = candidate; break; }
    }
    if (!destination) throw invalid('A new draft storage identity could not be reserved.');
    const pointer = destination + ':media:' + crypto.randomUUID();
    let mediaAttempted = false, metadataWritten = false;
    try {
      if (recovery) await recovery.verify();
      unchanged(sourceKey, raw, owner);
      mediaAttempted = true;
      await draftMediaStore('put', pointer, rows);
      unchanged(sourceKey, raw, owner);
      await verifyMedia(rows, await draftMediaStore('get', pointer), data);
      if (recovery) await recovery.verify();
      unchanged(sourceKey, raw, owner);
      const concurrent = existing(owner, sourceKey, snapshot, raw);
      if (concurrent) {
        await draftMediaStore('delete', pointer);
        mediaAttempted = false;
        unchanged(sourceKey, raw, owner);
        return concurrent;
      }
      if (localStorage.getItem(destination) !== null) throw invalid('The new draft identity was already used. Retry the import.');
      const copied = {...data, savedMedia:true, _draftMediaKey:pointer, _draftMediaPreviousKeys:[],
        _accountDraft:{...(data._accountDraft || {}), ownerId:owner, synced:false},
        _legacySourceKey:sourceKey, _legacySourceSnapshot:snapshot};
      const encoded = JSON.stringify(copied);
      unchanged(sourceKey, raw, owner);
      localStorage.setItem(destination, encoded);
      metadataWritten = true;
      if (localStorage.getItem(destination) !== encoded) throw invalid('The imported draft could not be verified. Its copied photos have been retained.');
      assertOwner(owner);
      return {key:destination, data:copied};
    } catch (error) {
      // setItem is atomic when it throws. Once it succeeds, an uncertain readback
      // must never delete media that a published snapshot might reference.
      if (mediaAttempted && !metadataWritten) {
        try { await draftMediaStore('delete', pointer); } catch {}
      }
      throw error;
    }
  }
  async function importLegacy(owner, sourceKey) {
    if (!isLegacy(sourceKey, owner)) throw invalid('Choose an older draft belonging to this signed-in account.');
    assertOwner(owner);
    const raw = localStorage.getItem(sourceKey);
    const pending = imports.get(sourceKey);
    if (pending?.raw === raw) return pending.promise;
    let data;
    if (raw !== null) {
      try { data = JSON.parse(raw); } catch { throw invalid('The older saved draft could not be read.'); }
      validate(data, owner);
      // Existing metadata, even malformed, never falls back to an older bundle.
      mediaPointer(sourceKey, data);
    }
    const promise = raw === null ? recoverGuestClaim(owner, sourceKey) : copyLegacy(owner, sourceKey, raw, data);
    imports.set(sourceKey, {raw, promise});
    try { return await promise; } finally { if (imports.get(sourceKey)?.promise === promise) imports.delete(sourceKey); }
  }
  return Object.freeze({prefix, key, isCurrent, isLegacy, assertCurrent, importLegacy});
})();
