const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const src=fs.readFileSync('js/app.js','utf8');
const ctx=vm.createContext({document:{addEventListener(){}},READ_TYPES:['繪本','橋樑書','文字書','KIST','國內外大事','大量閱讀'],normTitle:s=>String(s).replace(/\s/g,'').toLowerCase(),classById:id=>({kind:id==='r'?'閱讀':'英文'}),data:{meta:{},journals:[{studentId:'s',classId:'r',date:'2026-11-01',readings:[{title:'書一',type:'文字書',done:false}]},{studentId:'s',classId:'r',date:'2026-11-10',tasks:[{option:'大量閱讀',detail:'書一',bookId:'C1',done:false}]},{studentId:'other',classId:'r',date:'2026-11-10',readings:[{title:'書一',type:'文字書',done:false}]},{studentId:'s',classId:'e',date:'2026-11-10',readings:[{title:'書一',type:'文字書',done:true}]}]}});
vm.runInContext(src.slice(src.indexOf('function readingBookCategory('),src.indexOf('function readingClasses(')),ctx);
vm.runInContext(fs.readFileSync('js/personal-reading-editor.js','utf8'),ctx);
assert.equal(ctx.setPersonalBookStatus('s','文字書','書一',true),2);assert.equal(ctx.data.journals[0].readings[0].done,false);assert.equal(ctx.data.journals[1].tasks[0].done,true);
ctx.setPersonalBookStatus('s','文字書','書一',false);assert.equal(ctx.data.journals[1].tasks[0].done,false);assert.equal(ctx.data.journals[2].readings[0].done,false);assert.equal(ctx.data.journals[3].readings[0].done,true);
assert.notEqual(ctx.personalBookKey('s','文字書','書一'),ctx.personalBookKey('other','文字書','書一'));
console.log('PASS: editable reading state, latest completion, clearing completion, source/student/class isolation and media keys');
