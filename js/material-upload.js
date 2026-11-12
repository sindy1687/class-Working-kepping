'use strict';
const MATERIAL_CATEGORIES=['檢定卷','檢測卷','課本','講義','學習單','習作','練習卷','考卷','解答','教案','聽力','影片','圖片','簡報','其他'];
let materialUploading=false,materialUploadIds=new WeakMap(),materialUploaded=new WeakSet();
function openMaterialUpload(){
 let d=$('materialUploadDialog');if(!d){d=document.createElement('dialog');d.id='materialUploadDialog';document.body.appendChild(d);d.addEventListener('cancel',e=>{if(materialUploading)e.preventDefault();});}
 if(materialUploading)return;
 d.innerHTML='<form id="materialUploadForm"><h2>上傳教材</h2><p class="help">檔案存入 Google 雲端硬碟，分類清單會同步到其他裝置。每份上限 8 MB，可一次選多份。</p><label class="material-file-picker">選擇檔案<input name="files" type="file" multiple required><span>PDF、Word、PowerPoint、圖片等教材檔案</span></label><div id="materialUploadFiles" aria-live="polite"></div><div class="formgrid"><label>教材名稱（多份檔案沿用各自檔名）<input name="name" placeholder="留白會自動使用檔名"></label><label>教材分類 *<select name="category" required><option value="">請選擇分類</option>'+MATERIAL_CATEGORIES.map(c=>'<option '+(matCat===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>科目<select name="subject"><option value="">請選擇</option>'+MAT_SUBJECTS.map(c=>'<option '+(matSubject===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>適用班級'+classSelect('classId',matClass==='any'?'':matClass,true)+'</label><label>學段<select name="stage"><option value="">自動判斷／待確認</option>'+MATERIAL_STAGES.map(stage=>'<option '+(matStage===stage?'selected':'')+'>'+stage+'</option>').join('')+'</select></label><label>年級<select name="grade"><option value="">通用／未指定</option>'+Array.from({length:9},(_,i)=>'<option '+(matGrade===(i+1)+'年級'?'selected':'')+'>'+(i+1)+'年級</option>').join('')+'</select></label><label>英文冊別<input name="bookLevel" placeholder="例如 初上、初下" value="'+esc(matBook)+'"></label><label>卷別<input name="paperNumber" placeholder="例如 1卷、2卷" value="'+esc(matPaper)+'"></label><label>單元／課次<input name="unit" placeholder="例如 L10、5-1"></label><label class="wide">標籤<input name="tags" placeholder="例如：單字、期中、補救"></label><label class="wide">備註<textarea name="note" rows="2"></textarea></label></div><p id="materialUploadStatus" role="status" aria-live="polite"></p><div class="dialogfoot"><button type="button" data-material-upload-close>取消</button><button type="submit" class="primary">上傳並加入教材庫</button></div></form>';
 d.showModal();
}
function readMaterialFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('無法讀取檔案：'+file.name));r.readAsDataURL(file);});}
async function materialUploadRequest(body){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),120000);
 try{
  const response=await fetch(cloud.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal:ctl.signal,redirect:'follow'});
  if(!response.ok)throw Error('上傳服務回傳 HTTP '+response.status);
  let result;try{result=await response.json();}catch{throw Error('請確認 GAS 網頁應用程式可存取，並已完成授權。');}
  if(!result.ok)throw Error(result.error||'上傳失敗');
  if(!result.material||!Array.isArray(result.attachments)||!result.ver)throw Error('請更新 Code.gs 並部署新版本，才能上傳教材。');
  return result;
 }finally{clearTimeout(timer);}
}
async function submitMaterialUpload(form){
 if(materialUploading)return;
 const status=$('materialUploadStatus'),files=[...form.elements.namedItem('files').files],get=k=>form.elements.namedItem(k).value.trim();
 if(!files.length)return;
 if(files.some(f=>!f.size||f.size>8388608)){status.textContent='檔案不可為空，每份上限 8 MB。大型檔案可先放上 Drive，再使用「新增連結」。';return;}
 if(typeof cloud==='undefined'||!cloud.url){status.textContent='請先在資料匯入匯出設定 Google 雲端同步網址。';return;}
 if(cloud.busy){status.textContent='雲端正在同步，請稍候再按上傳。';return;}
 const info=Object.fromEntries(['name','category','subject','classId','stage','grade','bookLevel','paperNumber','unit','tags','note'].map(k=>[k,get(k)]));
 if(!info.category){status.textContent='請先選擇教材分類。';return;}
 materialUploading=true;[...form.elements].forEach(el=>el.disabled=true);let uploaded=0;
 // 暫停背景同步，避免教材索引在上傳途中被舊版本覆寫。
 cloud.busy=true;
 try{
  status.textContent='確認雲端上傳服務…';
  const check=new URL(cloud.url);check.searchParams.set('action','materialsStatus');
  const response=await fetch(check.href,{cache:'no-store',signal:AbortSignal.timeout(60000)}),cap=await response.json();
  if(!cap.ok||!cap.upload)throw Error('目前 GAS 尚未支援檔案上傳。請更新 Code.gs 並部署「新版本」。');
  for(let i=0;i<files.length;i++){
   const file=files[i];if(materialUploaded.has(file)){uploaded++;continue;}
   status.textContent='正在上傳 '+(i+1)+' / '+files.length+'：'+file.name+'，請保持視窗開啟。';
   if(!materialUploadIds.has(file))materialUploadIds.set(file,uid());
   const result=await materialUploadRequest({action:'uploadMaterial',requestId:materialUploadIds.get(file),fileName:file.name,mimeType:file.type,base64:await readMaterialFile(file),material:{...info,name:files.length===1&&info.name?info.name:file.name}});
   data.attachments=cloudMerge(data.attachments,result.attachments);
   cloud.ver.attachments=result.ver;cloud.synced.attachments=cloudHash(JSON.stringify(result.attachments));cloudSaveSynced();
   materialUploaded.add(file);uploaded++;changed();
  }
  $('materialUploadDialog').close();render();toast('已上傳 '+uploaded+' 份教材，並儲存到雲端。');
 }catch(err){status.textContent=(err.name==='AbortError'||err.name==='TimeoutError'?'連線逾時，可再次按上傳重試。':err.message)+' 已完成 '+uploaded+' / '+files.length+' 份；完成的檔案不會重複上傳。';}
 finally{materialUploading=false;cloud.busy=false;[...form.elements].forEach(el=>el.disabled=false);if(typeof cloudSchedule==='function')cloudSchedule();}
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.hasAttribute('data-material-upload'))openMaterialUpload();if(b?.hasAttribute('data-material-upload-close')&&!materialUploading)$('materialUploadDialog').close();});
document.addEventListener('submit',e=>{if(e.target.id==='materialUploadForm'){e.preventDefault();submitMaterialUpload(e.target);}});
document.addEventListener('change',e=>{if(e.target.form?.id!=='materialUploadForm'||e.target.name!=='files')return;const files=[...e.target.files];$('materialUploadFiles').textContent=files.map(f=>f.name+'（'+(f.size/1048576).toFixed(2)+' MB）').join('、');const form=e.target.form;if(files.length===1){const hints=materialSuggestions(files[0].name);Object.entries(hints).forEach(([k,v])=>{const field=form.elements.namedItem(k);if(field&&!field.value)field.value=v;});}});
