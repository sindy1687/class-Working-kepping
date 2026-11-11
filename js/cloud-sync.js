'use strict';
/* ---------- Google 雲端同步（透過 Google Apps Script 網頁應用程式） ---------- */
const CLOUD_URL_DEFAULT='https://script.google.com/macros/s/AKfycby67dKHZ4xfrEyWDu30AmU4nkNbBEahae1XYtgfXtZpFRS9qlda9jTRTUfiILF19xvP/exec';
const CLOUD_URL_KEY='sindy-cloud-url',CLOUD_SYNCED_KEY='sindy-cloud-synced-v1';
const CLOUD_EXTRA_LABELS={settings:'系統設定','meta.cleaningJobs':'清潔工作項目','meta.mathAssessments':'數學檢測設定','meta.readingMedia':'閱讀照片','meta.schoolExams':'學校考試設定','meta.schoolSubjectLists':'學校科目','meta.gradePromotionLog':'升年級紀錄'};
const CLOUD_SETTINGS_ARRAYS=['pins','mathUnits','kistLessons'];
const cloud={url:'',synced:{},ver:{},conflicts:0,timer:null,retry:null,busy:false,again:false,lastPull:0,state:'',msg:''};
function cloudLoadSynced(){try{const s=JSON.parse(localStorage.getItem(CLOUD_SYNCED_KEY)||'{}')||{};cloud.synced=s.hash||{};cloud.ver=s.ver||{};}catch{cloud.synced={};cloud.ver={};}}
cloud.url=CLOUD_URL_DEFAULT;try{const u=localStorage.getItem(CLOUD_URL_KEY);if(u!==null)cloud.url=u;}catch{}cloudLoadSynced();

function cloudLabel(key){const m=Object.entries(modules).find(([,v])=>v.key===key);return m?m[0]:CLOUD_EXTRA_LABELS[key]||key;}
function cloudFileName(key){return cloudLabel(key).replace(/[\\/:*?"<>|]/g,'_')+' ('+key+').json';}
function cloudHash(s){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (h2>>>0).toString(36)+(h1>>>0).toString(36)+'.'+s.length;}
function cloudPack(d){const files={},settings={};
 for(const [k,v] of Object.entries(d)){
  if(k==='meta'&&v&&typeof v==='object'){const meta={};for(const [mk,mv] of Object.entries(v)){if(mv&&typeof mv==='object')files['meta.'+mk]=mv;else meta[mk]=mv;}settings.meta=meta;}
  else if(Array.isArray(v)&&!CLOUD_SETTINGS_ARRAYS.includes(k))files[k]=v;else settings[k]=v;}
 files.settings=settings;return files;}
function cloudUnpack(files){const s=files.settings&&typeof files.settings==='object'?files.settings:{},d={...s,meta:{...(s.meta||{})}};
 for(const [k,v] of Object.entries(files)){if(k==='settings')continue;if(k.startsWith('meta.'))d.meta[k.slice(5)]=v;else d[k]=v;}
 if(d.schema==null)d.schema=1;return d;}
function cloudSaveSynced(){try{localStorage.setItem(CLOUD_SYNCED_KEY,JSON.stringify({hash:cloud.synced,ver:cloud.ver}));}catch{}}
function cloudStoredHashes(){const out={};try{const raw=JSON.parse(localStorage.getItem(STORE)||'null');if(raw&&typeof raw==='object')for(const [k,v] of Object.entries(cloudPack(raw)))out[k]=cloudHash(JSON.stringify(v));}catch{}return out;}
function cloudMerge(lv,rv){const rec=a=>Array.isArray(a)&&a.every(x=>x&&typeof x==='object'&&typeof x.id==='string');
 if(rec(lv)&&rec(rv)){const lm=new Map(lv.map(x=>[x.id,x])),seen=new Set(),out=rv.map(x=>{seen.add(x.id);return lm.get(x.id)||x;});lv.forEach(x=>{if(!seen.has(x.id))out.push(x);});return out;}
 if(lv&&rv&&typeof lv==='object'&&typeof rv==='object'&&!Array.isArray(lv)&&!Array.isArray(rv))return {...rv,...lv};return lv;}
function cloudDirty(){const packed=cloudPack(data),out={};for(const [k,v] of Object.entries(packed)){const s=JSON.stringify(v),h=cloudHash(s);if(cloud.synced[k]!==h)out[k]={s,h};}return out;}
function cloudTime(){return new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});}
function cloudSetState(state,msg){cloud.state=state;cloud.msg=msg||'';if(state==='error')status('☁ '+cloud.msg,true);else if(msg)status('☁ '+msg);const el=document.getElementById('cloudState');if(el)el.innerHTML=cloudStateHtml();}
function cloudStateHtml(){if(!cloud.url)return '尚未連接 Google 雲端，資料只存在這個瀏覽器。';return (cloud.state==='error'?'<span class="error">⚠ ':'☁ ')+esc(cloud.msg||'已連接 Google 雲端')+(cloud.state==='error'?'</span>':'');}
function cloudPanel(){return '<section class="panel"><h2>Google 雲端同步</h2><p id="cloudState">'+cloudStateHtml()+'</p><label>雲端同步網址（Google Apps Script 網頁應用程式）<input id="cloudUrl" placeholder="https://script.google.com/macros/s/…/exec" value="'+esc(cloud.url)+'"></label><div class="actions" style="margin-top:10px"><button class="primary" data-cloud="sync">☁ 立即同步</button><button data-cloud="pull">↓ 從雲端重新下載</button></div><p class="help" style="margin-top:14px">開啟網站時會自動從雲端資料夾下載最新資料；修改後約 2 秒自動上傳。每個功能分開存成一個檔案（例如「學生週誌 (journals).json」），雲端每天也會自動保留一份備份。</p></section>';}

async function cloudFetch(opts){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),60000);
 try{const r=await fetch(opts?cloud.url:cloud.url+(cloud.url.includes('?')?'&':'?')+'action=load&t='+Date.now(),{...(opts||{}),cache:'no-store',redirect:'follow',signal:ctl.signal});if(!r.ok)throw Error('HTTP '+r.status);
  let j;try{j=JSON.parse(await r.text());}catch{throw Error('雲端回傳的不是資料，請確認網址與部署權限（存取權：所有人）');}if(!j||!j.ok)throw Error(j&&j.error||'雲端回應錯誤');return j;}
 catch(e){throw e.name==='AbortError'?Error('連線逾時'):e;}finally{clearTimeout(t);}}

async function cloudPull(opts={}){
 if(!cloud.url||cloud.busy)return;if($('editor').open&&!opts.force)return;
 cloud.busy=true;cloudSetState('busy','正在從雲端下載…');
 try{const j=await cloudFetch(),remote=j.files||{},rkeys=Object.keys(remote);cloud.lastPull=Date.now();
  const local=cloudPack(data),stored=cloudStoredHashes(),first=!Object.keys(cloud.synced).length;
  if(!rkeys.length){cloud.busy=false;cloudSetState('ok','雲端資料夾是空的，正在上傳這台電腦的資料…');cloud.synced={};cloud.ver={};cloudSaveSynced();return cloudPush(true);}
  let useRemote=true;
  if(first&&!opts.replace){const hasLocal=Object.entries(local).some(([k,v])=>!['settings','calendar'].includes(k)&&Array.isArray(v)&&v.length);
   if(hasLocal)useRemote=confirm('Google 雲端資料夾已經有資料。\n\n按「確定」：改用雲端資料（會先下載一份這台電腦的資料備份）。\n按「取消」：保留這台電腦的資料，並上傳覆蓋雲端。');
   if(useRemote&&hasLocal)exportData();}
  const merged={},keys=new Set([...Object.keys(local),...rkeys]);let kept=0;
  for(const k of keys){const r=remote[k],lv=local[k];
   if(!r){if(lv!==undefined)merged[k]=lv;delete cloud.ver[k];continue;}
   if(!useRemote){if(lv!==undefined)merged[k]=lv;cloud.ver[k]=r.ver;continue;}
   const dirty=!opts.replace&&!first&&lv!==undefined&&stored[k]!==undefined&&cloud.synced[k]!==stored[k];
   if(!dirty){merged[k]=r.data;cloud.synced[k]=cloudHash(JSON.stringify(r.data));cloud.ver[k]=r.ver;}
   else if(r.ver===cloud.ver[k])merged[k]=lv;
   else{merged[k]=cloudMerge(lv,r.data);cloud.ver[k]=r.ver;kept++;}}
  const next=validateImport(cloudUnpack(merged));
  data=next;cloudSaveSynced();
  try{localStorage.setItem(STORE,JSON.stringify(data));}catch{}
  render();cloud.busy=false;
  cloudSetState('ok','已從雲端下載 · '+cloudTime()+(kept?'（已合併 '+kept+' 個檔案中尚未上傳的修改）':''));
  cloudPush(true);}
 catch(e){cloud.busy=false;cloudSetState('error','雲端下載失敗：'+e.message+'（目前使用這台電腦的資料）');}}

async function cloudPush(now){
 if(!cloud.url)return;clearTimeout(cloud.timer);
 if(!now){cloud.timer=setTimeout(()=>cloudPush(true),2000);return;}
 if(cloud.busy){cloud.again=true;return;}
 const dirty=cloudDirty(),keys=Object.keys(dirty);if(!keys.length){if(cloud.state!=='error'&&cloud.msg.startsWith('正在'))cloudSetState('ok','已同步 · '+cloudTime());return;}
 cloud.busy=true;cloud.again=false;cloudSetState('busy','正在上傳 '+keys.length+' 個檔案…');
 try{const files={};for(const k of keys)files[k]={name:cloudFileName(k),json:dirty[k].s,base:cloud.ver[k]||''};
  const j=await cloudFetch({method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'save',files})});
  const saved=j.saved||{},conflicts=j.conflicts||[];for(const k of Object.keys(saved)){if(!dirty[k])continue;cloud.synced[k]=dirty[k].h;cloud.ver[k]=saved[k];}cloudSaveSynced();clearTimeout(cloud.retry);cloud.busy=false;
  if(conflicts.length){if(++cloud.conflicts>3){cloud.conflicts=0;cloudSetState('error','雲端檔案一直被其他裝置修改，請稍後按「立即同步」');return;}cloudSetState('busy','其他裝置也修改了資料，正在合併…');return cloudPull({force:true});}
  cloud.conflicts=0;cloudSetState('ok','已上傳到雲端 · '+cloudTime());
  if(cloud.again||Object.keys(cloudDirty()).length)cloudPush();}
 catch(e){cloud.busy=false;cloudSetState('error','上傳失敗：'+e.message+'，30 秒後重試（資料已存在這台電腦）');clearTimeout(cloud.retry);cloud.retry=setTimeout(()=>cloudPush(true),30000);}}
function cloudSchedule(){if(cloud.url&&!cloud.busy)cloudPush();else if(cloud.url)cloud.again=true;}
function cloudFlushBeacon(){if(!cloud.url||!navigator.sendBeacon)return;const dirty=cloudDirty(),keys=Object.keys(dirty);if(!keys.length)return;
 const files={};for(const k of keys)files[k]={name:cloudFileName(k),json:dirty[k].s,base:cloud.ver[k]||''};const body=JSON.stringify({action:'save',files});
 if(body.length<60000)navigator.sendBeacon(cloud.url,new Blob([body],{type:'text/plain;charset=utf-8'}));}
function cloudSetUrl(v){v=v.trim();if(v&&!/^https:\/\/script\.google(usercontent)?\.com\//.test(v)){toast('網址須以 https://script.google.com/ 開頭。');return false;}
 if(v===cloud.url)return true;cloud.url=v;cloud.synced={};cloud.ver={};cloudSaveSynced();try{localStorage.setItem(CLOUD_URL_KEY,v);}catch{}cloudSidefoot();
 if(v)cloudPull({force:true});else cloudSetState('','');return true;}
function cloudSidefoot(){const el=document.querySelector('.sidefoot');if(el)el.innerHTML=cloud.url?'資料自動同步到 Google 雲端<br>並保存在這個瀏覽器':'資料自動儲存在這個瀏覽器<br>請定期到「資料匯入匯出」備份';}

document.addEventListener('change',e=>{if(e.target.id==='cloudUrl')cloudSetUrl(e.target.value);});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cloud]');if(!b)return;const u=$('cloudUrl');if(u&&u.value.trim()!==cloud.url&&!cloudSetUrl(u.value))return;
 if(!cloud.url){toast('請先貼上雲端同步網址。');return;}
 if(b.dataset.cloud==='sync'){cloud.lastPull=0;cloudPull({force:true});}
 else if(b.dataset.cloud==='pull'&&confirm('用雲端資料取代這台電腦的資料？系統會先下載一份目前資料備份。')){exportData();cloud.busy=false;cloudPull({force:true,replace:true});}});
document.addEventListener('visibilitychange',()=>{if(!cloud.url)return;if(document.visibilityState==='hidden')cloudFlushBeacon();else if(Date.now()-cloud.lastPull>60000&&!Object.keys(cloudDirty()).length)cloudPull();});
window.addEventListener('pagehide',cloudFlushBeacon);
window.addEventListener('storage',e=>{if(e.key===CLOUD_SYNCED_KEY)cloudLoadSynced();});
cloudSidefoot();
if(cloud.url)cloudPull({force:true});
