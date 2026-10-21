// Generate a bounded release-ledger statement only after public asset verification.
// Does not load credentials, apply SQL, move aliases, or publish anything.
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];
const previousPath=get('--previous'),manifestPath=get('--manifest'),deployment=get('--deployment'),origin=get('--url'),summary=get('--summary');
if(!args.includes('--previous')||!args.includes('--manifest')||!/^dpl_[A-Za-z0-9]+$/.test(deployment)||!/^https:\/\/[A-Za-z0-9.-]+$/.test(origin)||!summary||summary.length>240)throw Error('Use --previous PREVIOUS_MANIFEST --manifest PATH --deployment dpl_ID --url HTTPS_ORIGIN --summary TEXT');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));if(!/^[a-f0-9]{40}$/.test(manifest.source))throw Error('Invalid source commit');
for(const file of manifest.files.filter(f=>manifest.changed.includes(f.file)&&!f.file.startsWith('api/')&&f.file!=='index.html')){const r=await fetch(origin+'/'+file.file,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok||createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')!==file.sha256)throw Error('Live asset mismatch: '+file.file)}
const previous=JSON.parse(await readFile(previousPath,'utf8')),oldFiles=new Map(previous.files.map(f=>[f.file,f.sha256])),changed=manifest.files.filter(f=>oldFiles.get(f.file)!==f.sha256).map(f=>f.file);
const sections=new Set();for(const name of changed){if(name==='admin-console.css')sections.add('Admin appearance');if(/admin-(?:overview-cards|visitor-tile|chart)/.test(name))sections.add('Overview cards');if(name.includes('admin-activity-feeds'))sections.add('Activity feeds');if(/engagement|visitor-context/.test(name))sections.add('Visitor analytics');if(name.includes('site-appearance'))sections.add('Site appearance')}
const quote=value=>"'"+value.replaceAll("'","''")+"'";
console.log('select public.record_admin_release('+[deployment,manifest.source,summary].map(quote).join(',')+',array['+[...sections].map(quote).join(',')+']::text[]);');
