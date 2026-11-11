const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('js/app.js','utf8');let backups=0;
const ctx=vm.createContext({data:{grades:[{id:'a',section:'每週單字',classId:'c1',date:'2026-11-10'},{id:'b',section:'每週單字',classId:'c2',date:'2026-11-10'},{id:'c',section:'數學檢測',classId:'c1',date:'2026-11-10'}]},gClass:'c1',gExtraDates:['2026-11-10'],gClassOf:g=>g.classId,className:String,confirm:()=>true,exportData:()=>backups++,changed(){},render(){},toast(){}});
vm.runInContext(src.slice(src.indexOf('function dailyDateRecords('),src.indexOf('function dailyView(')),ctx);
ctx.removeDailyDate('2026-11-10');assert.equal(ctx.data.grades.length,2);assert.ok(ctx.data.grades.some(g=>g.id==='b'));assert.ok(ctx.data.grades.some(g=>g.id==='c'));assert.equal(ctx.gExtraDates.length,0);assert.equal(backups,1);
console.log('PASS: delete date restricted to selected class and weekly test, other records preserved, backup requested');
