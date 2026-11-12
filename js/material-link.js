'use strict';
let materialLookupTimer=null,materialLookupId=0;
const materialTitleCache=new Map(),materialTitlePending=new Map();
async function fetchMaterialTitle(endpoint,onRetry=()=>{}){
 if(materialTitleCache.has(endpoint))return materialTitleCache.get(endpoint);
 if(materialTitlePending.has(endpoint))return materialTitlePending.get(endpoint);
 const request=(async()=>{
  for(let attempt=0;attempt<2;attempt++){
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),60000);
   try{
    const response=await fetch(endpoint,{signal:ctl.signal,redirect:'follow',cache:'no-store'});
    if(!response.ok)throw Error('連線失敗（HTTP '+response.status+'），請稍後重試。');
    let result;try{result=await response.json();}catch{throw Error('GAS 沒有回傳資料。請確認部署網址為 /exec、存取權為「所有人」，並完成授權。');}
    if(!result.ok)throw Error(result.error||'無法讀取教材名稱');
    if(!result.title)throw Error('目前 GAS 尚未支援名稱讀取。請更新 Code.gs，再部署「新版本」。');
    materialTitleCache.set(endpoint,result.title);return result.title;
   }catch(err){if(attempt===0&&(err.name==='AbortError'||err instanceof TypeError)){onRetry();continue;}throw err;}
   finally{clearTimeout(timer);}
  }
 })();materialTitlePending.set(endpoint,request);
 try{return await request;}finally{materialTitlePending.delete(endpoint);}
}
function materialSuggestions(name){
 const s=String(name||''),result={};
 if(/英文|單字|Workbook|phonics|English/i.test(s))result.subject='英文';
 else if(/數學|math|非數/i.test(s))result.subject='數學';
 else if(/閱讀|繪本|橋梁|橋樑|KIST/.test(s))result.subject='閱讀';
 else if(/國語|作文|生字/.test(s))result.subject='國語';
 if(/檢定/.test(s))result.category='檢定卷';
 else if(/檢測/.test(s))result.category='檢測卷';
 else if(/課本|教科書/.test(s))result.category='課本';
 else if(/評量|考卷|試卷|測驗/.test(s))result.category='考卷';
 else if(/練習卷/.test(s))result.category='練習卷';
 else if(/訂正|解答|答案/.test(s))result.category='解答';
 else if(/Workbook|課習|習作/i.test(s))result.category='習作';
 else if(/學習單/.test(s))result.category='學習單';
 else if(/簡報|投影片/.test(s))result.category='簡報';
 else if(/教案/.test(s))result.category='教案';
 else if(/講義/.test(s))result.category='講義';
 const unit=s.match(/\bL\s*\d+\b|\b\d{1,2}-\d{1,2}\b/i);if(unit)result.unit=unit[0].replace(/\s/g,'').toUpperCase();
 const grade=s.match(/([1-9一二三四五六七八九])年級/);if(grade)result.grade=String('一二三四五六七八九'.indexOf(grade[1])+1||grade[1])+'年級';
 return result;
}
function prepareMaterialEditor(){
 const f=$('editForm'),url=f.elements.namedItem('url');if(!url)return;const stage=f.elements.namedItem('stage');if(stage&&!stage.value){const row=data.attachments.find(m=>m.id===editId);stage.value=row?materialStage(row):(typeof matStage!=='undefined'?matStage:'');}
 const box=document.createElement('div');box.className='wide material-link-tools';
 box.innerHTML='<button type="button" data-material-title>讀取連結名稱</button><button type="button" data-material-suggest>依名稱建議分類</button><span id="materialLinkStatus" role="status" aria-live="polite">貼上網址後會自動讀取名稱；原有名稱會保留。</span>';
 url.closest('label').after(box);const parts=englishMaterialParts(data.attachments.find(m=>m.id===editId)||{});['bookLevel','paperNumber'].forEach((k,i)=>{const el=f.elements.namedItem(k);if(el&&!el.value){const value=i===0?parts.book:parts.paper;el.value=i===0?(matBook||(!value.startsWith('待確認')?value:'')):(matPaper||(value!=='未標卷別'?value:''));}});url.placeholder='貼上 Google 雲端檔案或教材網頁連結';
 ['subject','category','grade','unit'].forEach(key=>{const field=f.elements.namedItem(key);if(field&&editId==null&&!field.value){const value=key==='subject'?matSubject:key==='category'?matCat:'';if(value)field.value=value;}});
 if(!editId&&matClass&&matClass!=='any')f.elements.namedItem('classId').value=matClass;
}
function suggestMaterialClassification(){
 const f=$('editForm'),hints=materialSuggestions(f.elements.namedItem('name').value);let count=0;
 Object.entries(hints).forEach(([k,v])=>{const el=f.elements.namedItem(k);if(el&&(!el.value||el.value==='其他')){el.value=v;count++;}});
 const status=$('materialLinkStatus');if(status)status.textContent=count?'已帶入 '+count+' 項分類建議，請確認後儲存。':'可自行選擇科目、類型，並加上年級、單元及標籤。';
}
async function lookupMaterialTitle(force=false){
 const f=$('editForm'),field=f.elements.namedItem('url'),name=f.elements.namedItem('name'),status=$('materialLinkStatus');
 const url=field?.value.trim();if(!url||!status)return;
 if(!materialUrl(url)||!url.startsWith('https://')){status.textContent='請貼上完整的 HTTPS 教材連結。';return;}
 if(name.value.trim()&&!force){status.textContent='已保留教材名稱；若要更新，請按「讀取連結名稱」。';return;}
 if(typeof cloud==='undefined'||!cloud.url){status.textContent='請先設定雲端同步網址，或手動輸入教材名稱。';return;}
 const id=++materialLookupId,originalName=name.value;
 status.textContent='正在讀取教材名稱…首次連線可能需要約一分鐘。';
 try{
  const endpoint=new URL(cloud.url);endpoint.searchParams.set('action','materialMeta');endpoint.searchParams.set('url',url);
  const title=await fetchMaterialTitle(endpoint.href,()=>{if(id===materialLookupId&&status.isConnected)status.textContent='連線較慢，正在自動重試一次…';});
  if(id!==materialLookupId||!status.isConnected||field.value.trim()!==url||name.value!==originalName)return;
  name.value=title;status.textContent='已帶入名稱，你仍可修改。';suggestMaterialClassification();
 }catch(err){if(id===materialLookupId&&status.isConnected)status.textContent=err.name==='AbortError'?'兩次連線皆逾時。請確認 GAS 已部署新版本，且部署帳號能開啟這份雲端檔案；目前名稱已保留。':err instanceof TypeError?'無法連到 GAS。請檢查網路與部署存取權（所有人），目前名稱已保留。':err.message;}
}
document.addEventListener('input',e=>{
 if(page!=='教材庫'||!$('editor').open||e.target.name!=='url')return;
 ++materialLookupId;clearTimeout(materialLookupTimer);materialLookupTimer=setTimeout(()=>lookupMaterialTitle(),700);
});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.hasAttribute('data-material-title'))lookupMaterialTitle(true);if(b?.hasAttribute('data-material-suggest'))suggestMaterialClassification();});
function materialClassificationPlan(){return data.attachments.map(row=>({row,hints:Object.fromEntries(Object.entries(materialSuggestions(row.name)).filter(([k])=>!row[k]||row[k]==='其他'))})).filter(x=>Object.keys(x.hints).length);}
function previewMaterialClassification(){
 const plan=materialClassificationPlan();if(!plan.length){toast('目前沒有可自動辨識的未分類教材，可在編輯中手動指定。');return;}
 let d=$('materialClassifyDialog');if(!d){d=document.createElement('dialog');d.id='materialClassifyDialog';document.body.appendChild(d);}
 const labels={subject:'科目',category:'類型',grade:'年級',unit:'單元'};
 d.innerHTML='<h2>整理未分類教材</h2><p>依教材名稱建議分類，只補上空白或「其他」，請確認後套用。</p><div class="tablewrap" style="max-height:50vh;overflow:auto"><table><thead><tr><th>教材</th><th>建議分類</th></tr></thead><tbody>'+plan.map(({row,hints})=>'<tr><td>'+esc(row.name)+'</td><td>'+esc(Object.entries(hints).map(([k,v])=>labels[k]+'：'+v).join('／'))+'</td></tr>').join('')+'</tbody></table></div><div class="dialogfoot"><button data-material-classify-cancel>取消</button><button class="primary" data-material-classify-apply>套用 '+plan.length+' 份教材的建議</button></div>';d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-material-classify'))previewMaterialClassification();if(b.hasAttribute('data-material-classify-cancel'))$('materialClassifyDialog').close();if(b.hasAttribute('data-material-classify-apply')){const plan=materialClassificationPlan();plan.forEach(({row,hints})=>Object.assign(row,hints));changed();$('materialClassifyDialog').close();render();toast('已整理 '+plan.length+' 份教材。');}});
