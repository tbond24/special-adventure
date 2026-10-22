// Explicit opt-in, separate origin. Never proxies APIs or holds user credentials.
import http from 'node:http';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const origin='https://xtutkwiivqkgkqjpkxvj.supabase.co';
const assets=new Map([['/','tools/live-analytics/index.html'],['/bootstrap.js','tools/live-analytics/bootstrap.js'],['/viewer.js','tools/live-analytics/viewer.js'],['/viewer.css','tools/live-analytics/viewer.css'],...['backend.js','admin-overview-cards.js','admin-chart.js','admin-visitor-tile.js','admin-journey-map.js','admin-journey-map.css'].map(p=>['/src/'+p,'app/src/'+p]),['/admin-console.css','app/admin-console.css']]);
export function createLiveAnalyticsServer(){return http.createServer(async(req,res)=>{
 const headers={'X-Vacancy-Analytics-Viewer':'production-read-only','Content-Security-Policy':`default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src ${origin}; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers).end();return}
 const path=new URL(req.url,'http://localhost').pathname,file=assets.get(path);if(!file){res.writeHead(404,headers).end();return}
 try{let text=await readFile(new URL('../'+file,import.meta.url),'utf8');if(path==='/src/backend.js'){text=text.replaceAll('localStorage','sessionStorage').replaceAll('vacancy-session-v01','vacancy-live-analytics-session-v1').replace('/auth/v1/logout?scope=global','/auth/v1/logout?scope=local');}
 res.writeHead(200,{...headers,'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});res.end(req.method==='HEAD'?'':text);
 }catch{res.writeHead(500,headers).end()}
})}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(!process.argv.includes('--live-production'))throw Error('Explicit --live-production opt-in required');
 const port=8780,host=process.argv.includes('--codespaces')?'0.0.0.0':'127.0.0.1';createLiveAnalyticsServer().listen(port,host,()=>console.log('Vacancy live analytics: http://localhost:'+port+' (admin sign-in and MFA required; keep port private)'));
}
