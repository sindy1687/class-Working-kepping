const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={document:{addEventListener(){}}};vm.createContext(c);for(const f of ['material-stage','material-english'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const files=[...require('./第二資料夾清單.json'),...require('./第二資料夾尾清單.json')];
const before=Buffer.from(fs.readFileSync('教材匯入/第二資料夾匯入前.base64','utf8').trim(),'base64').toString('utf8'),previous=JSON.parse(before);fs.writeFileSync('教材匯入/第二資料夾匯入前.json',before);
const normalized=s=>String(s||'').normalize('NFKC').replace(/^\d{12,}_/,'').replace(/\s+/g,' ').trim().toLowerCase();
const idOf=m=>m.driveFileId||String(m.url||'').match(/\/(?:d|folders)\/([\w-]+)/)?.[1]||'';
const fingerprint=m=>{const p=c.englishMaterialParts(m),size=Number(m.fileSize);if(!size||!m.fileName)return '';const version=/過期|\(舊\)|（舊）|舊版/.test(m.sourcePath||'')?'舊版':'一般';return JSON.stringify([normalized(m.fileName),size,m.mimeType||'',p.book,p.paper,version]);};
function classify(f){
 const text=f.path+'/'+f.name;
 const category=/答案|解答/.test(text)?'解答':/^audio\//.test(f.mimeType)||/聽力|音檔/.test(text)?'聽力':/檢定/.test(text)?'檢定卷':/課本|textbook|student.?book/i.test(text)?'課本':/檢測|評量|會考/.test(text)?'檢測卷':/講義/.test(text)?'講義':/前測|小考/.test(text)?'考卷':/練習|複習|workbook/i.test(text)?'練習卷':/boyo reading/i.test(text)?'課本':/^image\//.test(f.mimeType)?'圖片':'其他';
 const name=f.name.replace(/^\d{12,}_/,'').replace(/\.(docx?|pdf|png|jpe?g|xlsx?|pptx?|mp3|wav)$/i,'').trim();
 const units=[...new Set((name.match(/(?:III|II|I)-\d{1,2}|\bL\s*\d{1,2}|\bR\s*\d{1,2}/gi)||[]).map(x=>x.replace(/\s/g,'').toUpperCase()))];
 const row={id:'drive-'+f.id,name,url:f.url,driveFileId:f.id,fileName:f.name,fileSize:f.size,mimeType:f.mimeType,classId:'',subject:'英文',category,grade:'',unit:units.join('、'),tags:[...new Set(f.path.split('/').slice(1))].join('、'),date:'2026-11-12',note:'來源資料夾：'+f.path,sourceFolderId:'1ptRU1HJFHfzkLfzhlTGNkja1aQymTQhG',sourcePath:f.path};
 row.stage=c.materialStage(row);const p=c.englishMaterialParts(row);if(p.book!=='待確認冊別')row.bookLevel=p.book;if(p.paper!=='未標卷別')row.paperNumber=p.paper;return row;
}
const merged=[],byId=new Map(),byFingerprint=new Map(),duplicates=[],skipped=[];let added=0,removedExisting=0;
function keep(row,isNew){
 const id=idOf(row),key=fingerprint(row),old=byId.get(id)||key&&byFingerprint.get(key);
 if(old){
  if(id!==idOf(old)){
   if(!old.alternateFiles)old.alternateFiles=[];
   if(!old.alternateFiles.some(x=>x.driveFileId===id))old.alternateFiles.push({driveFileId:id,url:row.url,fileName:row.fileName,sourcePath:row.sourcePath||'',matchedBy:'同檔名、同大小、同格式、同冊別卷別及版本'});
  }
  byId.set(id,old);duplicates.push({keptId:old.id,removedId:row.id,fileName:row.fileName,size:row.fileSize,reason:id===idOf(old)?'相同檔案ID':'同檔名、同大小、同格式、同冊別卷別及版本',source:row.sourcePath});if(!isNew)removedExisting++;return;
 }
 merged.push(row);byId.set(id,row);if(key)byFingerprint.set(key,row);if(isNew)added++;
}
previous.forEach(row=>keep(row,false));
for(const f of files){if(/^~\$|^\._|^\.DS_Store$/.test(f.name)||/\.lnk$/i.test(f.name)||f.mimeType==='application/x-ms-shortcut'){skipped.push({id:f.id,name:f.name,reason:'暫存檔或電腦捷徑'});continue;}keep(classify(f),true);}
assert.equal(new Set(merged.map(x=>x.id)).size,merged.length);
for(const old of previous){assert(merged.some(m=>m.id===old.id)||duplicates.some(d=>d.removedId===old.id));}
const counts={};for(const row of merged)counts[row.category]=(counts[row.category]||0)+1;
const report={sourceFiles:files.length,previous:previous.length,newlyAdded:added,removedExisting,duplicateEntries:duplicates.length,skipped:skipped.length,total:merged.length,categories:counts,duplicateCriteria:'檔案ID，或同檔名、同大小、同格式、同冊別卷別及版本；未逐份比對內文，合併項目保留替代連結。',duplicates,skippedFiles:skipped};
fs.writeFileSync('教材匯入/教材庫-合併第二資料夾.json',JSON.stringify(merged));fs.writeFileSync('教材匯入/第二資料夾合併報告.json',JSON.stringify(report,null,2));const {duplicates:_,skippedFiles:__,...summary}=report;console.log(JSON.stringify(summary));
