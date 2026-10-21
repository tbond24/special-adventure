const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const context={window:{},escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')};vm.runInNewContext(fs.readFileSync('app/src/admin-chart.js','utf8'),context);
const render=context.window.VACANCY_CHART.render,values=[2,0,3,1].map((value,i)=>({start:i*10,end:(i+1)*10,value}));
const html=render([{id:'events',label:'Actions',color:'#ff6b22',values},{id:'previous',label:'Previous',color:'#aab6c5',dashed:true,values}],{start:0,end:80,label:'Actions per interval'});
assert(html.includes('<polyline'));assert(!html.includes('<path'));assert(!html.includes('Previous'));assert(!html.includes('overview-chart-legend'));assert(html.includes('<circle'));
const points=[...html.matchAll(/ points="([^"]+)"/g)][0][1].split(' ').map(p=>p.split(',').map(Number));for(const [x,y] of points){assert(x>=30&&x<=95);assert(y>=12&&y<=70)}
for(const days of [1,7,30,90]){const start=Date.UTC(2026,9,1),svg=render([],{start,end:start+days*86400000,single:days===1,timeZone:'UTC'});assert(!svg.includes('grid-major'));assert(!svg.includes('grid-minor'));for(const line of svg.matchAll(/<line[^>]+>/g)){const x1=/x1="([^"]+)"/.exec(line[0])[1],x2=/x2="([^"]+)"/.exec(line[0])[1],y1=/y1="([^"]+)"/.exec(line[0])[1],y2=/y2="([^"]+)"/.exec(line[0])[1];assert.notEqual(x1,x2);assert.equal(y1,y2)}}
const zero=render([{label:'Empty',color:'#ff6b22',values:values.map(p=>({...p,value:0}))}],{start:0,end:80});assert(zero.includes('30,70'));assert(!zero.includes('NaN'));
assert(render([{label:'Scale',color:'#347ef0',values:[{start:0,end:10,value:169}]}],{start:0,end:20}).includes('text-anchor="end">200</text>'));
console.log('PASS: pre-screenshot polylines, original scale and endpoint, no vertical guides or previous-period overlay, zero baseline and blank future');
