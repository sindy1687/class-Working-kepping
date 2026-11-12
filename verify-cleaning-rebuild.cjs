const fs=require('fs'),vm=require('vm'),assert=require('assert');const ctx={document:{addEventListener(){}},Math};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/cleaning.js','utf8'),ctx);
const jobs=Array.from({length:7},(_,i)=>'工作'+i),students=jobs.map((_,i)=>({id:'s'+i}));
let previous=jobs.map((area,i)=>({area,studentId:students[i].id,date:'2026-11-09'}));
for(let i=0;i<40;i++){
 const rows=ctx.assignCleaningJobs(jobs,students,[],'2026-11-09',previous);
 assert.equal(rows.length,7);assert.equal(new Set(rows.map(r=>r.studentId)).size,7);
 rows.forEach(r=>assert(!previous.some(p=>p.area===r.area&&p.studentId===r.studentId)));
 previous=rows.map(r=>({...r,date:'2026-11-09'}));
}
const one=ctx.assignCleaningJobs(jobs,[students[0]],[],'2026-11-09',previous);assert.equal(one.length,7);
console.log('PASS: 40 consecutive rebuilds change every job, unique daily students, insufficient roster fallback');
