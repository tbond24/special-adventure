// Read-only local static server. No API proxy or hosted service calls.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../app');
const mime = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2'};
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (request.method !== 'GET' || !filename.startsWith(root + path.sep)) {
    response.writeHead(403); response.end(); return;
  }
  response.setHeader('Cache-Control', 'no-store');
  fs.readFile(filename, (error, data) => {
    response.writeHead(error ? 404 : 200, {'Content-Type':mime[path.extname(filename)] || 'application/octet-stream'});
    response.end(error ? 'Not found' : data);
  });
}).listen(8777, '127.0.0.1', () => console.log('Synthetic listing accordion QA: http://127.0.0.1:8777'));
