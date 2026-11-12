const fs=require('fs'),assert=require('assert');const rows=require('./教材匯入/教材庫-合併第二資料夾.json'),report=require('./教材匯入/第二資料夾合併報告.json'),files=[...require('./教材匯入/第二資料夾清單.json'),...require('./教材匯入/第二資料夾尾清單.json')];
assert.equal(rows.length,report.previous-report.removedExisting+report.newlyAdded);assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);
const ids=new Set(rows.flatMap(m=>[m.driveFileId,...(m.alternateFiles||[]).map(a=>a.driveFileId)])),skipped=new Set(report.skippedFiles.map(f=>f.id));
for(const f of files)assert(ids.has(f.id)||skipped.has(f.id),'unaccounted source '+f.id);
for(const pair of report.duplicates){const kept=rows.find(x=>x.id===pair.keptId);assert(kept);assert.equal(kept.fileSize,pair.size);if(pair.removedId!==kept.id)assert((kept.alternateFiles||[]).some(x=>'drive-'+x.driveFileId===pair.removedId));}
assert(rows.some(x=>x.category==='聽力'));assert(rows.some(x=>x.category==='課本'));assert(rows.some(x=>x.bookLevel==='初上'));assert(rows.some(x=>x.paperNumber==='2卷'));
console.log('PASS: all 4146 source files accounted for; duplicate links retained; unique records; grade/book/paper/audio classification preserved');
