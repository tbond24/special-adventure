// Explicit local-only connection page. Never serves product pages or backend APIs.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {publicConfig} = require('../app/api/posthog-config.js');
const root = new URL('../', import.meta.url);

export function testConfiguration(env) {
  if (env.VERCEL || env.CI || env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production') {
    throw Error('PostHog connection checks run locally only; hosted/production execution is forbidden');
  }
  const projectId = env.POSTHOG_TEST_PROJECT_ID || '';
  if (!/^[1-9][0-9]*$/.test(projectId)) throw Error('Set POSTHOG_TEST_PROJECT_ID for the verified test project');
  const config = publicConfig({...env, VERCEL_ENV:'development'});
  if (!config.enabled) throw Error('Set a valid test project token, host and POSTHOG_ENABLED=true in .env.posthog.local');
  return {...config, projectId};
}

const browser = `
const status = document.querySelector('[role=status]');
const allow = document.querySelector('#allow');
const send = document.querySelector('#send');
const stop = document.querySelector('#stop');
let sent = false;
allow.onclick = async () => {
  allow.disabled = true;
  const ready = await VACANCY_POSTHOG.setConsent(true);
  send.disabled = !ready || sent;
  allow.disabled = false;
  status.textContent = ready ? 'Optional test analytics allowed for this page. No event sent yet.' : 'Not enabled. Check configuration, privacy preferences or browser blocking.';
};
send.onclick = () => {
  send.disabled = true;
  sent = VACANCY_POSTHOG.capture('vacancy_smoke_completed');
  status.textContent = sent ? 'One test event handed to the SDK. Verify receipt in PostHog.' : 'No event sent. Analytics may be blocked.';
};
stop.onclick = async () => {
  await VACANCY_POSTHOG.setConsent(false);
  send.disabled = true;
  status.textContent = 'Optional test analytics turned off. Already sent events cannot be recalled.';
};`;

export function createPosthogTestServer(config) {
  const assets = {
    '/src/posthog-analytics.js':'app/src/posthog-analytics.js',
    '/vendor/posthog/posthog.js':'app/vendor/posthog/posthog.js'
  };
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; connect-src 'self' ${config.host}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
    const authority = '127.0.0.1:' + req.socket.localPort;
    if (req.headers.host !== authority || (req.headers.origin && req.headers.origin !== 'http://' + authority)) {
      res.writeHead(403).end('Use the exact loopback URL printed by this server'); return;
    }
    if (req.method !== 'GET') {res.writeHead(405, {Allow:'GET'}).end(); return;}
    const url = new URL(req.url, 'http://' + authority);
    if (url.search) {res.writeHead(400).end('Query strings are not supported'); return;}
    if (url.pathname === '/') {
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vacancy Test connection</title><body><main>
<h1>Vacancy Test connection</h1><p>Local test project ${config.projectId}. Production tracking stays blocked.</p>
<p>This page loads only Vacancy's analytics adapter and SDK. No account, listing, message or production backend is loaded.</p>
<p>Choose whether to send one optional synthetic test event. No pageviews, clicks or recordings are collected automatically.</p>
<button id="allow" type="button">Allow optional test analytics</button>
<button id="send" type="button" disabled>Send one test event</button>
<button id="stop" type="button">Turn off test analytics</button>
<p role="status">Test analytics is off. No event sent.</p>
</main><script src="/src/posthog-analytics.js"></script><script src="/posthog-test.js"></script></body></html>`); return;
    }
    if (url.pathname === '/api/posthog-config') {
      res.writeHead(200, {'Content-Type':'application/json'}).end(JSON.stringify({enabled:true, token:config.token, host:config.host})); return;
    }
    if (url.pathname === '/posthog-test.js') {
      res.writeHead(200, {'Content-Type':'text/javascript'}).end(browser); return;
    }
    if (!assets[url.pathname]) {res.writeHead(404).end('Unavailable on this test server'); return;}
    try {
      const body = await readFile(new URL(assets[url.pathname], root));
      res.writeHead(200, {'Content-Type':'text/javascript'}).end(body);
    } catch {res.writeHead(500).end('Test asset unavailable; use the committed SDK bundle');}
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = testConfiguration(process.env);
  const server = createPosthogTestServer(config);
  server.on('error', error => {console.error('Local connection page failed:',error.code);process.exitCode=1;});
  server.listen(8891,'127.0.0.1',()=>console.log('Vacancy Test: http://127.0.0.1:8891/ — no events until optional consent and Send.'));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>process.exit(0)));
}
