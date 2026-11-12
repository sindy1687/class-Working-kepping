const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={document:{addEventListener(){}}};vm.createContext(c);for(const f of ['material-stage','material-english'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const read=n=>Buffer.from(fs.readFileSync('教材匯入/'+n+'.base64','utf8').trim(),'base64').toString('utf8'),before=read('第四教材前'),beforeFolders=read('第四目錄前'),rows=JSON.parse(before),oldFolders=JSON.parse(beforeFolders),files=require('./數學檔案.json'),folders=require('./數學資料夾.json');fs.writeFileSync('教材匯入/數學加入前備份.json',before);fs.writeFileSync('教材匯入/數學目錄前備份.json',beforeFolders);
const idMap=new Map(),keyMap=new Map(),norm=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase();
const key=r=>r.fileSize&&r.fileName?JSON.stringify([norm(r.fileName),r.fileSize,r.mimeType,r.subject,r.category,r.stage,r.grade||'',r.unit||'',r.paperNumber||'',/過期|舊版/.test(r.sourcePath||'')?'舊版':'一般']):'';
for(const r of rows){if(r.driveFileId)idMap.set(r.driveFileId,r);for(const a of r.alternateFiles||[])idMap.set(a.driveFileId,r);const k=key(r);if(k)keyMap.set(k,r);}
let added=0,duplicates=0;const categories={},cn='一二三四五六七八九';
for(const f of files){
 const text=f.path+'/'+f.name,gradeMatch=text.match(/([1-9一二三四五六七八九])\s*年級/),grade=gradeMatch?(cn.includes(gradeMatch[1])?cn.indexOf(gradeMatch[1])+1:Number(gradeMatch[1]))+'年級':'';
 const category=/答案|解答/.test(text)?'解答':/檢測|測驗|評量/.test(text)?'檢測卷':/課本/.test(text)?'課本':/講義/.test(text)?'講義':/學習單/.test(text)?'學習單':/練習|複習|心算|四則/.test(text)?'練習卷':/^image\//.test(f.mimeType)?'圖片':'其他';
 const unitMatch=(f.name+' '+f.path.split('/').pop()).match(/(?:^|[^\d])(\d{1,2}[-－]\d{1,2})(?!\d)/);
 const row={id:'drive-'+f.id,driveFileId:f.id,name:f.name,fileName:f.name,url:f.url,fileSize:f.size,mimeType:f.mimeType,subject:'數學',category,classId:'',grade,date:'2026-11-12',sourcePath:f.path,cloudFolderId:f.folderId,sourceFolderId:f.rootId,unit:unitMatch?unitMatch[1].replace('－','-'):'',tags:/心算/.test(text)?'心算':'',note:''};
 row.stage=c.materialStage(row);const parts=c.englishMaterialParts(row);if(parts.paper!=='未標卷別')row.paperNumber=parts.paper;
 const k=key(row),old=idMap.get(f.id)||(k&&keyMap.get(k));
 if(old){if(old.driveFileId===f.id)old.sourcePaths=[...new Set([old.sourcePath,...(old.sourcePaths||[]),f.path].filter(Boolean))];else{if(!old.alternateFiles)old.alternateFiles=[];if(!old.alternateFiles.some(a=>a.driveFileId===f.id))old.alternateFiles.push({driveFileId:f.id,url:f.url,fileName:f.name,sourcePath:f.path,fileSize:f.size,mimeType:f.mimeType});}idMap.set(f.id,old);duplicates++;continue;}
 rows.push(row);idMap.set(f.id,row);if(k)keyMap.set(k,row);added++;categories[category]=(categories[category]||0)+1;
}
const combined=[...new Map([...oldFolders,...folders].map(f=>[f.id,f])).values()];assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);for(const f of files)assert(idMap.has(f.id));
fs.writeFileSync('教材匯入/教材庫-加入數學.json',JSON.stringify(rows));fs.writeFileSync('教材匯入/教材資料夾-加入數學.json',JSON.stringify(combined));fs.writeFileSync('教材匯入/數學匯入摘要.json',JSON.stringify({added,duplicates,total:rows.length,folders:folders.length,totalFolders:combined.length,categories},null,2));console.log(JSON.stringify({added,duplicates,total:rows.length,folders:folders.length,totalFolders:combined.length,categories}));
