// Shared count chart: bucket values extend across their interval; future time is blank.
(() => {
 const esc=x=>escapeHtml(String(x));
 function render(series,{start,end,single=false,label='Count',timeZone}={}){
  const maxValue=Math.max(0,...series.flatMap(s=>s.values.map(p=>p.value))),target=Math.max(1,maxValue/3),power=10**Math.floor(Math.log10(target)),step=Math.max(1,[1,2,5,10].map(n=>n*power).find(n=>n>=target)),max=Math.max(step*3,Math.ceil(maxValue/(step*3))*step*3);
  const x=t=>34+Math.max(0,Math.min(1,(t-start)/(end-start)))*300,y=n=>128-n/max*112;
  let grid='';for(let i=0;i<=3;i++){const n=max*i/3,yy=y(n);grid+='<line x1="34" x2="334" y1="'+yy+'" y2="'+yy+'" stroke="#eceef1"/><text x="23" y="'+(yy+3)+'" text-anchor="end">'+new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(n)+'</text>';}
  const divisions=single?8:Math.min(6,Math.round((end-start)/86400000));for(let i=0;i<divisions;i++){const t=start+(end-start)*i/divisions;grid+='<text x="'+x(t)+'" y="146" text-anchor="middle">'+esc(new Date(t).toLocaleString(undefined,single?{hour:'numeric',hour12:true,timeZone}:{month:'short',day:'numeric',timeZone}))+'</text>';}
  const lines=series.map(s=>{const points=s.values.flatMap(p=>[[x(p.start),y(p.value)],[x(p.end),y(p.value)]]);return '<polyline data-chart-series="'+esc(s.id||s.label)+'" points="'+points.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+s.color+'" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" '+(s.dashed?'stroke-dasharray="2 4"':'')+'/>';}).join('');
  return '<svg class="overview-count-chart" viewBox="0 0 350 155" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+'</title>'+grid+lines+'</svg><div class="overview-chart-legend">'+series.map(s=>'<span style="--line:'+s.color+'"'+(s.dashed?' class="previous"':'')+'>'+esc(s.label)+'</span>').join('')+'</div>';
 }
 window.VACANCY_CHART=Object.freeze({render});
})();
