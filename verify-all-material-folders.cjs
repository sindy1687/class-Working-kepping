const fs=require('fs'),vm=require('vm'),assert=require('assert');const rows=require('./教材匯入/教材庫-全部雲端套用.json'),folders=require('./教材匯入/全部雲端資料夾.json'),files=require('./教材匯入/全部雲端檔案.json');
const ctx={data:{attachments:rows,meta:{materialFolders:folders}},document:{addEventListener(){}},esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/material-folders.js','utf8'),ctx);
const html=ctx.materialCloudFolders();for(const f of folders)assert(html.includes('data-mat-folder="'+ctx.esc(f.path)+'"'),'missing folder '+f.path);
const represented=new Map();for(const m of rows){if(m.driveFileId)represented.set(m.driveFileId,m);for(const a of m.alternateFiles||[])represented.set(a.driveFileId,m);}
for(const f of files){assert(represented.has(f.id));assert(ctx.materialInFolder(represented.get(f.id),f.path));}
assert.equal(folders.length,611);assert.equal(files.length,5697);assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);
console.log('PASS: all 611 source folders visible, all 5697 cloud files accessible in their exact original paths, unique material IDs');
