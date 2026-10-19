// Source-package verification only. No deployment, credentials or hosted API calls.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';

const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
assert.equal(process.cwd(),root,'Run from the Vacancy checkout');
const require=createRequire(import.meta.url);
const {yauzl,extract}=require(path.join(path.dirname(require.resolve('playwright-core')),'lib/zipBundle.js'));
// git archive otherwise applies this Windows checkout's core.autocrlf=true.
// Override only this process: review/execution manifests require canonical LF bytes.
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-c','core.autocrlf=false',...args],{cwd:root,maxBuffer:30*1024*1024});
const text=(...args)=>git(...args).toString().trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
const requested=process.argv[2]||text('rev-parse','HEAD');
assert.match(requested,/^[0-9a-f]{40}$/);
const source=text('rev-parse',requested+'^{commit}');
// Review pin includes the reproduced asset lifecycle fix. The full disposable
// workflow tests this payload before checking its exact source package.
const tested='1ecd4b72479739a8f3b8beac786d05eb3b1704ed';
assert.equal(text('diff','--name-only',tested,source,'--','app','supabase'),'','Package must match the reviewed runtime and SQL');
const manifest=JSON.parse(git('show',source+':docs/evidence/admin-release-candidate-execution-20261017.json'));
assert.equal(manifest.candidates.length,17);
const appPaths=text('ls-tree','-r','--name-only',source,'app').split('\n');
const selected=[...appPaths,...manifest.candidates.map(x=>x.path),'supabase/functions/secure-password-reset/index.ts'].sort();
assert.equal(new Set(selected).size,selected.length);
assert(selected.every(p=>!/(?:^|\/)(?:\.env(?:\.|$)|\.vercel(?:\/|$)|node_modules|work|sources|\.git\/)/i.test(p)));
await mkdir(path.join(root,'work'),{recursive:true});
const output=await mkdtemp(path.join(root,'work','free-release-checks-'));
const archive=path.join(output,'candidate-source.zip'),unpacked=path.join(output,'unpacked');
git('archive','--format=zip','--output',archive,source,...selected);
const zipBytes=await readFile(archive);
assert(zipBytes.length<30*1024*1024);
const info={startedAt:new Date().toISOString(),source,testedSource:tested,kind:'Exact Git source package; not Vercel prebuilt output or hosted acceptance',
  archive:{path:path.relative(root,archive).replaceAll('\\','/'),bytes:zipBytes.length,sha256:sha(zipBytes)},files:[],checks:[],browser:[],productionMutation:false,externalRequestsAllowed:0};
const pass=label=>info.checks.push(label);
let browser,server;
try{
  const entries=new Set();let total=0;
  await new Promise((resolve,reject)=>yauzl.open(archive,{lazyEntries:true},(error,zip)=>{
    if(error)return reject(error);
    zip.on('error',reject);
    zip.on('entry',entry=>{
      try{
        const name=entry.fileName;
        assert(!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').includes('..'));
        assert(path.resolve(unpacked,name).startsWith(unpacked+path.sep));
        assert(!entries.has(name));entries.add(name);
        assert(entries.size<400&&entry.uncompressedSize<15*1024*1024);
        total+=entry.uncompressedSize;assert(total<30*1024*1024);
        assert.equal(entry.generalPurposeBitFlag&1,0,'Encrypted ZIP entry is unexpected');
        const type=(entry.externalFileAttributes>>>16)&0xf000;
        assert([0,0x4000,0x8000].includes(type),'Links/special ZIP entries are forbidden');
        if(!name.endsWith('/'))assert(selected.includes(name),'Unexpected source-package file');
        zip.readEntry();
      }catch(e){zip.close();reject(e);}
    });
    zip.on('end',resolve);zip.readEntry();
  }));
  await extract(archive,{dir:unpacked});
  async function walk(dir){for(const name of await readdir(dir)){const p=path.join(dir,name),s=await lstat(p);assert(!s.isSymbolicLink());if(s.isDirectory())await walk(p);else{assert(s.isFile());const rel=path.relative(unpacked,p).replaceAll('\\','/');assert(selected.includes(rel));const bytes=await readFile(p),canonical=git('show',source+':'+rel);assert(bytes.equals(canonical),rel+' archive bytes');info.files.push({path:rel,bytes:bytes.length,gitBlob:text('rev-parse',source+':'+rel),sha256:sha(bytes)});}}}
  await walk(unpacked);assert.equal(info.files.length,selected.length);info.files.sort((a,b)=>a.path.localeCompare(b.path));
  for(const c of manifest.candidates){const row=info.files.find(x=>x.path===c.path);assert.equal(row.sha256,c.sha256);assert.equal(row.gitBlob,c.gitBlob);}
  assert.equal(info.files.find(x=>x.path==='supabase/functions/secure-password-reset/index.ts').gitBlob,'923b1582ad411348ebe2e26373047383a0e3da2f');
  pass('Archive contains only committed app, 17 canonical candidates and frozen reset; every extracted byte matches Git');
  let syntax=0;
  for(const row of info.files.filter(x=>/\.(?:m?js)$/.test(x.path))){
    const out=spawnSync(process.execPath,['--check',path.join(unpacked,row.path)],{encoding:'utf8',timeout:20000});
    assert.equal(out.status,0,row.path+' syntax: '+(out.stderr||''));syntax++;
  }
  info.scriptSyntaxCount=syntax;pass('All packaged JavaScript and module files parse');
  const app=path.join(unpacked,'app'),html=await readFile(path.join(app,'index.html'),'utf8');
  const dependencies=[];
  function dependency(owner,ref){
    if(!ref||ref.startsWith('#')||/^(?:data:|blob:|https?:|\/\/)/i.test(ref))return;
    const url=new URL(ref,new URL(owner,'http://package.invalid/'));
    assert.equal(url.origin,'http://package.invalid');
    const p=decodeURIComponent(url.pathname).replace(/^\//,'');
    assert(appPaths.includes('app/'+p),owner+' missing local dependency '+p);
    dependencies.push({owner,reference:ref,path:p});
  }
  for(const m of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi))dependency('/index.html',m[1]);
  for(const row of info.files.filter(x=>x.path.startsWith('app/')&&/\.(?:css|mjs)$/.test(x.path))){
    const body=await readFile(path.join(unpacked,row.path),'utf8'),owner='/'+row.path.slice(4);
    if(row.path.endsWith('.css'))for(const m of body.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g))dependency(owner,m[1]);
    else for(const m of body.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.[^"']+)["']/g))dependency(owner,m[1]);
  }
  info.directDependencyReferences=dependencies.length;info.directDependencyPaths=[...new Set(dependencies.map(x=>x.path))].sort();
  pass('Direct local HTML assets, CSS URLs and literal relative module imports exist in the exact package');
  for(const row of info.files.filter(x=>/\.(?:js|mjs|html|json|ts)$/.test(x.path))){
    const body=await readFile(path.join(unpacked,row.path),'utf8');
    assert(!/sb_secret_[A-Za-z0-9_-]+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(body),'Unexpected secret material in '+row.path);
    for(const token of body.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){
      let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));}catch{continue;}
      assert.notEqual(claims.role,'service_role','Privileged JWT in '+row.path);
    }
  }
  pass('Bounded secret-pattern scan finds no privileged JWT, secret API key or private key; this is not an exhaustive secret audit');
  const config=JSON.parse(await readFile(path.join(app,'vercel.json'),'utf8'));
  assert.deepEqual(config.rewrites,[{source:'/listings/:id/:slug',destination:'/api/listing-page?id=:id'},{source:'/listings/:id',destination:'/api/listing-page?id=:id'}]);
  const handler=await readFile(path.join(app,'api/listing-page.js'),'utf8');
  async function listing(mode){
    let calls=0;const box={module:{exports:{}},require,__dirname:path.join(app,'api'),URLSearchParams,Date,AbortSignal,console:{error(){}},fetch:async()=>{calls++;return {ok:mode!=='failure',json:async()=>[]};}};
    vm.runInNewContext(handler,box,{timeout:2000});
    const result={headers:{}};
    await box.module.exports({query:{id:mode==='invalid'?'invalid':'00000000-0000-4000-8000-000000000099'}},{setHeader:(k,v)=>result.headers[k]=v,status(n){result.status=n;return this;},end(b){result.html=b;}});
    assert.equal(result.status,mode==='failure'?502:404);assert.equal(calls,mode==='invalid'?0:1);
    assert.equal(result.headers['Cache-Control'],'no-store');assert.match(result.html,/Back to Find/);
    if(mode==='failure')assert.match(result.html,/>Retry</);
    return {mode,status:result.status,syntheticFetchCalls:calls};
  }
  info.packagedListingRecovery=await Promise.all(['invalid','missing','failure'].map(listing));
  pass('Packaged rewrite targets exist; isolated handler handles invalid/missing/upstream failure without a network client');
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
  const localFailures=[];
  server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"connect-src 'none'; img-src 'self' data: blob:; frame-src 'self'; worker-src 'none'; form-action 'none';");
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const target=path.resolve(app,'.'+(pathname==='/'?'/index.html':pathname));
      if(!target.startsWith(app+path.sep)||pathname.startsWith('/api/')){res.writeHead(403).end();return;}
      const bytes=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(bytes);
    }catch{localFailures.push(new URL(req.url,'http://127.0.0.1').pathname);res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch();
  for(const width of [1536,390]){
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
    let blocked=0;const errors=[];
    await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();blocked++;return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(origin+'/#auth',{waitUntil:'load'});assert.equal(response.status(),200);
    await expect(page.locator('#authUnified')).toBeVisible();
    await expect(page.locator('#authUnified [name=email]')).toBeVisible();
    await expect(page.locator('#authUnified [name=password]')).toBeVisible();
    assert.equal(await page.locator('.brand-logo').first().evaluate(img=>img.complete&&img.naturalWidth>0),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.goto(origin+'/404.html',{waitUntil:'load'});
    await expect(page.getByRole('link',{name:'Back to Find',exact:true})).toBeVisible();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[],'Packaged unauthenticated pages must not throw');
    const screenshot='package-404-'+width+'.png';await page.screenshot({path:path.join(output,screenshot)});
    info.browser.push({width,authVisible:true,logoDecoded:true,errorPageVisible:true,horizontalOverflow:false,pageErrors:errors.length,externalRequestsBlocked:blocked,screenshot});
    await context.close();
  }
  assert.deepEqual(localFailures,[],'Packaged pages requested missing local files');
  pass('Exact packaged auth and 404 pages load at desktop/mobile widths with decoded logo, no page errors or missing local files, and no allowed external requests');
  info.completed=true;
}catch(error){info.completed=false;info.failure=String(error.message);throw error;}
finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  info.finishedAt=new Date().toISOString();info.localServersAndBrowsersClosed=true;
  await writeFile(path.join(output,'verification.json'),JSON.stringify(info,null,2)+'\n');
  console.log(JSON.stringify({completed:info.completed,source,files:info.files.length,checks:info.checks.length,scriptSyntaxCount:info.scriptSyntaxCount,directDependencyReferences:info.directDependencyReferences,browserCases:info.browser.length,evidence:path.relative(root,path.join(output,'verification.json')).replaceAll('\\','/')}));
}
