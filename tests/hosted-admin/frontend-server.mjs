import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,check} from './support.mjs';
const app=fileURLToPath(new URL('../../app/',import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg',
  '.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
export function isolatedSource(source,key){
  check(key&&!/[\r\n'"<>]/.test(key),'Invalid test key');
  return source.replaceAll('https://xtutkwiivqkgkqjpkxvj.supabase.co',ROOT)
    .replace(/const KEY = '[^']*';/g,()=>"const KEY = '"+key+"';");
}
export async function frontendServer(key){
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',`connect-src 'self' ${ROOT}; img-src 'self' data: blob:;`);
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const target=path.resolve(app,'.'+(pathname==='/'?'/index.html':pathname));
      if(!target.startsWith(app)||pathname.startsWith('/api/')){res.writeHead(403).end();return;}
      let bytes=await readFile(target);
      if(['.js','.mjs'].includes(path.extname(target)))bytes=isolatedSource(bytes.toString(),key);
      res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(bytes);
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:'http://127.0.0.1:'+server.address().port,
    close:()=>new Promise(resolve=>server.close(resolve))};
}
