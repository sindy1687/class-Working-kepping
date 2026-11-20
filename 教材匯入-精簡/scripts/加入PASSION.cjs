const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={document:{addEventListener(){}}};vm.createContext(c);for(const f of ['material-stage','material-english'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const read=name=>Buffer.from(fs.readFileSync('教材匯入/'+name+'.base64','utf8').trim(),'base64').toString('utf8');
const before=read('第三資料夾匯入前'),beforeFolders=read('第三資料夾目錄前'),rows=JSON.parse(before),oldFolders=JSON.parse(beforeFolders),files=require('./PASSION檔案.json'),folders=require('./PASSION資料夾.json');fs.writeFileSync('教材匯入/PASSION加入前備份.json',before);fs.writeFileSync('教材匯入/PASSION目錄前備份.json',beforeFolders);
const existing=new Map();for(const r of rows){const id=r.driveFileId||String(r.url||'').match(/\/d\/([\w-]+)/)?.[1];if(id)existing.set(id,r);for(const a of r.alternateFiles||[])existing.set(a.driveFileId,a);}
let added=0,linked=0;const categories={};
for(const f of files){
 const old=existing.get(f.id);if(old){old.sourcePaths=[...new Set([old.sourcePath,...(old.sourcePaths||[]),f.path].filter(Boolean))];linked++;continue;}
 const text=f.path+'/'+f.name,category=/答案|解答/.test(f.name)?'解答':/隨堂測驗|檢測/.test(text)?'檢測卷':/圖卡/.test(text)||/^image\//.test(f.mimeType)?'圖片':/學習單/.test(text)?'學習單':/複習|小考|前測/.test(text)?'考卷':/Syllabus/i.test(text)?'教案':'其他';
 const row={id:'drive-'+f.id,driveFileId:f.id,name:f.name,fileName:f.name,url:f.url,fileSize:f.size,mimeType:f.mimeType,subject:'PASSION',category,classId:'',grade:'',date:'2026-11-12',sourcePath:f.path,sourcePaths:[f.path],cloudFolderId:f.folderId,sourceFolderId:f.rootId,unit:'',tags:'PASSION、'+f.path.split('/').slice(1).join('、'),note:'來源資料夾：'+f.path};
 row.stage=c.materialStage(row);rows.push(row);existing.set(f.id,row);added++;categories[category]=(categories[category]||0)+1;
}
const combined=[...new Map([...oldFolders,...folders].map(f=>[f.id,f])).values()];assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);for(const f of files)assert(existing.has(f.id));
fs.writeFileSync('教材匯入/教材庫-加入PASSION.json',JSON.stringify(rows));fs.writeFileSync('教材匯入/教材資料夾-加入PASSION.json',JSON.stringify(combined));fs.writeFileSync('教材匯入/PASSION匯入摘要.json',JSON.stringify({added,linked,total:rows.length,folders:folders.length,totalFolders:combined.length,categories},null,2));console.log(JSON.stringify({added,linked,total:rows.length,folders:folders.length,totalFolders:combined.length,categories}));
