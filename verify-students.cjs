const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('js/app.js','utf8'),ctx=vm.createContext({});
vm.runInContext(src.slice(src.indexOf('function gradeNum('),src.indexOf('// 排課規則：週一')),ctx);
vm.runInContext(src.slice(src.indexOf('function canonicalGrade('),src.indexOf('const modules=')),ctx);
for(const [input,expected] of [['3年級','三年級'],['３','三年級'],['六年級','六年級'],['國一','七年級'],['國中二年級','八年級'],['9','九年級'],['高中一年級','高中一年級'],['','']])assert.equal(ctx.canonicalGrade(input),expected,input);
assert.ok(src.includes('id="studentGradeFilter"'));assert.ok(src.includes('class="student-table"'));assert.ok(src.includes("studentStatusFilter==='archived'"));
console.log('PASS: consistent grade labels, full-width digits, junior-high mapping, unknown grade preservation, roster filters');
