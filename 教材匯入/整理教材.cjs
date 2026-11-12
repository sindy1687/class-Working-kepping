const fs=require('fs'),assert=require('assert');
const dir=__dirname,source=JSON.parse(fs.readFileSync(dir+'/來源檔案清單.json','utf8'));
const before=Buffer.from(fs.readFileSync(dir+'/最新教材.base64','utf8').trim(),'base64').toString('utf8'),existing=JSON.parse(before);
fs.writeFileSync(dir+'/匯入前教材備份.json',before);
const driveId=m=>m.driveFileId||String(m.url||'').match(/\/(?:d|folders)\/([\w-]+)|[?&]id=([\w-]+)/)?.slice(1).find(Boolean)||'';
const known=new Set(existing.map(driveId).filter(Boolean)),added=[],counts={};
for(const f of source){
 if(known.has(f.id))continue;
 const full=f.path+'/'+f.name;
 let category=/答案|解答/.test(full)?'解答':/檢定/.test(full)?'檢定卷':/檢測/.test(full)?'檢測卷':/課本|教科書/.test(full)?'課本':/前測/.test(full)?'考卷':/練習|複習/.test(full)||/^R\d/i.test(f.name)?'練習卷':/image\//.test(f.mimeType)?'圖片':/檢核卡|學習單/.test(full)?'學習單':'其他';
 const name=f.name.replace(/^\d{12,}_/,'').replace(/\.(docx?|pdf|png|jpe?g|url)$/i,'').trim();
 const units=[...new Set((name.match(/(?:III|II|I)-\d{1,2}|\bL\s*\d{1,2}|\bR\s*\d{1,2}/gi)||[]).map(x=>x.replace(/\s/g,'').toUpperCase()))];
 const tags=[...new Set(['博幼',...f.path.split('/').slice(1),...units,...(/國中/.test(full)?['國中']:[]),...(/國小/.test(full)?['國小']:[]),...(/前測/.test(full)?['前測']:[]),...(/舊/.test(full)?['舊版']:[]),...(/需編輯|未編完/.test(full)?['需編輯']:[])])].join('、');
 added.push({id:'drive-'+f.id,name,url:f.url,driveFileId:f.id,fileName:f.name,fileSize:Number(f.size)||0,mimeType:f.mimeType,classId:'',subject:'英文',category,grade:'',unit:units.join('、'),tags,date:'2026-11-11',note:'來源資料夾：'+f.path,sourceFolderId:'1C-msNYT0lVPBRgDDJKu6czndASfR3tFc',sourcePath:f.path});
 known.add(f.id);counts[category]=(counts[category]||0)+1;
}
const merged=[...existing,...added];assert.equal(new Set(merged.map(x=>x.id)).size,merged.length);assert.deepEqual(merged.slice(0,existing.length),existing);assert(added.every(x=>x.url.startsWith('https://')));
fs.writeFileSync(dir+'/教材庫-已整理.json',JSON.stringify(merged));
fs.writeFileSync(dir+'/匯入摘要.json',JSON.stringify({source:'新版英文上課資料',sourceFiles:source.length,existing:existing.length,added:added.length,skipped:source.length-added.length,total:merged.length,categories:counts},null,2));
console.log(JSON.stringify({existing:existing.length,added:added.length,total:merged.length,categories:counts}));
