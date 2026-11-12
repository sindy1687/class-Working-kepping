const fs=require('fs'),vm=require('vm'),assert=require('assert');const ctx={data:{meta:{}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/cleaning-cycle.js','utf8'),ctx);
const jobs=Array.from({length:7},(_,i)=>'job'+i),students=jobs.map((_,i)=>({id:'s'+i})),seen=new Map(students.map(s=>[s.id,new Set()]));let previous=[],first;
for(let round=0;round<7;round++){
 const rows=ctx.assignCleaningCycle(jobs,students,'c','2026-11-11',previous);
 if(!first)first=JSON.stringify(rows);
 assert.equal(new Set(rows.map(r=>r.studentId)).size,7);
 rows.forEach(r=>{seen.get(r.studentId).add(r.area);assert(!previous.some(p=>p.area===r.area&&p.studentId===r.studentId));});
 previous=rows.map(r=>({...r,date:'2026-11-11'}));
}
seen.forEach(areas=>assert.equal(areas.size,7));
assert.equal(JSON.stringify(ctx.assignCleaningCycle(jobs,students,'c','2026-11-11',previous)),first);
const restored={data:JSON.parse(JSON.stringify(ctx.data))};vm.createContext(restored);vm.runInContext(fs.readFileSync('js/cleaning-cycle.js','utf8'),restored);assert.equal(restored.assignCleaningCycle(jobs,students,'c','2026-11-11')[0].studentId,'s1');
assert.equal(ctx.assignCleaningCycle(jobs,[students[0]],'small','2026-11-11').length,7);
console.log('PASS: every student covers all 7 jobs before repeat; persisted cycle resumes; insufficient roster covered');
