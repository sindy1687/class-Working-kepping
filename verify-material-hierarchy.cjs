const fs=require('fs'),vm=require('vm'),assert=require('assert');const nodes={content:{}};
const c={data:{classes:[],attachments:JSON.parse(fs.readFileSync('教材匯入/教材庫-英文細分類.json','utf8'))},document:{addEventListener(){}},head:()=>'',className:()=>'',esc:v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),$:id=>nodes[id]};vm.createContext(c);
for(const file of ['material-stage','material-english','material-formats','material-folders','material-list','materials'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),c);
vm.runInContext("matSubject='英文';matCat='檢測卷';matBook='初上';matPaper='1卷';",c);
const rows=c.materialRows();assert(rows.length>0);assert(rows.every(m=>m.category==='檢測卷'&&c.englishMaterialParts(m).book==='初上'&&c.englishMaterialParts(m).paper==='1卷'));
c.materialsPage();assert(nodes.content.innerHTML.includes('英文 › 檢測卷 › 初上 › 1卷'));assert(nodes.content.innerHTML.includes('data-mat-book'));assert(nodes.content.innerHTML.includes('data-mat-paper'));assert(!nodes.content.innerHTML.includes('ul-card'));
console.log('PASS: actual cloud materials cascade English > assessment > beginner upper > volume 1, list layout retained ('+rows.length+' matching files)');
