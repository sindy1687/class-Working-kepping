const fs=require('fs'),vm=require('vm'),assert=require('assert');const ctx={data:{meta:{},cleaning:[]}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/cleaning-cycle.js','utf8'),ctx);
const jobs=Array.from({length:7},(_,i)=>'job'+i),students=jobs.map((_,i)=>({id:'s'+i}));
let previous=[];
for(let rebuild=0;rebuild<5;rebuild++){
 ctx.data.cleaning=[];
 for(let day=1;day<=21;day++){
  const date='2026-11-'+String(day).padStart(2,'0');
  const rows=ctx.assignCleaningCycle(jobs,students,'c',date,previous);
  ctx.data.cleaning.push(...rows.map(r=>({...r,classId:'c',date})));
 }
 for(const area of jobs){const column=ctx.data.cleaning.filter(r=>r.area===area);for(let i=0;i<=14;i++)assert.equal(new Set(column.slice(i,i+7).map(r=>r.studentId)).size,7,'every sliding window must contain all students, including round boundaries');}
 previous=ctx.data.cleaning.map(r=>({...r}));
}
console.log('PASS: every column completes all 7 students before repeating over 21 dates and 5 rebuilds');
