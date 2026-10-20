import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createDevServer, isolatedText} from '../scripts/dev-server.mjs';

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
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('unknown hosted backend configuration fails closed', () => {
  assert.throws(() => isolatedText('const other="https://xtutkwiivqkgkqjpkxvj.example";'));
  assert.throws(() => isolatedText('const other="sb_secret_example";'));
  assert.throws(() => isolatedText('const other="sb_publishable_example";'));
});
