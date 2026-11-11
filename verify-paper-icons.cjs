const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const src=fs.readFileSync('js/app.js','utf8'),ctx=vm.createContext({esc:String});vm.runInContext(src.slice(src.indexOf('function formatAssessmentPaper('),src.indexOf('function englishTaskText(')),ctx);
assert.equal(ctx.formatAssessmentPaper('L10 檢測卷 2'),'L10 檢測卷 ②');assert.equal(ctx.formatAssessmentPaper('檢測卷1／檢測卷 4'),'檢測卷①／檢測卷 ④');assert.equal(ctx.formatAssessmentPaper('單字400 Workbook R2 檢測卷 20'),'單字400 Workbook R2 檢測卷 20');
const option=ctx.assessmentProgressOption('檢測卷 2','檢測卷 2');assert.ok(option.includes('value="檢測卷 2"'));assert.ok(option.includes('檢測卷 ②'));assert.ok(option.includes('selected'));
console.log('PASS: circled paper numbers, other numeric content preserved and original option values retained');
