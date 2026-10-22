// Explicit local candidate server: no hosted APIs, credentials or remote connections.
import http from 'node:http';import {readFile,realpath} from 'node:fs/promises';import path from 'node:path';import {isolatedText,policy} from './dev-server.mjs';
const candidate=JSON.parse(await readFile('/tmp/vacancy-admin-candidate.json','utf8')),root=await realpath(candidate.directory);
http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',policy);res.setHeader('X-Vacancy-Preview-Isolated','synthetic-candidate');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 const name=new URL(req.url,'http://localhost').pathname;if(name.startsWith('/api/')||name.startsWith('/__offline')){res.writeHead(503).end('{}');return}
 try{const file=name==='/'?'/index.html':name,filename=await realpath(path.join(root,file));if(!filename.startsWith(root+path.sep))throw Error();let bytes=await readFile(filename);if(/\.(html|js|mjs|css|json)$/.test(file))bytes=Buffer.from(isolatedText(bytes.toString()));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(bytes)}catch{res.writeHead(404).end()}
}).listen(8785,'127.0.0.1');
