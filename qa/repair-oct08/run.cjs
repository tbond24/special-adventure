const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),mode=process.argv[2]||'scoped';
const scoped=['oct08-scoped-repairs','scoped-map-listing-admin','photo-publication-repair','stage101-listing-journey','stage102-listing-units','requested-owner-edits','requested-find-listing-fixes','stage56-guest-enquiry','oct08-ui-repairs','oct08-data-journey','compare-price-restoration'];
const launch=require(path.join(root,'package.json')).scripts['test:launch'].split(/\s+/).filter(value=>value.startsWith('tests/'));
if(!['scoped','launch'].includes(mode))throw new Error('Choose scoped or launch');
const files=mode==='launch'?launch:scoped.map(name=>`tests/${name}.spec.js`);
const result=spawnSync(process.execPath,[path.join(root,'node_modules/@playwright/test/cli.js'),'test',`--config=${path.join(__dirname,'playwright.config.cjs')}`,...files,...process.argv.slice(3)],{cwd:root,stdio:'inherit',env:{...process.env,VACANCY_E2E_URL:'http://127.0.0.1:8776',NODE_OPTIONS:`${process.env.NODE_OPTIONS||''} --require=${path.join(__dirname,'safe-fixtures.cjs')}`.trim()}});
if(result.error)throw result.error;
process.exitCode=result.status??1;
