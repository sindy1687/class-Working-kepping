const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const src=fs.readFileSync('js/app.js','utf8');
const ctx=vm.createContext({scoreOf:g=>g.score===''||g.score==null?null:Number(g.score),gPass:()=>80,gMax:()=>100});
vm.runInContext(src.slice(src.indexOf('function gStatus('),src.indexOf('function gradeRows(')),ctx);
vm.runInContext(src.slice(src.indexOf('const gCellVal='),src.indexOf('function gCell(')),ctx);
const pass=ctx.gParse('pass');assert.equal(pass.passed,true);assert.equal(ctx.gStatus(pass)[0],'good');ctx.testGrade=pass;assert.equal(vm.runInContext('gCellVal(testGrade)',ctx),'PASS');assert.equal(vm.runInContext('gPct(testGrade)',ctx),null);
assert.equal(ctx.gParse('80').passed,false);assert.equal(ctx.gParse('免').passed,false);assert.equal(ctx.gParse('通過').passed,true);
vm.runInContext(src.slice(src.indexOf('function gSummary('),src.indexOf('function gBar(')>0?src.indexOf('function gBar('):src.indexOf('function gRow(')),ctx);
const summary=ctx.gSummary([pass,ctx.gParse('60')]);assert.equal(summary.avg,60);assert.equal(summary.good,1);assert.equal(summary.scored,2);
console.log('PASS: case-insensitive PASS, passing status, excluded numeric averages, pass counts and replacement by numeric scores');
