// Development-only fixture server. Never shipped from app/ or connected to a database.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {gzipSync} = require('node:zlib');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../app');
const baseline = file => execFileSync('git', ['show', `rollback/before-admin-marketing-page-20261005:${file}`], {cwd:path.resolve(__dirname,'..')});
const oldScript = baseline('app/src/admin-lister-marketing.js');
const oldStyle = baseline('app/styles.css');
const names = ['lister_session_started','lister_landing_viewed','list_property_clicked','listing_started','location_started','location_completed','listing_details_started','listing_details_completed','photos_completed','pricing_completed','listing_previewed','publish_clicked','listing_record_created','listing_submitted','step_ready','photo_upload','journey_error'];
function report(count, publications) {
  const now = Date.now();
  return {generated_at:new Date(now).toISOString(),events:Array.from({length:count},(_,i)=>({
    id:`test-event-${i}`,user_id:null,event_name:names[i%names.length],vacancy_id:i%17===13?`test-listing-${i}`:null,
    created_at:new Date(now-3600000+i*100).toISOString(),visitor_id:`test-browser-${Math.floor(i/17)}`,session_id:`test-session-${Math.floor(i/17)}`,
    journey_id:i%17>2?`test-journey-${Math.floor(i/17)}`:null,source:i%2?'Google':'Direct / Unknown',medium:i%2?'organic_search':'unknown',
    campaign:i%3?'':'development-fixture',campaign_id:null,adset_id:null,ad_id:null,content_id:null,first_source:'Direct / Unknown',first_medium:'unknown',first_campaign:null,
    step:'listing_details',device_class:i%2?'mobile':'desktop',browser_family:'Chrome',os_family:i%2?'Android':'Windows',duration_ms:120+i%300,active_ms:1000+i%1000,error_code:i%17===16?'test_upload_failed':null
  })),publications:Array.from({length:publications},(_,i)=>({vacancy_id:`test-publication-${i}`,created_at:new Date(now-1800000+i).toISOString(),property_id:`test-property-${i}`,owner_id:'test-owner',is_first_property_publication:true,visitor_id:null,session_id:null,source:null,medium:null,campaign:null,campaign_id:null,adset_id:null,ad_id:null,device_class:null}))};
}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  // Even a manual browser visit must not send analytics/auth requests to production.
  res.setHeader('Content-Security-Policy',"connect-src 'self'");
  if(url.pathname==='/__admin-preview'){
    let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    html=html.replace(/<script src="src\/(?:lister-journey-analytics|connected-journey)[^>]+><\/script>/,'');
    html=html.replace('</body>','<script src="/__admin-visual-fixture.js"></script></body>');
    res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;
  }
  if(url.pathname==='/__admin-visual-fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(fs.readFileSync(path.join(__dirname,'admin-visual-fixture.js')));return;}
  if(url.pathname==='/__marketing_report') {
    const data=report(Math.min(6000,Number(url.searchParams.get('events'))||0),Math.min(6000,Number(url.searchParams.get('publications'))||0));
    if(url.searchParams.has('representative')) {
      // Deterministic high-entropy IDs prevent unrealistically good compression of test-event-123.
      const id=value=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`};
      for(const [i,row] of data.events.entries()) {
        for(const key of ['id','visitor_id','session_id','journey_id','vacancy_id'])if(row[key])row[key]=id(row[key]);
        row.campaign=i%3?'':`test-campaign-${i%29}`;
        row.error_code=i%17===16?`test_upload_failed_${i%7}`:null;
      }
      for(const row of data.publications)for(const key of ['vacancy_id','property_id','owner_id'])row[key]=id(row[key]);
    }
    const body=Buffer.from(JSON.stringify(data)),gzip=url.searchParams.has('gzip'),wire=gzip?gzipSync(body):body;
    res.writeHead(200,{'Content-Type':'application/json','Content-Length':wire.length,...(gzip?{'Content-Encoding':'gzip','Vary':'Accept-Encoding'}:{})});res.end(wire);return;
  }
  if(url.pathname==='/__baseline-marketing.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(oldScript);return;}
  if(url.pathname==='/__baseline-styles.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(oldStyle);return;}
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(target,(error,body)=>{if(error){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(body);});
}).listen(Number(process.env.VACANCY_PREVIEW_PORT)||8765,'127.0.0.1',()=>console.log('Development fixture server — localhost only, synthetic data'));
