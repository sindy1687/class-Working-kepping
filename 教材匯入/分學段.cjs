const fs=require('fs'),vm=require('vm'),assert=require('assert'),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/material-stage.js','utf8'),ctx);
const rows=JSON.parse(fs.readFileSync('教材匯入/分學段前.json','utf8')),counts={};
for(const row of rows){row.stage=ctx.materialStage(row);counts[row.stage]=(counts[row.stage]||0)+1;}
assert.equal(rows.length,1551);fs.writeFileSync('教材匯入/教材庫-已分學段.json',JSON.stringify(rows));console.log(JSON.stringify(counts));
