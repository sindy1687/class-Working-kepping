const vm=require('vm'),fs=require('fs'),assert=require('assert');let opened,values={},listeners={};
const ctx={page:'成績登記',gClass:'c1',gEntryDate:'2026-11-11',today:()=>'',gClassSubject:()=> '英文',openEditor:id=>opened=id,$:()=>({elements:{namedItem:key=>values[key]||(values[key]={})}}),document:{addEventListener:(key,fn)=>listeners[key]=fn},setTimeout,clearTimeout,Math};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/grade-long-press.js','utf8'),ctx);
ctx.openGradeCellDetails({dataset:{gradeId:'g1'}});assert.equal(opened,'g1');
ctx.openGradeCellDetails({dataset:{sid:'s1',gsec:'檢測',title:'L2',paper:'B'}});assert.equal(opened,null);assert.equal(values.studentId.value,'s1');assert.equal(values.title.value,'L2');assert.equal(values.passScore.value,'60');assert.equal(values.classId.value,'c1');
console.log('Grade full editor selects existing records and seeds empty cells correctly');
