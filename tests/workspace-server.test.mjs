import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createDevServer, isolatedText} from '../scripts/dev-server.mjs';
import {createPreviewRevisions} from '../scripts/preview-revisions.mjs';

test('preview excludes APIs, credentials and repository files, including encoded paths', async () => {
  const server = createDevServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const request = (pathname, method = 'GET') => new Promise((resolve, reject) => {
    http.request(origin + pathname, {method}, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({status:res.statusCode, headers:res.headers, body:Buffer.concat(chunks).toString()}));
    }).on('error', reject).end();
  });
  try {
    for (const pathname of ['/api/resend-webhook.js', '/api/listing-page', '/%61pi/geocode.js', '/.env.local', '/.git/config', '/%2e%2e%2fpackage.json', '/%2e%2e%5cpackage.json']) {
      assert.equal((await request(pathname)).status, 403, pathname);
    }
    assert.equal((await request('/%ZZ')).status, 400);
    assert.equal((await request('/not-found')).status, 404);
    assert.equal((await request('/__offline/auth/v1/token')).status, 503);
    assert.equal((await request('/', 'POST')).status, 405);
    const backend = await request('/src/backend.js');
    assert.equal(backend.status, 200);
    assert(!backend.body.includes('xtutkwiivqkgkqjpkxvj'));
    assert(!backend.body.includes('sb_publishable_'));
    assert(backend.body.includes('/__offline'));
    assert.match(backend.headers['content-security-policy'], /connect-src 'self'/);
    assert.equal(backend.headers['cache-control'], 'no-store');
    assert.equal((await request('/', 'HEAD')).body, '');
    const admin = await request('/__admin-preview');
    assert.equal(admin.status, 200);
    assert(admin.body.includes('/__admin-visual-fixture.js'));
    assert(admin.body.includes('/__preview/client.js'));
    const status = await request('/__preview/status');
    const snapshot = JSON.parse(status.body);
    assert.equal(status.status, 200);
    assert.match(snapshot.revision, /^[a-f0-9]{12}$/);
    assert(admin.body.includes('content="' + snapshot.revision + '"'));
    assert.equal((await request('/__preview/status', 'POST')).status, 405);
    assert.equal((await request('/__preview/client.js')).status, 200);
    assert.equal((await request('/__preview/anything-else')).status, 404);
    assert(!(await request('/index.html')).body.includes('googletagmanager.com'));
    const mobile = await request('/__mobile-design');
    assert.equal(mobile.status, 200);
    assert(mobile.body.includes('Mobile · draft 01'));
    assert(mobile.body.includes('/__preview/client.js'));
    assert.equal((await request('/__preview/mobile.css')).status, 200);
    assert.equal((await request('/__preview/mobile.js')).status, 200);
    assert.equal((await request('/__mobile-design', 'POST')).status, 405);
    assert.equal((await request('/__preview/mobile.css', 'HEAD')).body, '');
    assert.match(JSON.parse((await request('/__preview/status')).body).styles['/__preview/mobile.css'], /^[a-f0-9]{12}$/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('preview fingerprints distinguish styling from reloads and exclude hidden/API files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'vacancy-revisions-'));
  try {
    await mkdir(path.join(directory, 'api'));
    await writeFile(path.join(directory, 'index.html'), '<p>Example</p>');
    await writeFile(path.join(directory, 'styles.css'), 'p{color:red}');
    const revisions = createPreviewRevisions({directory, extensions:['.html', '.css', '.js']});
    const before = await revisions();
    await writeFile(path.join(directory, '.private.js'), 'private');
    await writeFile(path.join(directory, 'api', 'private.js'), 'private');
    const next = async () => { await new Promise(resolve => setTimeout(resolve, 220)); return revisions(); };
    assert.deepEqual(await next(), before);
    await writeFile(path.join(directory, 'styles.css'), 'p{color:blue}');
    const css = await next();
    assert.notEqual(css.revision, before.revision);
    assert.equal(css.reloadRevision, before.reloadRevision);
    assert.notEqual(css.styles['/styles.css'], before.styles['/styles.css']);
    await writeFile(path.join(directory, 'index.html'), '<p>Changed</p>');
    const html = await next();
    assert.notEqual(html.reloadRevision, css.reloadRevision);
    await rm(path.join(directory, 'styles.css'));
    const removed = await next();
    assert.equal(removed.styles['/styles.css'], undefined);
    assert.equal(removed.reloadRevision, html.reloadRevision);
    assert.deepEqual(await Promise.all([revisions(), revisions()]), [removed, removed]);
  } finally { await rm(directory, {recursive:true, force:true}); }
});

test('unknown hosted backend configuration fails closed', () => {
  assert.throws(() => isolatedText('const other="https://xtutkwiivqkgkqjpkxvj.example";'));
  assert.throws(() => isolatedText('const other="sb_secret_example";'));
  assert.throws(() => isolatedText('const other="sb_publishable_example";'));
});
