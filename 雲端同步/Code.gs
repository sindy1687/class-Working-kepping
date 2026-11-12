/**
 * Sindy 課輔班工作助手 — Google 雲端同步
 * 每個功能存成資料夾裡的一個 JSON 檔，例如「學生週誌 (journals).json」。
 * 部署：部署 → 新增部署作業 → 網頁應用程式；執行身分：我；存取權：所有人。
 */
const FOLDER_ID = '1GmKEo1owiriHenS2h-hYb2wJZosxRGU-';
const BACKUP_FOLDER = '每日備份';
const KEEP_BACKUP_DAYS = 30;
const KEY_RE = /^[A-Za-z0-9_.]+$/;

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'load';
    if (action === 'ping') return out_({ ok: true });
    if (action === 'holidays') return out_(publicHolidays_());
    if (action === 'materialsStatus') return out_({ ok: true, upload: true, maxBytes: 8388608 });
    if (action === 'materialMeta') return out_(materialMeta_(e.parameter.url));
    if (action === 'weeklyNewsStatus') return out_(weeklyNewsStatus_());
    if (action === 'albumPhotos') return out_(albumPhotos_(e.parameter.url));
    if (action !== 'load') throw new Error('請更新 GAS 程式並部署新版本');
    return out_({ ok: true, files: load_() });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'updateWeeklyNews') return out_(updateWeeklyNews());
    if (body.action === 'uploadMaterial') {
      lock.waitLock(30000);
      return out_(uploadMaterial_(body));
    }
    if (body.action !== 'save' || !body.files) throw new Error('不支援的動作');
    lock.waitLock(30000);
    const result = save_(body.files);
    return out_({ ok: true, saved: result.saved, conflicts: result.conflicts });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function folder_() { return DriveApp.getFolderById(FOLDER_ID); }

/** 教材檔與索引一起儲存，其他裝置可由原同步流程載入。 */
function uploadMaterial_(body) {
  const categories = ['檢定卷','檢測卷','課本','講義','學習單','習作','練習卷','考卷','解答','教案','聽力','影片','圖片','簡報','其他'];
  const info = body.material || {}, id = String(body.requestId || '');
  if (!/^[\w-]{8,100}$/.test(id)) throw new Error('上傳代號不正確');
  if (!categories.includes(info.category)) throw new Error('請選擇教材分類');
  const name = String(body.fileName || '').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 180);
  if (!name) throw new Error('請選擇檔案');
  if (typeof body.base64 !== 'string' || body.base64.length > 11184812) throw new Error('每份檔案上限 8 MB');
  const bytes = Utilities.base64Decode(body.base64);
  if (!bytes.length || bytes.length > 8388608) throw new Error('檔案不可為空，且每份上限 8 MB');
  const root = folder_(), map = index_(root), index = map.attachments;
  let rows = index ? JSON.parse(index.getBlob().getDataAsString('UTF-8')) : [];
  if (!Array.isArray(rows)) throw new Error('教材索引格式錯誤，未上傳檔案');
  const existing = rows.find(r => r.id === id);
  if (existing) return { ok: true, material: existing, attachments: rows, ver: ver_(index.getBlob().getDataAsString('UTF-8')) };
  const child = function (parent, title) { const it = parent.getFoldersByName(title); return it.hasNext() ? it.next() : parent.createFolder(title); };
  const target = child(child(root, '教材庫'), info.category), marker = 'sindy-material:' + id;
  const matches = target.getFilesByName(name);let file = null,created = false;
  while (matches.hasNext()) { const candidate = matches.next(); if (candidate.getDescription() === marker) { file = candidate; break; } }
  try {
    if (!file) {file = target.createFile(Utilities.newBlob(bytes, String(body.mimeType || 'application/octet-stream'), name));file.setDescription(marker);created = true;}
    const row = { id: id, name: String(info.name || name).slice(0,250), url: file.getUrl(), driveFileId: file.getId(), fileName: name, fileSize: bytes.length, mimeType: file.getMimeType(), category: info.category, date: Utilities.formatDate(new Date(),'Asia/Taipei','yyyy-MM-dd') };
    ['classId','subject','stage','grade','bookLevel','paperNumber','unit','tags','note'].forEach(k => row[k] = String(info[k] || '').slice(0, k === 'note' ? 4000 : 250));
    rows.push(row);const json = JSON.stringify(rows);
    if (index) {const backup = backupFolder_(root);if (!backup.getFilesByName(index.getName()).hasNext()) index.makeCopy(index.getName(),backup);index.setContent(json);}
    else root.createFile('教材庫 (attachments).json',json,'application/json');
    return { ok:true, material:row, attachments:rows, ver:ver_(json) };
  } catch (err) {if(created&&file)try{file.setTrashed(true);}catch(ignore){}throw err;}
}

function materialMeta_(input) {
 const url=String(input||'').trim(),match=/^https:\/\/([a-z0-9.-]+)(?:[/?#]|$)/i.exec(url);
 if(!match||url.length>2500||!match[1].includes('.')||/^[\d.]+$/.test(match[1])||/(^|\.)(localhost|local|internal|test|invalid)$/i.test(match[1]))throw new Error('請使用公開 HTTPS 網址');
 if(/^(drive|docs)\.google\.com$/i.test(match[1])){
  const id=/\/d\/([\w-]+)/.exec(url)||/[?&]id=([\w-]+)/.exec(url)||/\/folders\/([\w-]+)/.exec(url),key=/[?&]resourcekey=([^&#]+)/i.exec(url);
  if(id){try{const f=/\/folders\//.test(url)?(key?DriveApp.getFolderByIdAndResourceKey(id[1],decodeURIComponent(key[1])):DriveApp.getFolderById(id[1])):(key?DriveApp.getFileByIdAndResourceKey(id[1],decodeURIComponent(key[1])):DriveApp.getFileById(id[1]));return {ok:true,title:f.getName().slice(0,250)};}catch(err){throw new Error('無法讀取檔名，請確認 GAS 部署帳號可以開啟這份檔案。');}}
 }
 const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:false});
 if(response.getResponseCode()!==200)throw new Error('網站限制讀取或需要重新導向，請手動填寫名稱。');
 const m=/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(response.getContentText().slice(0,500000));
 if(!m)throw new Error('找不到網頁標題，請手動填寫名稱。');
 const title=m[1].replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
 if(!title||/sign in|登入.*google/i.test(title))throw new Error('此網頁需要登入，請手動填寫名稱。');
 return {ok:true,title:title.slice(0,250)};
}

/** 政府公開假日資料；只回傳今年及明年，不讀取私人雲端檔案。 */
function publicHolidays_() {
  const year = Number(Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy'));
  const cache = CacheService.getScriptCache(), key = 'tw-public-holidays-' + year;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const records = [], seen = new Set();
  for (let page = 0; page < 20; page++) {
    const url = 'https://data.ntpc.gov.tw/api/datasets/308dcd75-6434-45bc-a95f-584da4fed251/json?page=' + page + '&size=1000';
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) throw new Error('政府假日資料暫時無法讀取');
    const rows = JSON.parse(response.getContentText('UTF-8'));
    if (!Array.isArray(rows)) throw new Error('政府假日資料格式錯誤');
    if (rows.length && seen.has(rows[0].date)) throw new Error('政府資料分頁異常，未更新假日');
    if (rows.length) seen.add(rows[0].date);
    records.push(...rows);
    if (rows.length < 1000) break;
    if (page === 19) throw new Error('政府資料超出預期筆數，未更新假日');
  }
  const selected = records.filter(r => Number(r.year) === year || Number(r.year) === year + 1);
  const years = [...new Set(selected.map(r => Number(r.year)))].sort();
  if (!years.includes(year)) throw new Error('官方資料尚未提供今年假日');
  const result = { ok: true, source: 'https://data.ntpc.gov.tw/datasets/308dcd75-6434-45bc-a95f-584da4fed251', years: years, days: selected, fetchedAt: new Date().toISOString() };
  cache.put(key, JSON.stringify(result), 21600);
  return result;
}

function keyOf_(name) {
  const m = /\(([A-Za-z0-9_.]+)\)\.json$/.exec(name);
  return m ? m[1] : null;
}

function index_(folder) {
  const map = {};
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const key = keyOf_(f.getName());
    if (!key) continue;
    if (!map[key] || f.getLastUpdated() > map[key].getLastUpdated()) map[key] = f;
  }
  return map;
}

function load_() {
  const files = {};
  const map = index_(folder_());
  Object.keys(map).forEach(function (key) {
    const f = map[key];
    const text = f.getBlob().getDataAsString('UTF-8');
    try {
      files[key] = { data: JSON.parse(text), ver: ver_(text), modified: f.getLastUpdated().getTime() };
    } catch (err) {
      throw new Error('檔案「' + f.getName() + '」不是正確的 JSON');
    }
  });
  return files;
}

function save_(files) {
  const folder = folder_();
  const map = index_(folder);
  const backup = backupFolder_(folder);
  const saved = {}, conflicts = [];
  Object.keys(files).forEach(function (key) {
    if (!KEY_RE.test(key)) throw new Error('檔案代號不正確：' + key);
    const item = files[key];
    const json = String(item.json);
    JSON.parse(json);
    const name = String(item.name || key + '.json').replace(/[\\/]/g, '_');
    const f = map[key];
    if (f && ver_(f.getBlob().getDataAsString('UTF-8')) !== String(item.base || '')) { conflicts.push(key); return; }
    if (f) {
      if (backup && !backup.getFilesByName(f.getName()).hasNext()) f.makeCopy(f.getName(), backup);
      f.setContent(json);
      if (f.getName() !== name) f.setName(name);
    } else {
      folder.createFile(name, json, 'application/json');
    }
    saved[key] = ver_(json);
  });
  return { saved: saved, conflicts: conflicts };
}

function ver_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8));
}

function backupFolder_(folder) {
  const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  const roots = folder.getFoldersByName(BACKUP_FOLDER);
  const root = roots.hasNext() ? roots.next() : folder.createFolder(BACKUP_FOLDER);
  const days = root.getFoldersByName(today);
  if (days.hasNext()) return days.next();
  const cutoff = Utilities.formatDate(new Date(Date.now() - KEEP_BACKUP_DAYS * 864e5), 'Asia/Taipei', 'yyyy-MM-dd');
  const all = root.getFolders();
  while (all.hasNext()) {
    const d = all.next();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.getName()) && d.getName() < cutoff) d.setTrashed(true);
  }
  return root.createFolder(today);
}

/** 讀取 Google 相簿分享連結（photos.app.goo.gl），回傳相簿內的照片網址，供網頁直接顯示。只讀取，不會改動相簿。 */
function albumPhotos_(url) {
  url = String(url || '').trim();
  if (!/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com|goo\.gl)\//.test(url)) throw new Error('請貼 Google 相簿的分享連結');
  const res = UrlFetchApp.fetch(url, { followRedirects: true, muteHttpExceptions: true, headers: { 'Accept-Language': 'zh-TW,zh;q=0.9' } });
  if (res.getResponseCode() !== 200) throw new Error('無法開啟相簿（HTTP ' + res.getResponseCode() + '），請確認已建立分享連結');
  const html = res.getContentText();
  const seen = {}, photos = [];
  const re = /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_\-]+)",(\d+),(\d+)/g;
  let m;
  while ((m = re.exec(html)) && photos.length < 100) {
    if (seen[m[1]]) continue;
    seen[m[1]] = true;
    photos.push({ src: m[1], w: Number(m[2]), h: Number(m[3]) });
  }
  if (!photos.length) {
    const og = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (og) photos.push({ src: og[1].replace(/&amp;/g, '&').replace(/=[^=\/]*$/, '') });
  }
  if (!photos.length) throw new Error('相簿裡找不到可顯示的照片，請確認連結是公開分享的');
  const t = html.match(/<meta property="og:title" content="([^"]*)"/);
  return { ok: true, title: t ? t[1].replace(/&amp;/g, '&') : '', photos: photos };
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 在編輯器按「執行」一次，授權讀取與寫入雲端資料夾（會建立一個測試檔再丟進垃圾桶）。 */
function authorize() {
  const folder = folder_();
  const f = folder.createFile('授權測試.txt', 'ok');
  f.setContent('ok2');
  f.setTrashed(true);
  Logger.log('授權成功，可以讀寫資料夾：' + folder.getName());
}

/* 每週國內外大事：只向固定官網讀取，新期數附加到現有教材。 */
const WEEKLY_NEWS_URL_ = 'https://www.boyo.org.tw/boyoV2/online_tm/boyo_read_tm/weekly-news';
function weeklyNewsParse_(html) {
 const strip=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(),out=[];
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
  const title=strip((/<td\b[^>]*>([\s\S]*?)<\/td>/i.exec(row)||[])[1]||''),issue=/每週國內外大事\s*(\d{3,4})\s*年\s*(\d+)\s*期/.exec(title),range=/(\d{3})(\d{2})(\d{2})\s*[-~～]\s*(\d{7})/.exec(title);
  if(!issue&&!range)continue;const year=issue?(+issue[1]<1911?+issue[1]+1911:+issue[1]):+range[1]+1911;
  for(const link of row.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const label=strip(link[2]),edition=/學生/.test(label)?'學生版':/教師/.test(label)?'教師版':'';if(!edition)continue;
   let url=link[1].replace(/&amp;/g,'&');if(/^\/boyo(?:V2)?\//.test(url))url='https://www.boyo.org.tw'+url;
   if(!/^https:\/\/www\.boyo\.org\.tw\/boyo(?:V2)?\//.test(url)||!/[?&]download=/.test(url))continue;
   out.push({title,year,issue:issue?+issue[2]:0,period:range?range[0]:'',edition,url});
  }
 }
 const unique=[...new Map(out.map(x=>[x.url,x])).values()];if(!unique.length)throw new Error('官網格式變更或未找到教材，原資料未變更。');return unique;
}
function weeklyNewsKey_(item){return [item.year,item.issue||item.period,item.edition].join('|');}
function weeklyNewsRow_(item){
 const unit=item.issue?'第'+item.issue+'期':item.period;
 return {id:'boyo-news-'+Utilities.getUuid().replace(/-/g,''),name:item.title,fileName:item.title+'-'+item.edition+'.pdf',mimeType:'application/pdf',url:item.url,subject:'閱讀',category:'閱讀文章',series:'每週國內外大事',edition:item.edition,year:item.year,issueNumber:item.issue,period:item.period,date:Utilities.formatDate(new Date(),'Asia/Taipei','yyyy-MM-dd'),classId:'',stage:'共用',grade:'',unit,tags:'每週國內外大事、'+item.year+'年、'+unit+'、'+item.edition,note:'博幼基金會每週國內外大事；點選版本下載 PDF 閱讀。',sourcePage:WEEKLY_NEWS_URL_,availability:'available'};
}
function weeklyNewsRead_(map,key,fallback){const file=map[key];return file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):fallback;}
function weeklyNewsWrite_(root,map,key,name,value){const json=JSON.stringify(value),file=map[key];if(file){const backup=backupFolder_(root);if(!backup.getFilesByName(file.getName()).hasNext())file.makeCopy(file.getName(),backup);file.setContent(json);}else root.createFile(name,json,'application/json');}
function weeklyNewsStatus_(){const map=index_(folder_()),state=weeklyNewsRead_(map,'meta.weeklyNewsSync',{});return {ok:true,enabled:!!PropertiesService.getScriptProperties().getProperty('weeklyNewsAutoInstalled'),lastChecked:state.lastChecked||'',lastAdded:state.lastAdded||0,lastError:state.lastError||''};}
function updateWeeklyNews(){
 const root=folder_(),initial=index_(root),state=weeklyNewsRead_(initial,'meta.weeklyNewsSync',{});
 if(state.lastChecked&&Date.now()-Date.parse(state.lastChecked)<120000)return {ok:true,added:0,lastChecked:state.lastChecked,cached:true};
 const page=UrlFetchApp.fetch(WEEKLY_NEWS_URL_,{muteHttpExceptions:true});if(page.getResponseCode()!==200)throw new Error('官網暫時無法讀取，保留原有閱讀教材。');
 const items=weeklyNewsParse_(page.getContentText('UTF-8')),existing=weeklyNewsRead_(initial,'attachments',[]);if(!Array.isArray(existing))throw new Error('教材清單格式錯誤');
 const urls=new Set(existing.map(r=>r.url)),keys=new Set(existing.filter(r=>r.series==='每週國內外大事').map(r=>weeklyNewsKey_({year:r.year,issue:r.issueNumber,period:r.period,edition:r.edition}))),seen=new Set(state.observed||[]),accepted=[],checked=[],latest=Math.max(...items.map(x=>x.year)),first=!state.initialized;
 let failed=0,invalid=0,attempted=0;
 for(const item of items){
  const hash=ver_(item.url);if(seen.has(hash))continue;
  if(urls.has(item.url)||keys.has(weeklyNewsKey_(item))||(first&&item.year<latest-1)){checked.push(hash);continue;}
  if(attempted++>=20)break;
  try{const response=UrlFetchApp.fetch(item.url,{muteHttpExceptions:true,followRedirects:false,headers:{Range:'bytes=0-31'}}),code=response.getResponseCode(),headers=response.getAllHeaders(),type=String(headers['Content-Type']||headers['content-type']||'');
   if((code===200||code===206)&&/application\/pdf/i.test(type)){accepted.push(item);checked.push(hash);}
   else if(code===404||code===410){invalid++;checked.push(hash);}else failed++;
  }catch(err){failed++;}
 }
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const fresh=index_(root),rows=weeklyNewsRead_(fresh,'attachments',[]),current=weeklyNewsRead_(fresh,'meta.weeklyNewsSync',{});if(!Array.isArray(rows))throw new Error('教材清單格式錯誤');
  const knownUrls=new Set(rows.map(r=>r.url)),knownKeys=new Set(rows.filter(r=>r.series==='每週國內外大事').map(r=>weeklyNewsKey_({year:r.year,issue:r.issueNumber,period:r.period,edition:r.edition})));let added=0;
  for(const item of accepted){if(knownUrls.has(item.url)||knownKeys.has(weeklyNewsKey_(item)))continue;rows.push(weeklyNewsRow_(item));knownUrls.add(item.url);knownKeys.add(weeklyNewsKey_(item));added++;}
  if(added)weeklyNewsWrite_(root,fresh,'attachments','教材庫 (attachments).json',rows);
  const next={...current,initialized:true,observed:[...new Set([...(current.observed||[]),...checked])],lastChecked:new Date().toISOString(),lastAdded:added,lastError:failed?failed+' 個連結暫時無法確認，下次重試。':'',invalidLinks:invalid};
  weeklyNewsWrite_(root,fresh,'meta.weeklyNewsSync','閱讀網站更新狀態 (meta.weeklyNewsSync).json',next);
  return {ok:true,added,lastChecked:next.lastChecked,retryLinks:failed,invalidLinks:invalid};
 }finally{lock.releaseLock();}
}
/** 於 GAS 編輯器選此函式並執行一次，建立每日 08–09 時自動更新。 */
function installWeeklyNewsAutoUpdate(){
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='updateWeeklyNews'))ScriptApp.newTrigger('updateWeeklyNews').timeBased().everyDays(1).atHour(8).inTimezone('Asia/Taipei').create();
 PropertiesService.getScriptProperties().setProperty('weeklyNewsAutoInstalled',new Date().toISOString());
 const result=updateWeeklyNews();console.log(JSON.stringify(result));return result;
}
