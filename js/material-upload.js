'use strict';
const MATERIAL_CATEGORIES=['檢定卷','檢測卷','課本','講義','學習單','習作','練習卷','考卷','解答','教案','聽力','影片','圖片','簡報','其他'];
const MATERIAL_SECTION_DEFAULT=['英文','數學','閱讀','PASSION','線上'];
function matCategories(){const l=data&&data.meta&&data.meta.materialCategories;return Array.isArray(l)&&l.length?l:MATERIAL_CATEGORIES;}
function matSubjects(){const l=data&&data.meta&&data.meta.materialSubjects;return Array.isArray(l)&&l.length?l:MATERIAL_SECTION_DEFAULT;}
function matUploadTarget(){return data&&data.meta&&data.meta.materialUploadTarget==='onedrive'?'onedrive':'google';}
let materialUploading=false,materialUploadIds=new WeakMap(),materialUploaded=new WeakSet();
function openMaterialUpload(){
 let d=$('materialUploadDialog');if(!d){d=document.createElement('dialog');d.id='materialUploadDialog';document.body.appendChild(d);d.addEventListener('cancel',e=>{if(materialUploading)e.preventDefault();});}
 if(materialUploading)return;
 const target=matUploadTarget(),odUrl=(data.meta.onedriveUploadUrl||'').trim();
 d.innerHTML='<form id="materialUploadForm"><h2>上傳教材</h2><p class="help">檔案存入你選的雲端位置，分類清單會同步到其他裝置。每份上限 8 MB，可一次選多份。</p><label class="material-file-picker">選擇檔案<input name="files" type="file" multiple required><span>PDF、Word、PowerPoint、圖片等教材檔案</span></label><div id="materialUploadFiles" aria-live="polite"></div><div class="formgrid"><label>儲存位置<select name="dest"><option value="google" '+(target==='google'?'selected':'')+'>Google 雲端硬碟</option><option value="onedrive" '+(target==='onedrive'?'selected':'')+'>OneDrive</option></select></label><label class="wide od-url-wrap" '+(target==='onedrive'?'':'hidden')+'>OneDrive 上傳網址（跟 Google 雲端網址同樣設定方式）<input name="odurl" placeholder="貼上 OneDrive 上傳用的服務網址" value="'+esc(odUrl)+'"></label><label>教材名稱（多份檔案沿用各自檔名）<input name="name" placeholder="留白會自動使用檔名"></label><label>教材分類 *<select name="category" required><option value="">請選擇分類</option>'+matCategories().map(c=>'<option '+(matCat===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>科目<select name="subject"><option value="">請選擇</option>'+[...new Set([...matSubjects(),...MAT_SUBJECTS])].map(c=>'<option '+(matSubject===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>適用班級'+classSelect('classId',matClass==='any'?'':matClass,true)+'</label><label>學段<select name="stage"><option value="">自動判斷／待確認</option>'+MATERIAL_STAGES.map(stage=>'<option '+(matStage===stage?'selected':'')+'>'+stage+'</option>').join('')+'</select></label><label>年級<select name="grade"><option value="">通用／未指定</option>'+Array.from({length:9},(_,i)=>'<option '+(matGrade===(i+1)+'年級'?'selected':'')+'>'+(i+1)+'年級</option>').join('')+'</select></label><label>英文冊別<input name="bookLevel" placeholder="例如 初上、初下" value="'+esc(matBook)+'"></label><label>卷別<input name="paperNumber" placeholder="例如 1卷、2卷" value="'+esc(matPaper)+'"></label><label>單元／課次<input name="unit" placeholder="例如 L10、5-1"></label><label class="wide">標籤<input name="tags" placeholder="例如：單字、期中、補救"></label><label class="wide">備註<textarea name="note" rows="2"></textarea></label></div><p id="materialUploadStatus" role="status" aria-live="polite"></p><div class="dialogfoot"><button type="button" data-material-upload-close>取消</button><button type="submit" class="primary">上傳並加入教材庫</button></div></form>';
 d.showModal();
}
function readMaterialFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('無法讀取檔案：'+file.name));r.readAsDataURL(file);});}
async function materialUploadRequest(endpoint,body,dest){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),120000);
 try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal:ctl.signal,redirect:'follow'});
  if(!response.ok)throw Error('上傳服務回傳 HTTP '+response.status);
  let result;try{result=await response.json();}catch{throw Error(dest==='onedrive'?'請確認 OneDrive 上傳服務網址可存取、回應為 JSON。':'請確認 GAS 網頁應用程式可存取，並已完成授權。');}
  if(!result.ok)throw Error(result.error||'上傳失敗');
  if(!result.material||!Array.isArray(result.attachments)||!result.ver)throw Error(dest==='onedrive'?'此網址回傳的格式不符合教材上傳規格（需要 material、attachments、ver）。':'請更新 Code.gs 並部署新版本，才能上傳教材。');
  return result;
 }finally{clearTimeout(timer);}
}
async function submitMaterialUpload(form){
 if(materialUploading)return;
 const status=$('materialUploadStatus'),files=[...form.elements.namedItem('files').files],get=k=>form.elements.namedItem(k).value.trim();
 if(!files.length)return;
 if(files.some(f=>!f.size||f.size>8388608)){status.textContent='檔案不可為空，每份上限 8 MB。大型檔案可先放上 Drive，再使用「新增連結」。';return;}
 const dest=get('dest')||'google';
 if(dest==='onedrive'){const od=get('odurl');if(!/^https:/.test(od)){status.textContent='請先貼上 OneDrive 上傳網址（跟 Google 雲端網址一樣的設定方式）。';return;}data.meta.materialUploadTarget='onedrive';data.meta.onedriveUploadUrl=od;}
 else{data.meta.materialUploadTarget='google';if(typeof cloud==='undefined'||!cloud.url){status.textContent='請先在資料匯入匯出設定 Google 雲端同步網址。';return;}}
 const endpoint=dest==='onedrive'?get('odurl'):cloud.url;
 if(cloud.busy){status.textContent='雲端正在同步，請稍候再按上傳。';return;}
 const info=Object.fromEntries(['name','category','subject','classId','stage','grade','bookLevel','paperNumber','unit','tags','note'].map(k=>[k,get(k)]));
 if(!info.category){status.textContent='請先選擇教材分類。';return;}
 materialUploading=true;[...form.elements].forEach(el=>el.disabled=true);let uploaded=0;
 // 暫停背景同步，避免教材索引在上傳途中被舊版本覆寫。
 cloud.busy=true;
 try{
  status.textContent='確認雲端上傳服務…';
  const check=new URL(endpoint);check.searchParams.set('action','materialsStatus');
  try{const response=await fetch(check.href,{cache:'no-store',signal:AbortSignal.timeout(60000)}),cap=await response.json();
   if(!cap.ok||!cap.upload)throw Error('尚未支援');}
  catch(err){if(dest==='google')throw Error('目前 GAS 尚未支援檔案上傳。請更新 Code.gs 並部署「新版本」。');}
  for(let i=0;i<files.length;i++){
   const file=files[i];if(materialUploaded.has(file)){uploaded++;continue;}
   status.textContent='正在上傳 '+(i+1)+' / '+files.length+'：'+file.name+'，請保持視窗開啟。';
   if(!materialUploadIds.has(file))materialUploadIds.set(file,uid());
   const result=await materialUploadRequest(endpoint,{action:'uploadMaterial',requestId:materialUploadIds.get(file),fileName:file.name,mimeType:file.type,base64:await readMaterialFile(file),material:{...info,name:files.length===1&&info.name?info.name:file.name}},dest);
   data.attachments=cloudMerge(data.attachments,result.attachments);
   cloud.ver.attachments=result.ver;cloud.synced.attachments=cloudHash(JSON.stringify(result.attachments));cloudSaveSynced();
   materialUploaded.add(file);uploaded++;changed();
  }
  $('materialUploadDialog').close();render();toast('已上傳 '+uploaded+' 份教材，並儲存到雲端。');
 }catch(err){status.textContent=(err.name==='AbortError'||err.name==='TimeoutError'?'連線逾時，可再次按上傳重試。':err.message)+' 已完成 '+uploaded+' / '+files.length+' 份；完成的檔案不會重複上傳。';}
 finally{materialUploading=false;cloud.busy=false;[...form.elements].forEach(el=>el.disabled=false);if(typeof cloudSchedule==='function')cloudSchedule();}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.hasAttribute('data-material-upload'))openMaterialUpload();if(b?.hasAttribute('data-material-upload-close')&&!materialUploading)$('materialUploadDialog').close();if(b?.hasAttribute('data-mat-cats'))matCatsDlg();});
document.addEventListener('submit',e=>{if(e.target.id==='materialUploadForm'){e.preventDefault();submitMaterialUpload(e.target);}});
/* 教材分類管理：科目頁籤＋類型，新增、改名、刪除；可選擇連動更新已使用的教材 */
function matCatsDlg(){let d=$('matCatsDlg');if(!d){d=document.createElement('dialog');d.id='matCatsDlg';document.body.appendChild(d);}
 const usedS=[...new Set(data.attachments.map(a=>a.subject||'其他'))],subs=[...new Set([...matSubjects(),...usedS])];
 const usedC=[...new Set(data.attachments.map(a=>a.category||'其他'))],cats=[...new Set([...matCategories(),...usedC])];
 d._subs=subs;d._cats=cats;
 const row=(kind,c)=>{const n=data.attachments.filter(a=>((kind==='subject'?a.subject:a.category)||'其他')===c).length;return '<div class="matcat-row" data-kind="'+kind+'"><input value="'+esc(c)+'" data-old="'+esc(c)+'">'+(n?'<span class="matcat-n">'+n+' 份</span>':'')+'<button type="button" class="danger matcat-del" aria-label="刪除 '+esc(c)+'">✕</button></div>';};
 d.innerHTML='<h2>管理教材分類</h2><p class="help">清單會同步到其他裝置，右邊數字是使用中的教材數。改名、刪除時可選擇是否連動更新教材。</p><h3 class="matcat-h">科目頁籤（列表上方的分頁按鈕）</h3><div class="matcat-rows" data-kind="subject">'+subs.map(c=>row('subject',c)).join('')+'</div><div class="matcat-add"><input placeholder="新增科目，例：國語"><button type="button" data-cat-add>＋ 加入</button></div><h3 class="matcat-h">類型（檢定卷、講義、考卷…）</h3><div class="matcat-rows" data-kind="category">'+cats.map(c=>row('category',c)).join('')+'</div><div class="matcat-add"><input placeholder="新增類型名稱"><button type="button" data-cat-add>＋ 加入</button></div><div class="dialogfoot"><button type="button" data-cat-close>關閉</button><button type="button" class="primary" data-cat-save>儲存分類</button></div>';
 d.showModal();}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-cat-add]');if(add){const wrap=add.closest('.matcat-add'),inp=wrap.querySelector('input'),box=wrap.previousElementSibling,v=inp.value.trim();if(!v)return;const row=document.createElement('div');row.className='matcat-row';row.dataset.kind=box.dataset.kind;row.innerHTML='<input value="'+esc(v)+'" data-old=""><button type="button" class="danger matcat-del" aria-label="刪除">✕</button>';box.appendChild(row);inp.value='';inp.focus();return;}
 const del=e.target.closest('.matcat-del');if(del){del.closest('.matcat-row').remove();return;}
 if(e.target.closest('[data-cat-close]')){$('matCatsDlg').close();return;}
 if(e.target.closest('[data-cat-save]')){const d=$('matCatsDlg');
  const apply=kind=>{const rows=[...d.querySelectorAll('.matcat-row[data-kind="'+kind+'"] input')],next=[...new Set(rows.map(i=>i.value.trim()).filter(Boolean))];
   const renames=rows.map(i=>[i.dataset.old,i.value.trim()]).filter(([o,n])=>o&&o!==n);
   const removed=((kind==='subject'?d._subs:d._cats)||[]).filter(c=>!next.includes(c)&&!renames.some(([o])=>o===c));
   const usedRen=renames.map(([o,n])=>({o,n,c:data.attachments.filter(a=>(a[kind]||'其他')===o).length})).filter(x=>x.c);
   const usedDel=removed.map(c=>({c,n:data.attachments.filter(a=>(a[kind]||'其他')===c).length})).filter(x=>x.n);
   if(usedDel.length&&!next.includes('其他'))next.push('其他');
   if(kind==='subject')data.meta.materialSubjects=next;else data.meta.materialCategories=next;
   if(usedRen.length&&confirm(usedRen.map(x=>'「'+x.o+'」→「'+x.n+'」有 '+x.c+' 份教材').join('\n')+'\n\n要把這些教材的'+(kind==='subject'?'科目':'類型')+'一起更新嗎？'))usedRen.forEach(x=>data.attachments.forEach(a=>{if((a[kind]||'其他')===x.o)a[kind]=x.n;}));
   if(usedDel.length&&confirm(usedDel.map(x=>'「'+x.c+'」有 '+x.n+' 份教材使用中').join('\n')+'\n\n確定＝把這些教材改歸「其他」\n取消＝保留原名稱（篩選仍找得到）'))usedDel.forEach(x=>data.attachments.forEach(a=>{if((a[kind]||'其他')===x.c)a[kind]='其他';}));};
  apply('subject');apply('category');
  changed();d.close();render();toast('分類清單已更新。');return;}
});
document.addEventListener('change',e=>{if(e.target.form?.id==='materialUploadForm'&&e.target.name==='dest'){e.target.form.querySelector('.od-url-wrap').hidden=e.target.value!=='onedrive';if(data?.meta)data.meta.materialUploadTarget=e.target.value;return;}
 if(e.target.form?.id!=='materialUploadForm'||e.target.name!=='files')return;const files=[...e.target.files];$('materialUploadFiles').textContent=files.map(f=>f.name+'（'+(f.size/1048576).toFixed(2)+' MB）').join('、');const form=e.target.form;if(files.length===1){const hints=materialSuggestions(files[0].name);Object.entries(hints).forEach(([k,v])=>{const field=form.elements.namedItem(k);if(field&&!field.value)field.value=v;});}});
