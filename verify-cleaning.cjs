const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({document:{addEventListener(){}}});vm.runInContext(fs.readFileSync('js/cleaning.js','utf8'),ctx);
const jobs=['掃地','拖地','擦桌'],students=[{id:'a'},{id:'b'},{id:'c'}],history=jobs.map((area,i)=>({area,studentId:students[i].id,date:'2026-11-09'}));
const assigned=ctx.assignCleaningJobs(jobs,students,history,'2026-11-10');assert.equal(assigned.length,3);assert.equal(new Set(assigned.map(a=>a.studentId)).size,3);assert.ok(assigned.every(a=>!history.some(h=>h.studentId===a.studentId&&h.area===a.area)));
const next=ctx.assignCleaningJobs(jobs,students,[...history,...assigned.map(a=>({...a,date:'2026-11-10'}))],'2026-11-11');assert.ok(next.every(a=>!assigned.some(h=>h.studentId===a.studentId&&h.area===a.area)));
assert.equal(ctx.assignCleaningJobs(jobs,[],history,'2026-11-10').length,0);assert.equal(ctx.assignCleaningJobs(jobs,[{id:'a'}],history,'2026-11-10').length,3);
const seen=new Set();for(let i=0;i<12;i++)seen.add(JSON.stringify(ctx.assignCleaningJobs(jobs,students,history,'2026-11-10').map(a=>a.studentId)));
assert.ok(seen.size>1,'rotation should vary across runs');
console.log('PASS: job coverage, unique daily assignments, avoidance of consecutive same work, rotation and insufficient roster handling');
