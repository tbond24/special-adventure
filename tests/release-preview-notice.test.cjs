const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('app/src/release-preview-notice.js','utf8');
function run(hostname){const added=[];vm.runInNewContext(source,{location:{hostname},document:{body:{prepend:n=>added.push(n)},createElement:()=>({style:{},setAttribute(){}})}});return added;}
for(const hostname of ['getvacancy.site','www.getvacancy.site','vacancy-tbond24s-projects.vercel.app','127.0.0.1'])test('no preview notice on '+hostname,()=>assert.equal(run(hostname).length,0));
test('preview warns about shared account/database and actual publishing',()=>{const result=run('vacancy-example-project.vercel.app');assert.equal(result.length,1);assert.match(result[0].textContent,/live accounts and database/);assert.match(result[0].textContent,/Publish creates a live listing/);assert.match(result[0].textContent,/Google or email links/);});
