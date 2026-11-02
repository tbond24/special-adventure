// Original compact interval plots, with horizontal guides only. Future time stays blank.
(() => {
 const esc=x=>escapeHtml(String(x));
 function render(series,{start,end,single=false,label='Count',timeZone,compact=true,showLegend=true,fixedXAxis=true}={}){
  series=series.filter(s=>!s.dashed);
  const maxValue=Math.max(0,...series.flatMap(s=>s.values.map(p=>p.value))),target=Math.max(1,maxValue/4),power=10**Math.floor(Math.log10(target)),step=Math.max(1,[1,2,5,10].map(n=>n*power).find(n=>n>=target)),max=maxValue?Math.ceil(maxValue/step)*step+(maxValue%step===0?step:0):1;
  const left=compact?28:50,right=compact?308:780,top=compact?10:20,bottom=compact?108:236,width=right-left,height=bottom-top;
  const x=t=>left+Math.max(0,Math.min(1,(t-start)/(end-start)))*width,y=n=>bottom-n/max*height;
  let grid='';for(let i=1;i<4;i++){const yy=top+i*height/4;grid+='<line class="grid-value" x1="'+left+'" x2="'+right+'" y1="'+yy+'" y2="'+yy+'" stroke="#e5e7eb"/>';}
  const format=t=>new Date(t).toLocaleString(undefined,single?{hour:'2-digit',minute:'2-digit',timeZone}:{month:'short',day:'numeric',timeZone});
  const axisLabel=fixedXAxis?' data-fixed-x-axis':'';
  const axis='<text x="'+(left-6)+'" y="'+(top+3)+'" text-anchor="end">'+new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(max)+'</text><text x="'+(left-6)+'" y="'+(bottom+2)+'" text-anchor="end">0</text><text'+axisLabel+' x="'+left+'" y="'+(compact?132:265)+'">'+esc(format(start))+'</text><text'+axisLabel+' x="'+right+'" y="'+(compact?132:265)+'" text-anchor="end">'+esc(format(end))+'</text>';
  const timeAxis=single?[0,6,12,18,24].map((hour,i)=>'<text class="axis-time"'+axisLabel+' x="'+(left+i*width/4)+'" y="'+(compact?132:265)+'" text-anchor="'+(i===0?'start':i===4?'end':'middle')+'" style="font-size:12px">'+['12 am','6 am','12 noon','6 pm','12 am'][i]+'</text>').join(''):'';
  const finalAxis=single?axis.slice(0,axis.indexOf('<text'+axisLabel+' x="'+left+'"'))+timeAxis:axis;
  const lines=series.map(s=>{
   if(!s.values.length)return '';
   const points=[[x(s.values[0].start),y(s.values[0].value)],...s.values.map(p=>[x(p.end),y(p.value)])];
   const unique=points.filter((p,i)=>!i||p[0]>points[i-1][0]),last=unique.at(-1);
   return '<polyline class="metric-series" data-chart-series="'+esc(s.id||s.label)+'" points="'+unique.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+s.color+'" stroke-width="'+(compact?2:2.5)+'" stroke-linejoin="round"/>'+(compact&&(series.length===1||!showLegend)?'<circle cx="'+last[0]+'" cy="'+last[1]+'" r="2.5" fill="'+s.color+'"/>':'');
  }).join('');
  const legend=showLegend&&series.length>1?'<div class="overview-chart-legend">'+series.map(s=>'<span style="--line:'+s.color+'">'+esc(s.label)+'</span>').join('')+'</div>':'';
  return '<svg preserveAspectRatio="none" class="overview-count-chart '+(compact?'chart-compact':'chart-wide')+'" viewBox="0 0 '+(compact?'320 144':'800 280')+'" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+'</title>'+grid+finalAxis+lines+'</svg>'+legend;
 }
 // Keep all axis text at its CSS size while plots stretch with their container.
 // Narrow charts retain the endpoints and noon rather than collide at 6/18h.
 function fitXAxis(root){
  for(const svg of root.querySelectorAll('svg:has([data-fixed-x-axis])')){
   const matrix=svg.getScreenCTM();if(!matrix)continue;
   const sx=Math.hypot(matrix.a,matrix.b),sy=Math.hypot(matrix.c,matrix.d);
   if(!sx||!sy||!Number.isFinite(sx)||!Number.isFinite(sy))continue;
   for(const text of svg.querySelectorAll('text')){
    const x=Number(text.getAttribute('x')),y=Number(text.getAttribute('y'));
    text.setAttribute('transform','translate('+x+' '+y+') scale('+(1/sx)+' '+(1/sy)+') translate('+(-x)+' '+(-y)+')');
   }
   const labels=[...svg.querySelectorAll('.axis-time[data-fixed-x-axis]')];
   labels.forEach(text=>text.removeAttribute('hidden'));
   if(labels.some((text,i)=>i&&labels[i-1].getBoundingClientRect().right+8>text.getBoundingClientRect().left))
    labels.forEach((text,i)=>{if(i%2)text.setAttribute('hidden','');});
  }
 }
 window.VACANCY_CHART=Object.freeze({render,fitXAxis});
})();
