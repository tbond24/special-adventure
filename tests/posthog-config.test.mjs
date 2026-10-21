import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const handler = require('../app/api/posthog-config.js');
const configured = {POSTHOG_ENABLED:'true', POSTHOG_PROJECT_TOKEN:'phc_synthetic_test_only', POSTHOG_HOST:'https://eu.i.posthog.com', VERCEL_ENV:'preview'};

test('PostHog configuration fails closed for missing settings and production', () => {
  const config = handler.publicConfig;
  assert.deepEqual(config({}), {enabled:false});
  assert.equal(config(configured).enabled, true);
  for (const changes of [
    {VERCEL_ENV:'production'}, {VERCEL_ENV:undefined}, {POSTHOG_ENABLED:'false'},
    {POSTHOG_PROJECT_TOKEN:'personal-secret'}, {POSTHOG_PROJECT_TOKEN:''},
    {POSTHOG_HOST:'https://eu.i.posthog.com.evil.invalid'}, {POSTHOG_HOST:'http://us.i.posthog.com'}
  ]) assert.deepEqual(config({...configured,...changes}), {enabled:false});
});

test('PostHog API rejects writes and never caches or returns unrelated secrets', () => {
  for (const method of ['GET','POST']) {
    const headers = {}, res = {setHeader:(k,v)=>headers[k]=v, status(code){this.code=code;return this;}, json(body){this.body=body;}};
    handler({method}, res);
    assert.equal(headers['Cache-Control'], 'no-store');
    assert.equal(res.code, method === 'GET' ? 200 : 405);
    if (method === 'GET') assert.deepEqual(res.body, {enabled:false});
    else assert.equal(headers.Allow, 'GET');
  }
});
