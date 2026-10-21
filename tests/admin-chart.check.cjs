const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const context={window:{},escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')};vm.runInNewContext(fs.readFileSync('app/src/admin-chart.js','utf8'),context);
const render=context.window.VACANCY_CHART.render;
const values=[2,0,3,1].map((value,i)=>({start:i*10,end:(i+1)*10,value}));
const html=render([{id:'events',label:'Actions',color:'#0aadeb',values},{id:'previous',label:'Previous',color:'#80cdeb',dashed:true,values}],{start:0,end:80,label:'Actions per interval'});
assert(!html.includes('<polyline'));assert(html.includes('stroke-dasharray="2 4"'));
const paths=[...html.matchAll(/ d="([^"]+)"/g)].map(m=>m[1]);assert.equal(paths.length,2);
for(const path of paths){assert(path.includes(' C'));const segments=path.split(' C'),start=segments.shift().slice(1).split(',').map(Number);let [ax,ay]=start;
 for(const segment of segments){const [c1x,c1y,c2x,c2y,bx,by]=segment.split(',').map(Number);assert(bx>ax);assert(bx<=184); // Latest observation ends halfway through axis; future is blank.
  for(let j=0;j<=100;j++){const t=j/100,u=1-t,x=u**3*ax+3*u*u*t*c1x+3*u*t*t*c2x+t**3*bx,y=u**3*ay+3*u*u*t*c1y+3*u*t*t*c2y+t**3*by;assert(x>=ax-1e-9&&x<=bx+1e-9);assert(y>=Math.min(ay,by)-1e-9&&y<=Math.max(ay,by)+1e-9);assert(y<=128+1e-9)}[ax,ay]=[bx,by];
 }
}
const zero=render([{label:'Empty',color:'#0aadeb',values:values.map(p=>({...p,value:0}))}],{start:0,end:80});assert(zero.includes('M34,128'));assert(!zero.includes('NaN'));assert(!render([],{start:0,end:80}).includes('NaN'));
console.log('PASS: curved interval observations, bounded peaks and zero floor, blank future and dashed comparisons');
