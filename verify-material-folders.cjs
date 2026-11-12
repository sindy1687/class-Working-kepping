const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={document:{addEventListener(){}},data:{attachments:require('./教材匯入/教材庫-合併第二資料夾.json')},esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')};vm.createContext(c);vm.runInContext(fs.readFileSync('js/material-folders.js','utf8'),c);
const html=c.materialCloudFolders();for(const name of ['新版英文上課資料','國小檢測卷','workbook 聽力','boyo reading elementray'])assert(html.includes(name),'original folder name missing '+name);
for(const row of c.data.attachments){for(const path of c.materialFolderPaths(row))assert(c.materialInFolder(row,path));}
assert(c.materialInFolder({sourcePath:'英文/國小檢測卷/初上'},'英文/國小檢測卷'));assert(!c.materialInFolder({sourcePath:'英文/國小檢測卷2'},'英文/國小檢測卷'));
assert(c.materialInFolder({sourcePath:'舊來源',alternateFiles:[{sourcePath:'英文/初上'}]},'英文'));
console.log('PASS: original folder names and nesting, descendants, exact prefix boundaries, duplicate source paths retained');
