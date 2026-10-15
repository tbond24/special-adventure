// Bounded pilot-editor measurements in the EXISTING disposable stack only.
// No hosted load, real accounts, external requests, SQL DDL or runtime changes.
import {randomUUID} from 'node:crypto';

export function summarize(samples) {
  if (!Array.isArray(samples) || !samples.length || samples.some(x => !Number.isFinite(x) || x < 0)) {
    throw Error('Expected nonempty finite nonnegative measurements');
  }
  const values = [...samples].sort((a, b) => a - b);
  const rank = p => values[Math.ceil(values.length * p) - 1];
  return {samples: values.length, min: values[0], p50: rank(.5), p95: rank(.95), max: values.at(-1)};
}

export function assertDisposable(ROOT, owner, env = process.env) {
  if (env.VACANCY_DISPOSABLE_STACK !== '1' || ROOT !== 'http://127.0.0.1:54321' ||
      owner?.role !== 'owner' || owner?.email !== 'qa-owner@vacancy.invalid') {
    throw Error('Editor measurements require the approved disposable synthetic Owner and loopback stack');
  }
}

export async function verifyEditorReadPerformance({ROOT, key, sql, check, pass, evidence, owner, page, sensitive}) {
  assertDisposable(ROOT, owner);
  const element = 'listing-detail/save-button';
  const runs = [], report = {
    environment: 'Existing disposable Supabase CI; loopback HTTP, synthetic Owner with real AAL2',
    scope: 'Pilot appearance RPCs only; not visitor aggregates or production capacity',
    seedPublications: 60, sampleCountPerCase: 50, concurrencyLevels: [1, 5],
    warmupRequestsPerCase: 5, completed: false, runs,
    timingDefinition: 'Wall-clock HTTP request plus complete response-body receipt; excludes warmup and fixture writes',
    percentileDefinition: 'Nearest rank ceil(n*p); no interpolation',
    storageDefinition: 'PostgreSQL table+index allocated bytes and row counts; not billable storage, WAL, backups or monthly cost',
    limitations: ['Single runner and synthetic account', 'Warm loopback connections', '60 additional revisions, not large-scale history',
      'Concurrent requests are not distinct users', 'No hosted latency, sustained throughput, capacity or cost claim']
  };
  evidence.editorReadPerformance = report;
  let token, baseline, seeded = false, measured = false;
  async function refresh() {
    const session = await page.evaluate(async () => {
      await VACANCY_BACKEND.currentUser();
      return VACANCY_BACKEND.session();
    });
    check(session?.access_token, 'Performance fixture Owner session available');
    token = session.access_token;
    sensitive.add(token); if (session.refresh_token) sensitive.add(session.refresh_token);
    owner.session = session;
    const response = await fetch(ROOT + '/auth/v1/user', {
      headers: {apikey: key, Authorization: 'Bearer ' + token}, redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    const user = await response.json();
    check(response.ok && user.id === owner.id, 'Real local Auth validates performance Owner');
  }
  const allowed = new Set(['site_appearance_published', 'admin_appearance_state', 'admin_appearance_history',
    'admin_appearance_save_draft', 'admin_appearance_publish']);
  async function call(name, body = {}, anonymous = false) {
    check(allowed.has(name), 'Allowlisted editor performance RPC');
    const start = performance.now();
    const response = await fetch(ROOT + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: {apikey: key, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (anonymous ? key : token)},
      body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    const text = await response.text(), elapsedMs = performance.now() - start;
    check(response.ok, 'Editor performance ' + name + ' HTTP ' + response.status);
    let data; try {data = JSON.parse(text);} catch {throw Error('Editor performance response is not JSON');}
    return {data, elapsedMs, bytes: Buffer.byteLength(text)};
  }
  const state = async () => (await call('admin_appearance_state', {p_element_key: element})).data;
  async function publishConfig(config) {
    const current = await state();
    const saved = await call('admin_appearance_save_draft', {
      p_element_key: element, p_config: config, p_expected_draft_version: current.draft?.version || 0,
      p_expected_published_revision: current.published.revision
    });
    const published = await call('admin_appearance_publish', {
      p_element_key: element, p_expected_published_revision: current.published.revision,
      p_expected_draft_version: saved.data.version, p_reason: 'Synthetic bounded editor measurement', p_request_id: randomUUID()
    });
    check(published.data.revision === current.published.revision + 1, 'Measured fixture uses real versioned publication');
  }
  const counts = async () => JSON.parse(await sql(`select json_build_object(
    'revisions',(select count(*) from public.admin_appearance_revisions),
    'audit',(select count(*) from public.admin_change_audit),
    'drafts',(select count(*) from public.admin_appearance_drafts),
    'revisionTableAndIndexesBytes',pg_total_relation_size('public.admin_appearance_revisions'),
    'auditTableAndIndexesBytes',pg_total_relation_size('public.admin_change_audit'));`));
  const fingerprint = async () => {
    const size = await counts();
    return JSON.stringify({state: await state(), revisions: size.revisions, audit: size.audit, drafts: size.drafts});
  };
  try {
    await refresh(); baseline = await state();
    check(baseline.draft === null, 'Performance fixture begins without an Owner draft');
    report.beforeSeed = await counts();
    seeded = true;
    for (let i = 0; i < report.seedPublications; i++) {
      if (i % 15 === 0) await refresh();
      await publishConfig({desktop: {radius: (i % 30) + 1}});
    }
    report.afterSeed = await counts();
    check(report.afterSeed.revisions - report.beforeSeed.revisions === 60, '60 real synthetic publications persisted');
    check(report.afterSeed.audit - report.beforeSeed.audit === 120, 'Every synthetic draft and publication is audited');
    pass('Bounded editor fixture adds 60 real publications and 120 immutable audit entries through AAL2 RPCs');
    const beforeReads = await fingerprint();
    const endpoints = [
      {name: 'site_appearance_published', body: {}, anonymous: true, validate(data) {
        check(Array.isArray(data) && data.length === 1, 'Public configuration remains one bounded element');
        check(data.every(row => Object.keys(row).sort().join(',') === 'config,key,revision'), 'Public response has no private history, drafts or actors');
      }},
      {name: 'admin_appearance_state', body: {p_element_key: element}, validate(data) {
        check(data.canPublish === true && data.draft === null && Number.isInteger(data.published?.revision), 'Authenticated current-state contract');
      }},
      {name: 'admin_appearance_history', body: {p_element_key: element}, validate(data) {
        check(Array.isArray(data) && data.length === 20, 'History stays capped at 20 with more than 60 stored revisions');
        check(data.every((row, i) => !i || data[i - 1].revision > row.revision), 'History remains newest-first without duplicate revisions');
      }}
    ];
    for (const endpoint of endpoints) for (const concurrency of report.concurrencyLevels) {
      await refresh();
      for (let i = 0; i < report.warmupRequestsPerCase; i++) {
        endpoint.validate((await call(endpoint.name, endpoint.body, endpoint.anonymous)).data);
      }
      const samples = [], sizes = []; let next = 0, active = 0, peak = 0;
      const results = await Promise.allSettled(Array.from({length: concurrency}, async () => {
        while (next < report.sampleCountPerCase) {
          next++; active++; peak = Math.max(peak, active);
          try {
            const out = await call(endpoint.name, endpoint.body, endpoint.anonymous);
            endpoint.validate(out.data); samples.push(out.elapsedMs); sizes.push(out.bytes);
          } finally {active--;}
        }
      }));
      const rejected = results.find(result => result.status === 'rejected');
      if (rejected) throw rejected.reason;
      check(samples.length === report.sampleCountPerCase && peak <= concurrency, 'Bounded completed read sample count/concurrency');
      runs.push({rpc: endpoint.name, concurrency, peakInFlight: peak, errors: 0,
        latencyMs: summarize(samples), responseBytes: summarize(sizes)});
      pass(endpoint.name + ': 50 real reads at concurrency ' + concurrency + ', response contracts retained');
    }
    check(await fingerprint() === beforeReads, 'Read measurements leave appearance, history, drafts and audit unchanged');
    report.readOnlyVerified = true;
    pass('All 300 measured reads preserve private/public boundaries and leave editor data unchanged');
    measured = true;
  } finally {
    if (seeded && baseline) {
      await refresh();
      const latest = await state();
      if (JSON.stringify(latest.published.config) !== JSON.stringify(baseline.published.config)) await publishConfig(baseline.published.config);
      const restored = await state();
      check(JSON.stringify(restored.published.config) === JSON.stringify(baseline.published.config) && restored.draft === null,
        'Restore exact pre-measurement configuration through a new audited publication');
      report.configurationRestored = true; report.afterRestore = await counts();
      pass('Performance fixture restores prior compiled/published settings without deleting history or audit');
    }
  }
  report.completed = measured && report.configurationRestored === true;
}
