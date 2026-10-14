// Local, synthetic, read-only browser fixture server for admin editor tests.
// Binds loopback only, never proxies to Supabase or a production host.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const app=path.resolve(__dirname,'../app');
const files={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.svg':'image/svg+xml','.json':'application/json',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 res.setHeader('Cache-Control','no-store');
 // Prevent fixture code from sending Auth, writes, analytics, or media requests
 // outside the local test server; tests also block external Playwright routes.
 res.setHeader('Content-Security-Policy',"connect-src 'self'; img-src 'self' data: blob:;");
 if(url.pathname==='/__admin-preview'){
   let html=fs.readFileSync(path.join(app,'index.html'),'utf8');
   html=html.replace('</body>',
     '<script src="/__admin-visual-fixture.js"></script></body>');
   res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;
 }
 if(url.pathname==='/__admin-visual-fixture.js'){
   res.writeHead(200,{'Content-Type':'text/javascript'});
   res.end(fs.readFileSync(path.join(__dirname,'admin-visual-fixture.js')));return;
 }
 let pathname;
 try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400);res.end();return}
 const target=path.resolve(app,'.'+(pathname==='/'?'/index.html':pathname));
 if(!target.startsWith(app+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(target,(error,bytes)=>{
   if(error){res.writeHead(404);res.end('Not found');return}
   res.writeHead(200,{'Content-Type':files[path.extname(target)]||'application/octet-stream'});
   res.end(bytes);
 });
}).listen(8776,'127.0.0.1',()=>console.log('Isolated Vacancy admin fixture on 127.0.0.1:8776'));
