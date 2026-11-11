const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/app.js','utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const ctx=vm.createContext({
 gStatus:g=>g.score>=80?['good','通過']:['low','未通過'],
 isLeaveAtt:()=>false,attWhy:()=>'',ATT_CODE:{},
 esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
});
vm.runInContext(slice('const gCellVal','const isLeaveAtt'),ctx);
// 單元檢測格：title 要含考試日期
const cell=ctx.gCell('u|s1|L19|A',{score:94,date:'2026-11-05'},'',0,'L19|A','王小明 L19 A 卷');
assert.ok(cell.includes('2026-11-05'),'hover title should show exam date');
assert.ok(cell.includes('title="王小明 L19 A 卷　2026-11-05　通過'),'date appears between label and status');
// 每週單字格：label 已含日期，不重複顯示
const daily=ctx.gCell('d|s1|2026-11-05',{score:90,date:'2026-11-05'},'',0,'2026-11-05','王小明 2026-11-05');
assert.ok(!daily.includes('2026-11-05　2026-11-05'),'daily cell must not duplicate the date');
// 未登記格：無日期也不壞
const empty=ctx.gCell('u|s2|L19|B',null,'',1,'L19|B','李小華 L19 B 卷');
assert.ok(empty.includes('未登記'),'empty cell still renders');
console.log('PASS: gCell hover shows exam date, no duplication on date-labelled cells');
