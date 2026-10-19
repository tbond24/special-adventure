// Native build-output adapter for the existing isolated lab, never the product build.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const ROOT='https://raauicmfyjpcuhfzknak.supabase.co';
if(process.env.VERCEL_PROJECT_ID!=='prj_gVMPc0rvkw2iLTqOCJQ5cVjGHJwS')throw Error('Only the existing test lab is allowed');
const key=process.env.VACANCY_TEST_PUBLIC_KEY;
if(!key?.startsWith('sb_publishable_')||!/^[A-Za-z0-9_-]+$/.test(key))throw Error('Test publishable key required');
const out=path.resolve('.vercel/output'),app=new URL('../../app/',import.meta.url),manifest=[];
const transform=s=>s.replaceAll('https://xtutkwiivqkgkqjpkxvj.supabase.co',ROOT)
  .replace(/const (KEY|PUBLIC_KEY) = '[^']*';/g,(_,name)=>`const ${name} = '${key}';`);
async function copy(dir,relative=''){
  for(const e of await readdir(dir,{withFileTypes:true})){
    if(e.isSymbolicLink())throw Error('Unexpected source symlink');
    const p=relative+e.name;
    if(e.isDirectory()){if(p!=='api')await copy(new URL(e.name+'/',dir),p+'/');continue;}
    if(p==='vercel.json')continue;
    let bytes=await readFile(new URL(e.name,dir));
    if(/\.(js|mjs|html|json|css)$/.test(p))bytes=Buffer.from(transform(bytes.toString()));
    if(bytes.includes('xtutkwiivqkgkqjpkxvj')||bytes.includes('sb_publishable_w3YAIocUnB-Nc4ISHZqTWw_wg0zZR2R'))throw Error('Production backend reference remains: '+p);
    const dest=path.join(out,'static',p);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes);
    manifest.push({path:p,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
}
await copy(app);
const fn=path.join(out,'functions/api/listing-page.func');await mkdir(path.join(fn,'api'),{recursive:true});
const handler=transform(await readFile(new URL('api/listing-page.js',app),'utf8'));
if(handler.includes('xtutkwiivqkgkqjpkxvj'))throw Error('Production function reference');
await writeFile(path.join(fn,'api/listing-page.js'),handler);
await writeFile(path.join(fn,'404.html'),await readFile(new URL('404.html',app)));
await writeFile(path.join(fn,'index.html'),transform(await readFile(new URL('index.html',app),'utf8')));
await writeFile(path.join(fn,'.vc-config.json'),JSON.stringify({runtime:'nodejs24.x',handler:'api/listing-page.js',launcherType:'Nodejs',shouldAddHelpers:true,maxDuration:15}));
await writeFile(path.join(out,'config.json'),JSON.stringify({version:3,routes:[
  {src:'/(.*)',headers:{'Content-Security-Policy':`connect-src 'self' ${ROOT}; img-src 'self' data: blob: ${ROOT};`,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'},continue:true},
  {src:'/listings/([^/]+)(?:/[^/]+)?',dest:'/api/listing-page?id=$1'},
  {handle:'filesystem'}, {src:'/',dest:'/index.html'}, {src:'/(.*)',status:404,dest:'/404.html'}
]}));
await writeFile(path.join(out,'static/qa-source-manifest.json'),JSON.stringify({testProject:'raauicmfyjpcuhfzknak',source:process.env.VERCEL_GIT_COMMIT_SHA||null,files:manifest},null,2));
console.log('Isolated lab bundle prepared: '+manifest.length+' static files and the actual listing-page function.');
