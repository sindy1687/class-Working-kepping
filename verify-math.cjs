const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('js/app.js','utf8');
const ctx=vm.createContext({ENGLISH_TASKS:[],esc:s=>String(s??''),uid:()=> 'id'});
ctx.document={addEventListener(){}};vm.runInContext(src.slice(src.indexOf('function englishTaskData('),src.indexOf('function taskRow(')),ctx);
const html=ctx.mathTaskCard({unit:'5-1',pages:'12–15',option:'單元'});
for(const value of ['task-unit','task-pages','5-1','12–15','非數','檢測 1','檢測 2','檢測 3','檢測 4','練習卷'])assert.ok(html.includes(value),value);
assert.ok(!html.includes('task-lesson'));
assert.equal(ctx.mathTaskText({unit:'5-2',pages:'20–22',option:'非數'}),'非數 · 5-2 · 頁數 20–22');
console.log('PASS: math units, page ranges, assessment options and math-specific fields');
