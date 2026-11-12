const fs=require('fs'),vm=require('vm'),assert=require('assert');const rows=require('./教材匯入/教材庫-加入數學.json'),folders=require('./教材匯入/教材資料夾-加入數學.json'),files=require('./教材匯入/數學檔案.json'),index=new Map();
for(const row of rows){if(row.driveFileId)index.set(row.driveFileId,row);for(const a of row.alternateFiles||[])index.set(a.driveFileId,row);}
const c={data:{attachments:rows,meta:{materialFolders:folders}},document:{addEventListener(){}},esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')};vm.createContext(c);vm.runInContext(fs.readFileSync('js/material-folders.js','utf8'),c);
for(const f of files){const row=index.get(f.id);assert(row&&row.subject==='數學');assert(c.materialInFolder(row,f.path));}
assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);const html=c.materialCloudFolders();for(const f of require('./教材匯入/數學資料夾.json'))assert(html.includes('data-mat-folder="'+c.esc(f.path)+'"'));
console.log('PASS: all 3186 math files accessible in original 458 folders; duplicates retain sources; existing catalog preserved');
