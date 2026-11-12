'use strict';
/* 內容裡的圖表：```chart … ``` → SVG（長條、橫條、折線、圓餅），不需網路 */
const CHART_TYPES={'長條':'bar','直條':'bar','柱狀':'bar','bar':'bar','橫條':'hbar','hbar':'hbar','折線':'line','趨勢':'line','line':'line','圓餅':'pie','圓形':'pie','pie':'pie'};
const CHART_MAX_SERIES=8;
function chartEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function chartNum(v){if(v==null)return NaN;const s=String(v).replace(/[,，\s%％]/g,'').replace(/[^\d.\-]+$/,'');return s===''?NaN:Number(s);}
function chartFmt(n){return Number.isFinite(n)?(Math.round(n*100)/100).toLocaleString('zh-TW'):'—';}
/* 解析：類型／標題／單位 + 表格（| 或 , 或 tab）或「標籤：數字」 */
function parseChart(src,info){
 const meta={type:CHART_TYPES[String(info||'').trim().toLowerCase()]||'',title:'',unit:''},rows=[];
 for(const raw of String(src||'').split('\n')){const l=raw.trim();if(!l)continue;
  const k=l.match(/^(類型|圖表|type|標題|title|單位|unit)\s*[:：]\s*(.+)$/i);
  if(k){const key=k[1].toLowerCase(),v=k[2].trim();if(/類型|圖表|type/.test(key)){const t=Object.keys(CHART_TYPES).find(x=>v.toLowerCase().startsWith(x));if(t)meta.type=CHART_TYPES[t];}else if(/標題|title/.test(key))meta.title=v;else meta.unit=v;continue;}
  if(/^\|?\s*:?-{2,}/.test(l))continue;
  if(l.includes('|'))rows.push(l.replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim()));
  else if(/[\t,，]/.test(l))rows.push(l.split(/\t|,|，/).map(c=>c.trim()));
  else{const m=l.match(/^(.+?)\s*[:：]\s*(-?[\d.,]+)\s*\S*$/);if(m)rows.push([m[1],m[2]]);}}
 if(!rows.length)return null;
 let head=null;if(rows[0].length>1&&rows[0].slice(1).every(c=>!Number.isFinite(chartNum(c))))head=rows.shift();
 const width=Math.max(2,...rows.map(r=>r.length));
 const series=Array.from({length:Math.min(CHART_MAX_SERIES,width-1)},(_,k)=>({name:(head&&head[k+1])||(width>2?'數列'+(k+1):(meta.title||'數值')),values:rows.map(r=>chartNum(r[k+1]))}));
 const labels=rows.map(r=>r[0]||'');
 if(!labels.length||!series.some(s=>s.values.some(Number.isFinite)))return null;
 if(!meta.type)meta.type=series.length===1&&labels.some(l=>l.length>6)?'hbar':'bar';
 return {meta,labels,series,labelHead:head?head[0]:''};
}
function niceTicks(min,max,n=5){if(min===max){max=min+1;}const span=max-min,step0=span/n,mag=10**Math.floor(Math.log10(step0)),step=[1,2,2.5,5,10].map(x=>x*mag).find(x=>span/x<=n)||10*mag;
 const lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step,t=[];for(let v=lo;v<=hi+step/2;v+=step)t.push(Math.round(v*1e6)/1e6);return t;}
function barPath(x,y0,w,y1,r,horizontal){ // 圓角只在資料端
 if(horizontal){const [a,b]=y1>=y0?[y0,y1]:[y1,y0],h=w,len=b-a;r=Math.min(r,len,h/2);if(len<=0)return '';
  return y1>=y0?`M${a},${x}H${b-r}Q${b},${x} ${b},${x+r}V${x+h-r}Q${b},${x+h} ${b-r},${x+h}H${a}Z`:`M${b},${x}H${a+r}Q${a},${x} ${a},${x+r}V${x+h-r}Q${a},${x+h} ${a+r},${x+h}H${b}Z`;}
 const top=Math.min(y0,y1),bot=Math.max(y0,y1),len=bot-top;r=Math.min(r,len,w/2);if(len<=0)return '';
 return y1<=y0?`M${x},${bot}V${top+r}Q${x},${top} ${x+r},${top}H${x+w-r}Q${x+w},${top} ${x+w},${top+r}V${bot}Z`:`M${x},${top}V${bot-r}Q${x},${bot} ${x+r},${bot}H${x+w-r}Q${x+w},${bot} ${x+w},${bot-r}V${top}Z`;}
function chartShort(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s;}
function renderChart(src,info){
 const c=parseChart(src,info);
 if(!c)return '<div class="md-chart md-chart-bad"><b>圖表沒有資料</b><span>每行寫「名稱：數字」，或貼一個表格。</span></div>';
 const {meta,labels,series}=c,u=meta.unit?' '+meta.unit:'',tip=(l,s,v)=>chartEsc(l+(series.length>1?'・'+s:'')+'：'+chartFmt(v)+u);
 let svg='';
 if(meta.type==='pie'){
  const vals=labels.map((l,i)=>({l,v:Math.max(0,series[0].values[i]||0)})).filter(x=>x.v>0);
  let items=vals.length>CHART_MAX_SERIES?[...vals.slice(0,CHART_MAX_SERIES-1),{l:'其他',v:vals.slice(CHART_MAX_SERIES-1).reduce((a,x)=>a+x.v,0)}]:vals;
  const total=items.reduce((a,x)=>a+x.v,0)||1,cx=120,cy=120,R=104,r0=52;let ang=-Math.PI/2;
  const pt=(a,rr)=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a)].map(n=>n.toFixed(2)).join(',');
  const arcs=items.map((x,i)=>{const a2=ang+x.v/total*Math.PI*2,big=a2-ang>Math.PI?1:0,full=items.length===1;
   const d=full?`M${cx},${cy-R}A${R},${R} 0 1 1 ${cx-0.01},${cy-R}L${cx-0.01},${cy-r0}A${r0},${r0} 0 1 0 ${cx},${cy-r0}Z`:`M${pt(ang,R)}A${R},${R} 0 ${big} 1 ${pt(a2,R)}L${pt(a2,r0)}A${r0},${r0} 0 ${big} 0 ${pt(ang,r0)}Z`;ang=a2;
   return `<path d="${d}" class="mk s${i+1}" data-tip="${chartEsc(x.l+'：'+chartFmt(x.v)+u+'（'+Math.round(x.v/total*100)+'%）')}" tabindex="0"/>`;}).join('');
  svg=`<svg viewBox="0 0 240 240" class="md-chart-pie" role="img" aria-label="${chartEsc(meta.title||'圓餅圖')}">${arcs}<text x="${cx}" y="${cy-4}" class="pie-total">${chartFmt(total===1&&!vals.length?0:total)}</text><text x="${cx}" y="${cy+16}" class="pie-sub">${chartEsc(meta.unit||'合計')}</text></svg>`;
  const legend='<ul class="md-chart-legend pie">'+items.map((x,i)=>`<li><i class="sw s${i+1}"></i><span>${chartEsc(x.l)}</span><b>${chartFmt(x.v)}${chartEsc(u)}</b><small>${Math.round(x.v/total*100)}%</small></li>`).join('')+'</ul>';
  return chartWrap(meta,c,'<div class="md-chart-pierow">'+svg+legend+'</div>');}
 return chartWrap(meta,c,'<div class="cv-w">'+chartAxes(c,480,tip)+'</div><div class="cv-n">'+chartAxes(c,320,tip)+'</div>');
}
function chartAxes(c,W,tip){const {meta,labels,series}=c,cut=W<400?7:10;let svg='';
 const all=series.flatMap(s=>s.values).filter(Number.isFinite),line0=meta.type==="line",ticks=line0?niceTicks(Math.min(...all),Math.max(...all),4):niceTicks(Math.min(0,...all),Math.max(0,...all)),lo=ticks[0],hi=ticks[ticks.length-1];
 if(meta.type==='hbar'){
  const lw=Math.min(150,12+Math.max(...labels.map(l=>chartShort(l,cut).length))*13),band=series.length>1?16*series.length+14:30,H=labels.length*band+34,x0=lw,x1=W-16,sx=v=>x0+(v-lo)/(hi-lo)*(x1-x0),zero=sx(0);
  svg+=ticks.map(t=>`<line x1="${sx(t)}" x2="${sx(t)}" y1="6" y2="${H-26}" class="grid${t===0?' zero':''}"/><text x="${sx(t)}" y="${H-8}" class="tick" text-anchor="middle">${chartFmt(t)}</text>`).join('');
  const bh=Math.min(22,(band-10)/series.length-2);
  labels.forEach((l,i)=>{const y=8+i*band;svg+=`<text x="${x0-8}" y="${y+band/2}" class="lab" text-anchor="end" dominant-baseline="middle">${chartEsc(chartShort(l,cut))}<title>${chartEsc(l)}</title></text>`;
   series.forEach((s,k)=>{const v=s.values[i];if(!Number.isFinite(v))return;const by=y+(band-10-series.length*(bh+2))/2+k*(bh+2)+3;
    svg+=`<path d="${barPath(by,zero,bh,sx(v),4,true)}" class="mk s${k+1}" data-tip="${tip(l,s.name,v)}" tabindex="0"/>`;
    if(series.length===1)svg+=`<text x="${sx(v)+(v>=0?6:-6)}" y="${by+bh/2}" class="val" text-anchor="${v>=0?'start':'end'}" dominant-baseline="middle">${chartFmt(v)}</text>`;});});
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${chartEsc(meta.title||'橫條圖')}">${svg}</svg>`;}
 const x0=46,x1=W-12,band=(x1-x0)/labels.length,rot=labels.some(l=>Math.min(l.length,6)*13>band-4),H=rot?300:270,y0=14,y1=H-(rot?72:34),sy=v=>y1-(v-lo)/(hi-lo)*(y1-y0),zero=sy(0);
 svg+=ticks.map(t=>`<line x1="${x0}" x2="${x1}" y1="${sy(t)}" y2="${sy(t)}" class="grid${t===0?' zero':''}"/><text x="${x0-6}" y="${sy(t)}" class="tick" text-anchor="end" dominant-baseline="middle">${chartFmt(t)}</text>`).join('');
 labels.forEach((l,i)=>{const cx=x0+band*(i+.5),t=chartEsc(chartShort(l,rot?8:6));svg+=rot?`<text transform="translate(${cx},${y1+10}) rotate(-40)" class="lab" text-anchor="end" dominant-baseline="middle">${t}<title>${chartEsc(l)}</title></text>`:`<text x="${cx}" y="${y1+18}" class="lab" text-anchor="middle">${t}<title>${chartEsc(l)}</title></text>`;});
 if(meta.type==='line'){
  series.forEach((s,k)=>{const pts=s.values.map((v,i)=>Number.isFinite(v)?[x0+band*(i+.5),sy(v)]:null);let d='',pen=false;pts.forEach(p=>{if(!p){pen=false;return;}d+=(pen?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1);pen=true;});
   svg+=`<path d="${d}" class="ln s${k+1}"/>`+pts.map((p,i)=>p?`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" class="dot s${k+1}"/><circle cx="${p[0]}" cy="${p[1]}" r="14" class="hit" data-tip="${tip(labels[i],s.name,s.values[i])}" tabindex="0"/>`:'').join('');
   if(series.length===1){const last=pts.map((p,i)=>[p,i]).filter(x=>x[0]).pop();if(last)svg+=`<text x="${last[0][0]}" y="${last[0][1]-12}" class="val" text-anchor="middle">${chartFmt(s.values[last[1]])}</text>`;}});}
 else{const inner=band*.72,bw=Math.max(4,inner/series.length-2);
  labels.forEach((l,i)=>series.forEach((s,k)=>{const v=s.values[i];if(!Number.isFinite(v))return;const bx=x0+band*i+(band-inner)/2+k*(bw+2);
   svg+=`<path d="${barPath(bx,zero,bw,sy(v),4)}" class="mk s${k+1}" data-tip="${tip(l,s.name,v)}" tabindex="0"/>`;
   if(series.length===1&&labels.length<=12)svg+=`<text x="${bx+bw/2}" y="${v>=0?sy(v)-6:sy(v)+14}" class="val" text-anchor="middle">${chartFmt(v)}</text>`;}));}
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${chartEsc(meta.title||'圖表')}">${svg}</svg>`;
}
function chartWrap(meta,c,body){
 const legend=c.series.length>1&&meta.type!=='pie'?'<ul class="md-chart-legend">'+c.series.map((s,k)=>`<li><i class="sw s${k+1}${meta.type==='line'?' line':''}"></i>${chartEsc(s.name)}</li>`).join('')+'</ul>':'';
 const table='<details class="md-chart-data"><summary>看數據表</summary><div class="md-table"><table><thead><tr><th>'+chartEsc(c.labelHead||'項目')+'</th>'+c.series.map(s=>'<th>'+chartEsc(s.name)+'</th>').join('')+'</tr></thead><tbody>'+c.labels.map((l,i)=>'<tr><td>'+chartEsc(l)+'</td>'+c.series.map(s=>'<td>'+chartFmt(s.values[i])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
 return '<figure class="md-chart">'+(meta.title?'<figcaption>'+chartEsc(meta.title)+(meta.unit?'<small>（單位：'+chartEsc(meta.unit)+'）</small>':'')+'</figcaption>':'')+legend+body+table+'</figure>';}
/* 滑過／點一下顯示數值 */
(function(){let tipEl=null;
 const show=(el,x,y)=>{if(!tipEl){tipEl=document.createElement('div');tipEl.className='md-chart-tip';document.body.appendChild(tipEl);}tipEl.textContent=el.dataset.tip;tipEl.hidden=false;
  const w=tipEl.offsetWidth;tipEl.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px';tipEl.style.top=Math.max(8,y-44)+'px';};
 const hide=()=>{if(tipEl)tipEl.hidden=true;};
 document.addEventListener('pointermove',e=>{const el=e.target.closest&&e.target.closest('.md-chart [data-tip]');if(el)show(el,e.clientX,e.clientY);else hide();});
 document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('.md-chart [data-tip]');if(el){const r=el.getBoundingClientRect();show(el,r.left+r.width/2,r.top);}});
 document.addEventListener('focusout',hide);document.addEventListener('scroll',hide,true);})();
