// Shared interval counts: bounded cubic curves through observations, never cumulative. Future time stays blank.
(() => {
 const esc=x=>escapeHtml(String(x));
 function render(series,{start,end,single=false,label='Count',timeZone,compact=true}={}){
  const maxValue=Math.max(0,...series.flatMap(s=>s.values.map(p=>p.value))),target=Math.max(1,maxValue/3),power=10**Math.floor(Math.log10(target)),step=Math.max(1,[1,2,5,10].map(n=>n*power).find(n=>n>=target)),max=Math.max(step*3,Math.ceil(maxValue/(step*3))*step*3);
  const left=compact?30:50,right=compact?160:780,top=compact?12:20,bottom=compact?70:236,width=right-left,height=bottom-top;
  const x=t=>left+Math.max(0,Math.min(1,(t-start)/(end-start)))*width,y=n=>bottom-n/max*height;
  let grid='';for(let i=1;i<4;i++){const yy=top+i*height/4;grid+='<line class="grid-value" x1="'+left+'" x2="'+right+'" y1="'+yy+'" y2="'+yy+'" stroke="#e5e7eb"/>';}
  const days=Math.max(1,Math.round((end-start)/86400000)),major=single?3:days<=7?1:days<=30?7:14;
  const guides=[];
  if(single){for(let t=start+3600000;t<end;t+=3600000){const hour=timeZone==='UTC'?new Date(t).getUTCHours():new Date(t).getHours();guides.push({t,major:hour%major===0})}}
  else{const cursor=new Date(start),minor=days<=7?.5:days<=30?1:7;for(let i=minor;i<days;i+=minor){if(minor===.5){if(timeZone==='UTC')cursor.setUTCHours(cursor.getUTCHours()+12);else cursor.setHours(cursor.getHours()+12)}else if(timeZone==='UTC')cursor.setUTCDate(cursor.getUTCDate()+minor);else cursor.setDate(cursor.getDate()+minor);if(+cursor>start&&+cursor<end)guides.push({t:+cursor,major:i%major===0})}}
  for(const g of guides){const xx=x(g.t);grid+='<line class="'+(g.major?'grid-major':'grid-minor')+'" data-grid-time="'+g.t+'" x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+bottom+'" stroke="#e5e7eb" stroke-width="'+(g.major?1:.5)+'" vector-effect="non-scaling-stroke"/>';}
  const format=t=>new Date(t).toLocaleString(undefined,single?{hour:'2-digit',minute:'2-digit',timeZone}:{month:'short',day:'numeric',timeZone});
  const axis='<text x="'+(left-6)+'" y="'+(top+3)+'" text-anchor="end">'+new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(max)+'</text><text x="'+(left-6)+'" y="'+(bottom+2)+'" text-anchor="end">0</text><text x="'+left+'" y="'+(compact?88:265)+'">'+esc(format(start))+'</text><text x="'+right+'" y="'+(compact?88:265)+'" text-anchor="end">'+esc(single?'24:00':format(end))+'</text>';
  const lines=series.map(s=>{
   if(!s.values.length)return '';
   // One observation per interval, at its end. Anchor the first interval so a
   // zero period remains a continuous baseline, including at midnight.
   const points=[[x(s.values[0].start),y(s.values[0].value)],...s.values.map(p=>[x(p.end),y(p.value)])];
   const unique=points.filter((p,i)=>!i||p[0]>points[i-1][0]);
   let d='M'+unique[0].join(',');
   for(let i=1;i<unique.length;i++){
    const [ax,ay]=unique[i-1],[bx,by]=unique[i],third=(bx-ax)/3;
    // Horizontal tangents join smoothly. Each Bezier stays inside its endpoint
    // rectangle, so count curves cannot invent negative values or extra peaks.
    d+=' C'+[ax+third,ay,bx-third,by,bx,by].join(',');
   }
   return '<path class="metric-series" data-chart-series="'+esc(s.id||s.label)+'" d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="'+(compact?2:2.5)+'" stroke-linecap="round" '+(s.dashed?'stroke-dasharray="2 4"':'')+'/>';
  }).join('');
  return '<svg class="overview-count-chart '+(compact?'chart-compact':'chart-wide')+'" viewBox="0 0 '+(compact?'170 94':'800 280')+'" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+'</title>'+grid+axis+lines+'</svg><div class="overview-chart-legend">'+series.map(s=>'<span style="--line:'+s.color+'"'+(s.dashed?' class="previous"':'')+'>'+esc(s.label)+'</span>').join('')+'</div>';
 }
 window.VACANCY_CHART=Object.freeze({render});
})();
