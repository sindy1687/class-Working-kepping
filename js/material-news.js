'use strict';
let matNewsYear='',newsSyncMessage='尚未確認自動更新狀態',newsSyncChecked=false,newsSyncBusy=false;
function materialNewsControls(){
 if(matSubject!=='閱讀')return '';
 if(!newsSyncChecked&&typeof cloud!=='undefined'&&cloud.url&&typeof queueMicrotask==='function'){newsSyncChecked=true;queueMicrotask(()=>loadNewsSyncStatus());}const issues=data.attachments.filter(m=>m.series==='每週國內外大事');if(!issues.length)return '';
 const years=[...new Set(issues.map(m=>m.year))].sort((a,b)=>b-a);
 return '<section class="panel material-news-controls"><div><strong>每週國內外大事</strong><p id="newsSyncState" class="help" role="status">'+esc(newsSyncMessage)+'</p><p class="help">同一期可選學生版或教師版 PDF。原站採下載方式，下載後可開啟閱讀。</p></div><label>年度<select id="matNewsYear"><option value="">全部年度</option>'+years.map(y=>'<option value="'+y+'" '+(String(y)===matNewsYear?'selected':'')+'>'+y+' 年</option>').join('')+'</select></label><button data-news-update '+(newsSyncBusy?'disabled':'')+'>'+(newsSyncBusy?'正在檢查…':'立即檢查新期數')+'</button><a href="https://www.boyo.org.tw/boyoV2/online_tm/boyo_read_tm/weekly-news" target="_blank" rel="noopener noreferrer">官網教材總表 ↗</a></section>';
}
document.addEventListener('change',e=>{if(e.target.id==='matNewsYear'){matNewsYear=e.target.value;matPage=1;render();}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&(b.dataset.matSubject!==undefined||b.hasAttribute('data-mat-clear')||b.hasAttribute('data-mat-folder')))matNewsYear='';});
async function newsSyncRequest(action,post=false){
 if(typeof cloud==='undefined'||!cloud.url)throw Error('請先設定雲端同步網址。');
 const url=new URL(cloud.url);if(!post)url.searchParams.set('action',action);
 const response=await fetch(url.href,{...(post?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action})}:{}),cache:'no-store',signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('更新服務連線失敗（HTTP '+response.status+'）');
 const result=await response.json();if(!result.ok)throw Error(result.error||'更新失敗，原有教材會保留。');return result;
}
async function loadNewsSyncStatus(){
 try{const result=await newsSyncRequest('weeklyNewsStatus');if(typeof result.enabled!=='boolean')throw Error('請更新 GAS 新版本，並執行 installWeeklyNewsAutoUpdate 啟用自動更新。');newsSyncMessage=(result.enabled?'已啟用每日自動更新（台灣時間 08–09 時）':'尚未啟用排程：請於 GAS 執行 installWeeklyNewsAutoUpdate')+(result.lastChecked?' · 上次檢查 '+new Date(result.lastChecked).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'');}
 catch(err){newsSyncMessage=err.message;}
 if(matSubject==='閱讀')render();
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-news-update]');if(!b||newsSyncBusy)return;
 if(typeof cloud==='undefined'||!cloud.url){toast('請先設定雲端同步網址。');return;}if(cloud.busy){toast('雲端正在同步，請稍候再檢查。');return;}
 newsSyncBusy=true;cloud.busy=true;newsSyncMessage='正在檢查官網的新期數…';render();
 try{const result=await newsSyncRequest('updateWeeklyNews',true);if(typeof result.added!=='number')throw Error('請更新 GAS 程式並部署新版本。');newsSyncMessage=result.added?'已新增 '+result.added+' 份閱讀教材。':result.cached?'剛剛已檢查，請稍後再試。':'已檢查，目前沒有新的可用教材。';toast(newsSyncMessage);cloud.busy=false;await cloudPull({force:true});await loadNewsSyncStatus();}
 catch(err){newsSyncMessage=err.name==='TimeoutError'?'檢查逾時，請稍後再試；原有教材保留。':err.message;toast(newsSyncMessage);}
 finally{cloud.busy=false;newsSyncBusy=false;if(matSubject==='閱讀')render();}
});
