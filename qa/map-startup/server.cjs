// Static loopback-only QA server. Browser fixtures intercept every remote request.
// A separate source root lets the exact same tests establish old-source failures.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.VACANCY_MAP_APP_ROOT||path.join(__dirname,'../../app'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 res.setHeader('Cache-Control','no-store');
 fs.readFile(filename,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'});res.end(err?'Not found':data)});
}).listen(Number(process.env.VACANCY_PREVIEW_PORT)||8799,'127.0.0.1',()=>console.log('Synthetic map-startup QA: '+root));
