// Development only: reuse the existing synthetic fixture without hosted access.
import http from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPreviewRevisions} from './preview-revisions.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = path.join(root, 'app');
const fixture = path.join(root, 'tests/admin-visual-fixture.js');
const previewClient = path.join(root, 'scripts/preview-client.js');
const mobileFiles = new Map([
  ['/__mobile-design', path.join(root, 'preview/mobile-foundations.html')],
  ['/__preview/mobile.css', path.join(root, 'preview/mobile-foundations.css')],
  ['/__preview/mobile.js', path.join(root, 'preview/mobile-foundations.js')]
]);
const productionRef = 'xtutkwiivqkgkqjpkxvj';
const mime = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css', '.svg':'image/svg+xml',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.ico':'image/x-icon'};
export const policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'self' data: blob:; frame-ancestors 'self';";

export function isolatedText(source) {
  const text = source.replace(/<!-- Google tag \(gtag\.js\) -->[\s\S]*?<!-- End Google tag -->/g, '<!-- Google analytics disabled in isolated preview -->')
    .replaceAll('https://' + productionRef + '.supabase.co', '/__offline')
    .replace(/const (KEY|PUBLIC_KEY) = '[^']*';/g,
      (_, name) => `const ${name} = 'isolated-fixture-noncredential';`);
  if (text.includes(productionRef) || /sb_(?:publishable|secret)_[A-Za-z0-9_-]+/.test(text)) {
    throw Error('Hosted backend reference remains in preview asset');
  }
  if (text.includes('https://www.googletagmanager.com/gtag/js')) throw Error('Google tag remains in isolated preview asset');
  return text;
}

export function createDevServer() {
  const revisions = createPreviewRevisions({directory:app, extensions:Object.keys(mime), extraFiles:[
    {name:'__admin-visual-fixture.js', file:fixture}, {name:'__preview/client.js', file:previewClient},
    ...[...mobileFiles].map(([name, file]) => ({name:name.slice(1), file}))
  ]});
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', policy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('X-Vacancy-Preview-Isolated', 'synthetic-no-hosted-backend');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      res.writeHead(405).end('Development preview is read-only'); return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const parts = pathname.split(/[\\/]/);
      if (parts.some(p => p.startsWith('.') || p.toLowerCase() === 'api') || pathname.includes('\0')) {
        res.writeHead(403).end('Unavailable in isolated preview'); return;
      }
      if (pathname === '/__preview/status') {
        const snapshot = await revisions();
        const head = await readFile(path.join(root, '.git/HEAD'), 'utf8').catch(() => 'Workspace');
        const source = head.trim().replace(/^ref: refs\/heads\//, '');
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
        res.end(req.method === 'HEAD' ? undefined : JSON.stringify({...snapshot, source})); return;
      }
      if (pathname.startsWith('/__offline')) {
        res.writeHead(503, {'Content-Type':'application/json'})
          .end('{"error":"Hosted services are disabled in this preview"}'); return;
      }
      const admin = pathname === '/__admin-preview';
      let target;
      if (mobileFiles.has(pathname)) target = mobileFiles.get(pathname);
      else if (pathname === '/__preview/client.js') target = previewClient;
      else if (pathname === '/__admin-visual-fixture.js') target = fixture;
      else {
        target = path.resolve(app, '.' + (admin || pathname === '/' ? '/index.html' : pathname));
        const canonical = await realpath(target);
        if (!canonical.startsWith(app + path.sep)) {
          res.writeHead(403).end('Outside preview assets'); return;
        }
      }
      const type = path.extname(target).toLowerCase();
      if (!mime[type]) { res.writeHead(403).end('Unsupported preview asset'); return; }
      let body = await readFile(target);
      if (['.html', '.js', '.mjs', '.css', '.json', '.svg'].includes(type)) {
        body = isolatedText(body.toString());
      }
      if (admin) body = body.replace('</body>', '<script src="/__admin-visual-fixture.js"></script></body>');
      if (type === '.html') {
        const snapshot = await revisions();
        body = body.replace('</head>', `<meta name="vacancy-preview-revision" content="${snapshot.revision}"></head>`)
          .replace('</body>', '<script defer src="/__preview/client.js"></script></body>');
      }
      res.writeHead(200, {'Content-Type':mime[type]});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const status = error instanceof URIError ? 400 : ['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) ? 404 : 500;
      res.writeHead(status).end(status === 500 ? 'Preview asset failed isolation checks' : 'Preview asset unavailable');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.VACANCY_DEV_HOST || '127.0.0.1';
  const port = Number(process.env.VACANCY_DEV_PORT || 8776);
  if (!['127.0.0.1', '0.0.0.0'].includes(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw Error('Use VACANCY_DEV_HOST=127.0.0.1 or 0.0.0.0 and a valid VACANCY_DEV_PORT');
  }
  const server = createDevServer();
  server.on('error', error => { console.error('Preview could not start:', error.code); process.exitCode = 1; });
  server.listen(port, host, () => {
    console.log(`Vacancy isolated preview: http://localhost:${port}/`);
    console.log(`Synthetic admin: http://localhost:${port}/__admin-preview`);
    console.log('Hosted services, real sign-in, email and API handlers are disabled.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
