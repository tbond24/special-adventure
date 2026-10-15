import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,check} from './support.mjs';
const candidateApp=path.resolve(fileURLToPath(new URL('../../app/',import.meta.url)));
const deployedBaselineApp=path.resolve(candidateApp,'../work/deployed-baseline/app');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
  '.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
export function isolatedSource(source,key,apiOrigin=ROOT){
  check(key&&!/[\r\n'"<>]/.test(key),'Invalid test key');
  check(apiOrigin===ROOT||/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(apiOrigin),'Only isolated API origins allowed');
  return source.replaceAll('https://xtutkwiivqkgkqjpkxvj.supabase.co',apiOrigin)
    .replace(/const KEY = '[^']*';/g,()=>"const KEY = '"+key+"';");
}
export async function frontendServer(key,{apiOrigin=ROOT,port=0,appRoot=candidateApp}={}){
  isolatedSource('',key,apiOrigin); // Validate before listening or constructing CSP.
  // Only the checked-out development app or the pinned deployed-source copy.
  // Never allow an arbitrary directory to become an HTTP document root.
  const app=path.resolve(appRoot);
  check(app===candidateApp||app===deployedBaselineApp,'Unapproved isolated frontend source directory');
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',`connect-src 'self' ${apiOrigin}; img-src 'self' data: blob:;`);
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const target=path.resolve(app,'.'+(pathname==='/'?'/index.html':pathname));
      if(!target.startsWith(app+path.sep)||pathname.startsWith('/api/')){res.writeHead(403).end();return;}
      let bytes=await readFile(target);
      if(['.js','.mjs'].includes(path.extname(target)))bytes=isolatedSource(bytes.toString(),key,apiOrigin);
      res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(bytes);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {url:'http://127.0.0.1:'+server.address().port,
    close:()=>new Promise(resolve=>server.close(resolve))};
}
