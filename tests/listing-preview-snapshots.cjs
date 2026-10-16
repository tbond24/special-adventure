// Generated examples from actual renderer output, never customer DOM or data.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'app/previews');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
async function inputs(){const files=(await fs.readdir(path.join(root,'app/src'))).filter(f=>f.endsWith('.js')&&!/^(admin-|site-appearance|analytics-controls|renter-journey|connected-journey|lister-journey-analytics)/.test(f)).sort();const rows=[];for(const file of files){const text=(await fs.readFile(path.join(root,'app/src',file),'utf8')).replace(/\r\n/g,'\n');rows.push({path:'app/src/'+file,sha256:hash(text)});}return {files:rows,fingerprint:hash(JSON.stringify(rows))};}
function validate(snapshot){if(snapshot.synthetic!==true||!['create','edit'].includes(snapshot.mode)||typeof snapshot.html!=='string'||!snapshot.html.includes('id="listingForm"')||!snapshot.html.includes('aria-label="Listing language"')||!snapshot.html.includes('data-language-page="'+snapshot.mode+'"')||/<(?:script|iframe|object|embed|base|link)\b/i.test(snapshot.html)||/\son[a-z]+\s*=/i.test(snapshot.html)||/\b(?:src|href|action|formaction)\s*=\s*["']\s*(?:https?:|javascript:)/i.test(snapshot.html))throw Error('Unsafe or incomplete renderer snapshot');}
async function check(){const m=JSON.parse(await fs.readFile(path.join(out,'listing-context-manifest.json'),'utf8')),current=await inputs();if(current.fingerprint!==m.fingerprint)throw Error('Public renderer changed: regenerate the isolated Create/Edit context examples');for(const mode of ['create','edit']){const bytes=await fs.readFile(path.join(out,'listing-'+mode+'.json'),'utf8'),snapshot=JSON.parse(bytes);validate(snapshot);if(hash(bytes)!==m.snapshots[mode])throw Error('Snapshot digest mismatch');}console.log('PASS: both composed Create/Edit examples are safe and match the current public renderer fingerprint');}
async function generate(){
 if(process.env.VACANCY_GENERATE_PREVIEW_SNAPSHOTS!=='1')throw Error('Explicit isolated snapshot generation opt-in required');
 const {chromium,expect}=require('@playwright/test'),{createCloud,install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
 const browser=await chromium.launch();let context;const cloud=createCloud(),id='00000000-0000-4000-8000-000000007001';
 cloud.editListings.set(id,{id,roomId:'00000000-0000-4000-8000-000000007002',propertyId:'00000000-0000-4000-8000-000000007003',privateName:'Example unit',roomName:'Example studio',unitType:'Studio',description:'Example description — not a real listing.',rentAmount:22000,rentCurrency:'KES',rentPeriod:'month',deposit:0,availableFrom:'',minimumStayWeeks:'',maxOccupants:1,unitDetails:{},locality:'',city:'',region:'',country:'Kenya',marketCode:'KE',address:'',propertyType:'Apartment',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0,media:[]});
 try{
  const manifest=await inputs();manifest.synthetic=true;manifest.source='Actual composed renderer output in the existing network-blocked account-draft fixture';manifest.context='Location step; example only, no live customer data or interactive business actions';manifest.snapshots={};await fs.mkdir(out,{recursive:true});
  for(const mode of ['create','edit']){
   console.log('Capturing isolated '+mode+' renderer');context=await browser.newContext({viewport:{width:1280,height:1100},serviceWorkers:'block'});await install(context,cloud,{signedIn:owner});
   const page=await context.newPage();
   // Establish the same signed-in entry as the existing language regression.
   // Fresh Edit bootstrap and a dirty Create form are not snapshot inputs.
   await page.goto('http://127.0.0.1:8784/#list/new');await expect(page.locator('.listing-language select')).toBeVisible();
   if(mode==='edit'){await page.waitForFunction(()=>booting===false&&currentUser?.id==='10000000-0000-4000-8000-000000000001');await page.getByLabel('Listing language').selectOption('fr');await page.getByLabel('Listing language').selectOption('en');await page.goto('http://127.0.0.1:8784/#edit/'+id);await expect(page.locator('.listing-language select')).toBeVisible();}
   if(mode==='create'){await page.locator('[data-listing-type="Residential"]').click();await page.locator('[data-add-mode="new"]').click();}
   try{await expect(page.locator('#listingForm')).toHaveAttribute('data-journey101','true');}catch(error){console.error(JSON.stringify(await page.evaluate(()=>({hash:location.hash,actor:currentUser?.id,booting,body:document.querySelector('#app')?.textContent.slice(0,400),host:document.querySelector('#listingHost')?.textContent.slice(0,300),notice:document.querySelector('.toast')?.textContent,forms:[...document.forms].map(f=>f.id)}))));throw error;}await expect(page.locator('#listingHost')).toHaveAttribute('data-language-page',mode);
   const captured=await page.evaluate(()=>{
    const source=document.querySelector('#app'),main=source.cloneNode(true);
    for(const node of main.querySelectorAll('script,iframe,object,embed,base,link,dialog'))node.remove();
    for(const map of main.querySelectorAll('.listing-map')){map.replaceChildren();const note=document.createElement('p');note.textContent='Map inactive in this example';map.append(note);}
    for(const element of main.querySelectorAll('*')){
     if(element instanceof HTMLInputElement){if(element.type==='file'||element.type==='hidden'||element.type==='date')element.removeAttribute('value');else element.setAttribute('value',element.value);if(element.checked)element.setAttribute('checked','');else element.removeAttribute('checked');}
     if(element instanceof HTMLTextAreaElement)element.textContent=element.value;
     if(element instanceof HTMLOptionElement){if(element.selected)element.setAttribute('selected','');else element.removeAttribute('selected');}
     for(const attr of [...element.attributes]){
      if(/^on/i.test(attr.name)||['action','formaction','srcdoc','contenteditable','data-draft-storage-key'].includes(attr.name)){element.removeAttribute(attr.name);continue;}
      if(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/i.test(attr.value)){element.setAttribute(attr.name,'');continue;}
      if(['src','href','poster'].includes(attr.name)){if(attr.value.startsWith(location.origin))element.setAttribute(attr.name,attr.value.slice(location.origin.length));else if(/^(?:https?:|javascript:|\/\/)/i.test(attr.value))element.removeAttribute(attr.name);}
      if(attr.name==='style'&&/url\(/i.test(attr.value))element.removeAttribute('style');
     }
    }
    return {html:main.innerHTML,mainClass:main.className};
   });
   const snapshot={synthetic:true,mode,context:'Location step',fingerprint:manifest.fingerprint,...captured};validate(snapshot);const bytes=JSON.stringify(snapshot)+'\n';await fs.writeFile(path.join(out,'listing-'+mode+'.json'),bytes);manifest.snapshots[mode]=hash(bytes);await context.close();context=null;
  }
  if(cloud.publicWrites.length)throw Error('Snapshot generation attempted a business write');await fs.writeFile(path.join(out,'listing-context-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Captured both actual composed renderers using synthetic state; no public writes');
 }finally{await context?.close();await browser.close();}
}
(process.argv.includes('--generate')?generate():check()).catch(error=>{console.error(error.message);process.exitCode=1});
