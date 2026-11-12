'use strict';
/* 大容量本機儲存：localStorage（約 5 MB）放不下時，改存瀏覽器的 IndexedDB（通常數百 MB 以上）。
   旗標 sindy-local-cache-stale = localStorage 那份是舊的；這時以 IndexedDB 為準。 */
const BIG_DB='sindy-classroom-big',BIG_OS='kv',BIG_KEY='data',BIG_STALE_KEY='sindy-local-cache-stale';
const bigStore={json:null,savedAt:0,loaded:false,ok:typeof indexedDB!=='undefined',timer:null,pending:null};
function bigOpen(ver){return new Promise((res,rej)=>{if(!bigStore.ok)return rej(Error('這個瀏覽器不支援 IndexedDB'));const r=ver?indexedDB.open(BIG_DB,ver):indexedDB.open(BIG_DB);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(BIG_OS))r.result.createObjectStore(BIG_OS);};
 r.onsuccess=()=>{const db=r.result;if(db.objectStoreNames.contains(BIG_OS))return res(db);const v=db.version+1;db.close();bigOpen(v).then(res,rej);}; /* 資料表不見了就自動補建 */r.onerror=()=>rej(r.error||Error('無法開啟 IndexedDB'));r.onblocked=()=>rej(Error('IndexedDB 被其他分頁占用'));});}
async function bigTx(mode,fn){const db=await bigOpen();try{return await new Promise((res,rej)=>{const tx=db.transaction(BIG_OS,mode),st=tx.objectStore(BIG_OS);let out;const q=fn(st);if(q)q.onsuccess=()=>{out=q.result;};tx.oncomplete=()=>res(out);tx.onerror=tx.onabort=()=>rej(tx.error||Error('IndexedDB 寫入失敗'));});}finally{db.close();}}
function bigLocalStale(){try{return localStorage.getItem(BIG_STALE_KEY)==='1';}catch{return true;}}
const bigWasStale=bigLocalStale(); // 在 app.js 開機儲存之前記下
/* 寫入（合併 300ms 內的連續儲存）；開機讀取完成前不寫，避免舊資料蓋掉新資料 */
function bigSave(json){if(!bigStore.ok)return false;if(!bigStore.loaded){bigStore.pending=json;return true;}bigStore.json=json;bigStore.savedAt=Date.now();
 clearTimeout(bigStore.timer);bigStore.timer=setTimeout(bigFlush,300);return true;}
async function bigFlush(){clearTimeout(bigStore.timer);const json=bigStore.json;if(json==null)return;
 try{await bigTx('readwrite',st=>st.put({json,savedAt:bigStore.savedAt},BIG_KEY));}
 catch(e){if(typeof status==='function')status('儲存失敗：'+e.message,true);if(typeof showBanner==='function')showBanner('瀏覽器儲存空間不足，資料只存在雲端或這個分頁。請立即到「資料匯入匯出」匯出 JSON 備份。');}}
function bigClear(){if(!bigStore.ok||bigStore.json==null)return;bigStore.json=null;clearTimeout(bigStore.timer);bigTx('readwrite',st=>st.delete(BIG_KEY)).catch(()=>{});}
/* 本機目前「有效」那份資料（雲端同步比對用） */
function bigCurrentRaw(){if(bigLocalStale()&&bigStore.json!=null)return bigStore.json;try{return localStorage.getItem(STORE);}catch{return null;}}
/* 開機：localStorage 是舊的 → 讀 IndexedDB 那份，換上後重畫；雲端同步會等這一步 */
const bigBoot=new Promise(r=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>r(),{once:true}):setTimeout(r,0)).then(async()=>{
 let applied=false;try{if(bigWasStale&&bigStore.ok){const rec=await bigTx('readonly',st=>st.get(BIG_KEY));
   if(rec&&typeof rec.json==='string'){bigStore.json=rec.json;bigStore.savedAt=rec.savedAt||0;
    if(typeof data!=='undefined'&&typeof validateImport==='function'){try{data=validateImport(JSON.parse(rec.json));if(typeof applyAnnualGradePromotion==='function')applyAnnualGradePromotion(data);applied=true;if(typeof render==='function')render();if(typeof status==='function')status('✓ 已載入本機資料（大容量空間）');}catch(e){if(typeof showBanner==='function')showBanner('大容量空間的資料無法讀取：'+esc(e.message)+'。已改用較舊的本機資料，請從雲端或備份還原。');}}}}}
 catch{}
 finally{const pending=bigStore.pending;bigStore.loaded=true;bigStore.pending=null;
  if(applied){if(typeof persist==='function')persist();} // 把較新的資料存回（一般空間放不下就留在大容量空間）
  else if(!bigWasStale&&pending!=null){bigStore.json=pending;bigStore.savedAt=Date.now();bigFlush();} // 開機時才剛滿：那份就是最新資料
 }
});

/* ---------- 「資料匯入匯出」的儲存空間面板 ---------- */
const LS_LIMIT=5*1024*1024;
function bytesText(n){return n>=1048576?(n/1048576).toFixed(n>=10485760?0:1)+' MB':n>=1024?Math.round(n/1024)+' KB':n+' B';}
function lsEntries(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),v=localStorage.getItem(k)||'';out.push({k,size:k.length+v.length});}}catch{}return out.sort((a,b)=>b.size-a.size);}
const LS_LABELS={'sindy-classroom-v1':'課輔班資料','sindy-library-books-v1':'博幼圖書館書目快取（可重新下載）','sindy-cloud-synced-v1':'雲端同步紀錄','sindy-classroom-nav-v1':'選單狀態','sindy-cloud-url':'雲端網址','sindy-classroom-page':'上次開啟的頁面','sindy-local-cache-stale':'大容量空間使用中'};
function lsLabel(k){return LS_LABELS[k]||(k.includes('-damaged-')?'損壞資料副本（'+new Date(+k.split('-').pop()||0).toLocaleDateString('zh-TW')+'）':k.startsWith('sindy-')?k:'其他網頁的資料：'+k);}
function dataSections(){const out=[];try{const label=k=>{const m=Object.entries(modules).find(([,v])=>v.key===k);return m?m[0]:k;};
 for(const [k,v] of Object.entries(data)){if(k==='meta'&&v&&typeof v==='object'){for(const [mk,mv] of Object.entries(v))out.push({k:(typeof CLOUD_EXTRA_LABELS!=='undefined'&&CLOUD_EXTRA_LABELS['meta.'+mk])||'設定 '+mk,size:JSON.stringify(mv??null).length});}
  else out.push({k:label(k),size:JSON.stringify(v??null).length});}}catch{}return out.sort((a,b)=>b.size-a.size);}
function storagePanel(){
 const ls=lsEntries(),used=ls.reduce((a,x)=>a+x.size,0),big=bigLocalStale(),pct=Math.min(100,Math.round(used/LS_LIMIT*100));
 const secs=dataSections(),total=secs.reduce((a,x)=>a+x.size,0)||1;
 const clearable=ls.filter(x=>x.k.includes('-damaged-')||x.k==='sindy-library-books-v1');
 setTimeout(storageEstimateFill,0);
 return '<section class="panel storage-panel"><h2>本機儲存空間</h2>'+
  '<p>'+(big?'<b class="ok">✓ 資料量超過一般空間，已自動改存在瀏覽器的大容量空間（IndexedDB）</b>，不會再遺失。':'資料存在瀏覽器的一般空間（約 5 MB）。放不下時會自動改用大容量空間。')+'</p>'+
  '<div class="storage-bar" role="img" aria-label="一般空間已用 '+pct+'%"><span style="width:'+pct+'%"></span></div>'+
  '<p class="help">一般空間：已用 '+bytesText(used)+' / 約 '+bytesText(LS_LIMIT)+'（以字數計）　·　大容量空間：<span id="storageEstimate">計算中…</span></p>'+
  '<details><summary>哪些資料最占空間</summary><table class="storage-table"><tbody>'+secs.slice(0,8).map(x=>'<tr><td>'+esc(x.k)+'</td><td>'+bytesText(x.size)+'</td><td><span class="storage-mini"><span style="width:'+Math.max(2,Math.round(x.size/total*100))+'%"></span></span></td></tr>').join('')+'</tbody></table>'+
  '<p class="help">「閱讀照片」是個人閱讀清單上傳的照片，直接存在資料裡，通常最大。</p>'+
  '<h3>瀏覽器一般空間的內容</h3><table class="storage-table"><tbody>'+ls.slice(0,12).map(x=>'<tr><td>'+esc(lsLabel(x.k))+'</td><td>'+bytesText(x.size)+'</td></tr>').join('')+'</tbody></table></details>'+
  '<div class="actions" style="margin-top:10px">'+(clearable.length?'<button type="button" data-storage="clean">清除可重建的快取（'+bytesText(clearable.reduce((a,x)=>a+x.size,0))+'）</button>':'')+(big?'<button type="button" data-storage="retry">再試一次存回一般空間</button>':'')+'</div></section>';}
async function storageEstimateFill(){const el=document.getElementById('storageEstimate');if(!el)return;
 try{const e=navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null;el.textContent=e?'已用 '+bytesText(e.usage||0)+' / 可用約 '+bytesText(e.quota||0):'可用';}catch{el.textContent='可用';}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-storage]');if(!b)return;
 if(b.dataset.storage==='clean'){const ks=lsEntries().filter(x=>x.k.includes('-damaged-')||x.k==='sindy-library-books-v1').map(x=>x.k);
  if(ks.some(k=>k.includes('-damaged-'))&&!confirm('會刪除舊的「損壞資料副本」與圖書館書目快取（書目之後會自動重新下載）。確定嗎？'))return;
  ks.forEach(k=>{try{localStorage.removeItem(k);}catch{}});toast('已清除 '+ks.length+' 項快取。');}
 if(b.dataset.storage==='retry'||b.dataset.storage==='clean'){const ok=typeof persist==='function'&&persist()&&!bigLocalStale();if(b.dataset.storage==='retry')toast(ok?'已存回一般空間。':'一般空間還是放不下，繼續使用大容量空間（資料是安全的）。');}
 if(typeof render==='function')render();});
