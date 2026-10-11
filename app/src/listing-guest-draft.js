/* Device-local listing handoff. This module never creates an account or uploads. */
window.VACANCY_GUEST_DRAFT = (() => {
  const ACTIVE = 'vacancy-guest-listing-active-v1';
  const PENDING = 'vacancy-guest-listing-auth-v1';
  const PREFIX = 'vacancy-guest-listing-bundle-v1:';
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const saving = new WeakMap(), checkpointVersions = new WeakMap(), lastSnapshots = new WeakMap();
  let cancellationGeneration = 0;
  const validId = id => typeof id === 'string' && UUID.test(id);
  const sourceKey = id => PREFIX + id;
  const error = message => new Error(message);
  function readSession(key) {
    try { return sessionStorage.getItem(key); }
    catch { throw error('Device storage is unavailable. Keep this page open and try again.'); }
  }
  function writeSession(key, value) {
    try {
      sessionStorage.setItem(key, value);
      if (sessionStorage.getItem(key) !== value) throw error('Storage verification failed');
    } catch { throw error('The draft could not be saved in this tab. Keep this page open and try again.'); }
  }
  function removeSession(key, matches) {
    try { if (!matches || matches(sessionStorage.getItem(key))) sessionStorage.removeItem(key); }
    catch { /* A stale pointer is harmless: the authoritative bundle is checked. */ }
  }
  function ensureId(form) {
    if (!form?.dataset) throw error('The listing editor is unavailable.');
    let id = form.dataset.guestDraftId;
    if (!validId(id)) {
      let active;
      try { active = readSession(ACTIVE); } catch { /* Editing can continue in memory. */ }
      id = validId(active) ? active : crypto.randomUUID();
    }
    try { writeSession(ACTIVE, id); } catch { /* A checkpoint must verify this before leaving. */ }
    form.dataset.guestDraftId = id;
    form.dataset.draftStorageKey = `vacancy-listing-draft-v1:guest:${id}`;
    return id;
  }
  // All decisions and writes inside a callback share one native IDB transaction.
  // The existing store is reused; helper-only bundle keys never contain media arrays.
  function transaction(mode, action) {
    return new Promise((resolve, reject) => {
      let open, db, tx, result, settled = false;
      const close = () => { try { db?.close(); } catch {} };
      const abort = () => { try { tx?.abort(); } catch {} try { open?.transaction?.abort(); } catch {} };
      const finish = cause => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (cause) abort();
        close(); cause ? reject(cause) : resolve(result);
      };
      const timer = setTimeout(() => finish(error('Draft photo storage timed out. Keep this page open, close other listing tabs and retry.')), 10000);
      try { open = indexedDB.open('vacancy-listing-drafts', 1); }
      catch { finish(error('Draft photo storage is unavailable. Keep this page open.')); return; }
      open.onupgradeneeded = () => {
        try {
          db = open.result;
          if (settled) { abort(); close(); return; }
          if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
        } catch (cause) { finish(cause); }
      };
      open.onerror = () => finish(error('Draft photo storage could not open. Keep this page open and retry.'));
      open.onblocked = () => finish(error('Another tab is blocking draft storage. Close that tab and retry.'));
      open.onsuccess = () => {
        db = open.result;
        if (settled) { close(); return; }
        try {
          tx = db.transaction('media', mode);
          tx.oncomplete = () => finish();
          tx.onerror = tx.onabort = () => finish(error('Draft storage failed. Your listing has not been submitted.'));
          action(tx.objectStore('media'), value => { if (!settled) result = value; }, finish);
        } catch (cause) { finish(cause); }
      };
    });
  }
  function getBundle(id) {
    return transaction('readonly', (store, done) => {
      const request = store.get(sourceKey(id));
      request.onsuccess = () => done(request.result || null);
    });
  }
  function usable(bundle, id) {
    if (!bundle || bundle.version !== 1 || bundle.id !== id || bundle.discarded || !Array.isArray(bundle.media) || !bundle.data) {
      throw error('This saved draft is unavailable. Return to the listing editor.');
    }
  }
  async function load(form) {
    const id = ensureId(form), bundle = await getBundle(id);
    if (!bundle) return null;
    usable(bundle, id);
    if (bundle.ownerId) throw error('This draft is linked to a signed-in account. Sign in to that account to continue.');
    if (!form.isConnected || form.dataset.guestDraftId !== id) throw error('The listing editor changed while restoring the draft.');
    form.dataset.guestDraftRevision = String(bundle.revision);
    return {data:bundle.data, media:bundle.media, draftId:id, revision:bundle.revision};
  }
  async function dashboardDraft() {
    if (currentUser && !currentUser.is_anonymous) return null;
    const id = readSession(ACTIVE), ownerAtStart = currentUser?.id || null;
    if (!validId(id)) return null;
    const bundle = await getBundle(id);
    if (readSession(ACTIVE) !== id || (currentUser?.id || null) !== ownerAtStart || currentUser && !currentUser.is_anonymous) return null;
    // Never enumerate local account keys or expose a draft claimed by an account.
    if (!bundle || bundle.discarded || bundle.ownerId) return null;
    usable(bundle, id);
    return {id, title:bundle.data.shared?.propertyTitle?.trim() || bundle.data.shared?.address?.trim() || bundle.data.units?.[0]?.roomName?.trim() || 'Unfinished listing'};
  }
  function capture(form) {
    const data = JSON.parse(JSON.stringify(listingDraftData(form)));
    if (data.editVacancy || data.scope !== 'new-property') throw error('Sign in before editing or adding to an existing property.');
    const media = [...form.querySelectorAll('.unit-editor')].map(unit => {
      const input = unit.querySelector('input[type=file]');
      if (!unit.dataset.requestId || !input) throw error('A unit is still loading. Please retry saving.');
      return {id:unit.dataset.requestId, files:[...selectedPhotoFiles(input)]};
    });
    if (!media.length || media.length !== data.units?.length || new Set(media.map(row => row.id)).size !== media.length) throw error('The listing units could not be saved safely.');
    if (media.some((row, index) => row.id !== data.units[index]._requestId)) throw error('The listing units changed while saving.');
    data.savedMedia = true;
    data.locationLabel = form.dataset.locationLabel || '';
    return {data, media};
  }
  function unchanged(a, b) {
    const canonical = value => { const copy = {...value}; delete copy.savedAt; return JSON.stringify(copy); };
    return canonical(a.data) === canonical(b.data) && a.media.length === b.media.length && a.media.every((row, i) => row.id === b.media[i].id && row.files.length === b.media[i].files.length && row.files.every((file, j) => file === b.media[i].files[j]));
  }
  async function saveSnapshot(form, {forAuth = true, skipLocationWait = false} = {}) {
    if (!form?.isConnected || form.dataset.draftNavigationLeft) throw error('The listing editor changed while saving.');
    const id = ensureId(form);
    await form._draftMediaRestore;
    const map = form.querySelector('#newPropertyMap');
    if (forAuth && !skipLocationWait) { await map?._vacancyAddressLookup; await map?._vacancyForwardLookup; }
    if (!form.isConnected || form.dataset.guestDraftId !== id || form.dataset.draftNavigationLeft) throw error('The listing editor changed while saving.');
    const snapshot = capture(form), expected = Number(form.dataset.guestDraftRevision || 0), now = Date.now();
    const bundle = await transaction('readwrite', (store, done, fail) => {
      const request = store.get(sourceKey(id));
      request.onsuccess = () => {
        try {
          if (form.dataset.draftNavigationLeft) throw error('Leaving cancelled this queued draft save. The previous saved draft is retained.');
          const old = request.result;
          if (old?.discarded || old?.ownerId) throw error('This draft was discarded or linked to an account. Reopen it before continuing.');
          if ((old?.revision || 0) !== expected) throw error('This draft changed in another tab. Reload it before saving again.');
          const value = {version:1,id,revision:expected + 1,savedAt:now,...snapshot};
          store.put(value, sourceKey(id));
          done(value);
        } catch (cause) { fail(cause); }
      };
    });
    form.dataset.guestDraftRevision = String(bundle.revision);
    if (!form.isConnected || form.dataset.guestDraftId !== id || !unchanged(snapshot, capture(form))) throw error('The listing changed while saving. Please save again before continuing.');
    writeSession(ACTIVE, id);
    const ticket = {version:1,draftId:id,revision:bundle.revision,createdAt:now,expiresAt:now + MAX_AGE};
    if (forAuth) writeSession(PENDING, JSON.stringify(ticket));
    else removeSession(PENDING, value => { try { return JSON.parse(value)?.draftId === id; } catch { return false; } });
    lastSnapshots.set(form,snapshot);
    window.VACANCY_CREATE_NAVIGATION?.saved(form,snapshot.data,snapshot.media);
    return ticket;
  }
  function checkpoint(form, options) {
    const ordinary = options?.forAuth === false && !options?.skipLocationWait;
    // Blurring an input can repeat its already durable input-event checkpoint.
    // Only skip exact, completed snapshots; pending writers still queue normally.
    if (ordinary && !saving.has(form) && lastSnapshots.has(form)) {
      try { if (unchanged(lastSnapshots.get(form),capture(form))) return Promise.resolve(null); } catch {}
    }
    const version = (checkpointVersions.get(form) || 0) + 1;
    checkpointVersions.set(form, version);
    const work = (saving.get(form) || Promise.resolve()).catch(() => {}).then(() => {
      // Only obsolete queued autosaves may be skipped. The active atomic write,
      // explicit auth ticket and Save & exit request always finish in order.
      if (form.dataset.draftNavigationLeft || ordinary && checkpointVersions.get(form) !== version) return null;
      return saveSnapshot(form, options);
    });
    saving.set(form, work);
    const clear = () => { if (saving.get(form) === work) saving.delete(form); };
    work.then(clear, clear);
    return work;
  }
  function pending() {
    let ticket;
    try { ticket = JSON.parse(readSession(PENDING) || 'null'); } catch { return null; }
    const now = Date.now();
    if (!ticket || ticket.version !== 1 || !validId(ticket.draftId) || !Number.isInteger(ticket.revision) || ticket.revision < 1 || !Number.isFinite(ticket.createdAt) || ticket.createdAt > now || !Number.isFinite(ticket.expiresAt) || ticket.expiresAt <= now || ticket.expiresAt - ticket.createdAt !== MAX_AGE) {
      removeSession(PENDING); return null;
    }
    return ticket;
  }
  function requirePending(ticket) {
    const current = pending();
    if (!current || current.draftId !== ticket.draftId || current.revision !== ticket.revision || current.createdAt !== ticket.createdAt || current.expiresAt !== ticket.expiresAt) {
      throw error('Listing sign-in was cancelled or expired. Your local draft is still saved.');
    }
  }
  function clearPending() {
    cancellationGeneration++;
    removeSession(PENDING);
  }
  const permanent = user => user && typeof user.id === 'string' && user.id.length > 0 && !user.is_anonymous;
  async function verify(ownerId, verifyAccount) {
    const actual = await verifyAccount();
    if (!permanent(actual) || actual.id !== ownerId) throw error('The signed-in account changed. Your draft is still saved; sign in to the intended account.');
  }
  async function inspectRecovery({user, verifyAccount} = {}) {
    if (!permanent(user) || typeof verifyAccount !== 'function') return null;
    const id = readSession(ACTIVE), generation = cancellationGeneration;
    if (!validId(id)) return null;
    const stillActive = () => {
      if (generation !== cancellationGeneration || readSession(ACTIVE) !== id) throw error('Draft recovery was cancelled. Your local draft is still saved.');
    };
    await verify(user.id, verifyAccount); stillActive();
    const source = await getBundle(id); stillActive();
    // Discovery reveals no fields/photos and never enumerates other local keys.
    if (!source || source.discarded || source.ownerId && source.ownerId !== user.id) return null;
    usable(source, id);
    await verify(user.id, verifyAccount); stillActive();
    return {draftId:id,revision:source.revision,ownerId:source.ownerId || null,accountId:user.id,generation};
  }
  async function recoveryInfo(options) {
    const result = await inspectRecovery(options);
    if (!result) return null;
    return {draftId:result.draftId,revision:result.revision,ownerId:result.ownerId};
  }
  async function recoverPending(options) {
    const info = await inspectRecovery(options);
    if (!info) return null;
    const source = await getBundle(info.draftId);
    if (info.generation !== cancellationGeneration || readSession(ACTIVE) !== info.draftId) throw error('Draft recovery was cancelled. Your local draft is still saved.');
    if (!source || source.discarded || source.ownerId && source.ownerId !== info.accountId || source.revision !== info.revision) throw error('The saved draft changed. Reopen the listing chooser and try again.');
    await verify(info.accountId, options.verifyAccount);
    if (info.generation !== cancellationGeneration || readSession(ACTIVE) !== info.draftId) throw error('Draft recovery was cancelled. Your local draft is still saved.');
    const latest = await getBundle(info.draftId);
    if (info.generation !== cancellationGeneration || readSession(ACTIVE) !== info.draftId) throw error('Draft recovery was cancelled. Your local draft is still saved.');
    if (!latest || latest.discarded || latest.ownerId && latest.ownerId !== info.accountId || latest.revision !== info.revision) throw error('The saved draft changed. Reopen the listing chooser and try again.');
    const now = Date.now(), ticket = {version:1,draftId:info.draftId,revision:info.revision,createdAt:now,expiresAt:now + MAX_AGE};
    writeSession(PENDING, JSON.stringify(ticket));
    return ticket;
  }
  function metadataFor(bundle, ownerId) {
    return {...bundle.data, _guestDraft:{id:bundle.id,revision:bundle.revision,ownerId}, savedMedia:true};
  }
  function matchesOwner(data, bundle, ownerId) {
    return data?._guestDraft?.id === bundle.id && data._guestDraft.revision === bundle.revision && data._guestDraft.ownerId === ownerId;
  }
  function storedMetadata(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try { return JSON.parse(raw); } catch { throw error('An existing account draft occupies this destination. It has not been replaced.'); }
  }
  function requireCurrentClaim(source, ownerId) {
    if (source?.ownerId === ownerId && source.draftKey?.startsWith(`vacancy-listing-draft-v1:${ownerId}:`)) {
      const blocked = error('Your earlier account draft needs review before continuing. Open a copy of the saved account draft so its latest edits and photos are preserved.');
      blocked.code = 'LEGACY_DRAFT_REVIEW';blocked.draftKey = source.draftKey;throw blocked;
    }
  }
  async function adopt({user, verifyAccount, deferCompletion=false} = {}) {
    const ticket = pending();
    if (!ticket) return null;
    if (!permanent(user) || typeof verifyAccount !== 'function') throw error('Verify a permanent signed-in account before restoring this draft.');
    const ownerId = user.id, id = ticket.draftId;
    await verify(ownerId, verifyAccount);
    requirePending(ticket);
    const claimed = await getBundle(id);requirePending(ticket);
    requireCurrentClaim(claimed, ownerId);
    const draftKey = `vacancy-listing-draft-v2:${ownerId}:new-property:guest-${id}`;
    // Reserve the source for exactly one owner and add media without overwriting.
    const bundle = await transaction('readwrite', (store, done, fail) => {
      const request = store.get(sourceKey(id));
      request.onsuccess = () => {
        try {
          requirePending(ticket);
          const value = request.result;
          usable(value, id);
          if (value.revision !== ticket.revision) throw error('The saved listing changed after sign-in began. Return to the editor and try again.');
          if (value.ownerId && value.ownerId !== ownerId) throw error('This draft is already linked to another account. It has not been copied.');
          requireCurrentClaim(value, ownerId);
          const metadata = storedMetadata(draftKey);
          if (metadata && !matchesOwner(metadata, value, ownerId)) throw error('An existing account draft occupies this destination. It has not been replaced.');
          const mediaRequest = store.get(draftKey);
          mediaRequest.onsuccess = () => {
            try {
              requirePending(ticket);
              if (mediaRequest.result !== undefined && value.draftKey !== draftKey) throw error('Existing account photos occupy this destination. They have not been replaced.');
              if (mediaRequest.result === undefined) {
                if (metadata) throw error('The account draft is missing photos. The original local draft is still saved.');
                store.add(value.media, draftKey);
              }
              value.ownerId = ownerId; value.draftKey = draftKey;
              store.put(value, sourceKey(id)); done(value);
            } catch (cause) { fail(cause); }
          };
        } catch (cause) { fail(cause); }
      };
    });
    await verify(ownerId, verifyAccount);
    requirePending(ticket);
    let data = storedMetadata(draftKey);
    if (data && !matchesOwner(data, bundle, ownerId)) throw error('The destination draft changed. It has not been replaced.');
    if (!data) {
      data = metadataFor(bundle, ownerId);
      const json = JSON.stringify(data);
      try { localStorage.setItem(draftKey, json); if (localStorage.getItem(draftKey) !== json) throw error('Draft readback failed'); }
      catch { throw error('The account draft could not be saved. The original local draft is still safe. Retry in this account.'); }
    }
    await verify(ownerId, verifyAccount);
    requirePending(ticket);
    const media = await transaction('readwrite', (store, done, fail) => {
      const request = store.get(sourceKey(id));
      request.onsuccess = () => {
        try {
          requirePending(ticket);
          const source = request.result;
          usable(source, id);
          if (source.ownerId !== ownerId || source.revision !== ticket.revision || source.draftKey !== draftKey) throw error('The draft changed while restoring it.');
          const copied = store.get(draftKey);
          copied.onsuccess = () => {
            try {
              requirePending(ticket);
              if (!Array.isArray(copied.result) || !matchesOwner(storedMetadata(draftKey), source, ownerId)) throw error('The saved draft could not be verified. The original is still saved.');
              source.adoptedAt = source.adoptedAt || Date.now();
              store.put(source, sourceKey(id)); done(copied.result);
            } catch (cause) { fail(cause); }
          };
        } catch (cause) { fail(cause); }
      };
    });
    await verify(ownerId, verifyAccount);
    requirePending(ticket);
    if(!deferCompletion){
    removeSession(PENDING, value => { try { const current=JSON.parse(value);return current?.draftId===id&&current.revision===ticket.revision; } catch { return false; } });
    removeSession(ACTIVE, value => value === id);
    }
    return {draftKey,data,media,ownerId,draftId:id};
  }
  async function discard(formOrId) {
    const form = typeof formOrId === 'object' ? formOrId : null;
    const id = form ? form.dataset?.guestDraftId : formOrId;
    if (!validId(id)) return;
    cancellationGeneration++;
    // A tombstone stops an old tab's delayed autosave from resurrecting Files.
    await transaction('readwrite', (store, done) => { store.put({version:1,id,discarded:true}, sourceKey(id)); done(); });
    removeSession(ACTIVE, value => value === id);
    removeSession(PENDING, value => { try { return JSON.parse(value)?.draftId === id; } catch { return false; } });
    if (form?.dataset.guestDraftId === id) {
      delete form.dataset.guestDraftId; delete form.dataset.guestDraftRevision; delete form.dataset.draftStorageKey;
    }
  }
  async function completeOwned(id, ownerId) {
    if (!validId(id) || typeof ownerId !== 'string' || !ownerId) return;
    await transaction('readwrite', (store, done, fail) => {
      const request = store.get(sourceKey(id));
      request.onsuccess = () => {
        const value = request.result;
        if (!value) { done(); return; }
        if (value.ownerId !== ownerId) { fail(error('This local draft belongs to a different account.')); return; }
        store.put({version:1,id,ownerId,discarded:true}, sourceKey(id)); done();
      };
    });
    removeSession(ACTIVE, value => value === id);
    removeSession(PENDING, value => { try { return JSON.parse(value)?.draftId === id; } catch { return false; } });
  }
  return {ensureId,load,dashboardDraft,checkpoint,localPending:form=>saving.has(form),cancelLocalNavigation:form=>checkpointVersions.set(form,(checkpointVersions.get(form)||0)+1),prepareAuth:checkpoint,pending,adopt,recoveryInfo,recoverPending,discard,completeOwned,clearPending};
})();
