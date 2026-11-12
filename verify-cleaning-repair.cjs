const fs=require('fs'),vm=require('vm'),assert=require('assert');let id=0;const jobs=Array.from({length:7},(_,i)=>'job'+i),students=jobs.map((_,i)=>({id:'s'+i})),dates=Array.from({length:21},(_,i)=>'2026-11-'+String(i+1).padStart(2,'0'));
const ctx={data:{meta:{},cleaning:[]},isOnline:()=>false,classStudents:()=>students,cleaningJobs:()=>jobs,today:()=>dates[0],allowedOn:()=>true,uid:()=>String(++id),changed(){}};
vm.createContext(ctx);for(const file of ['cleaning-cycle','cleaning-schedule'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);
// 舊表每一天完全相同，開啟頁面就應修復，而且重開不再更動。
for(const date of dates)jobs.forEach((area,i)=>ctx.data.cleaning.push({id:String(++id),classId:'c',date,area,studentId:students[i].id,note:'自動輪替',done:false}));
assert(ctx.syncCleaningSchedule('c',dates[0],dates));
for(const area of jobs){const column=ctx.data.cleaning.filter(r=>r.area===area);for(let i=0;i<=14;i++)assert.equal(new Set(column.slice(i,i+7).map(r=>r.studentId)).size,7);}
const before=JSON.stringify(ctx.data);assert.equal(ctx.syncCleaningSchedule('c',dates[0],dates),false);assert.equal(JSON.stringify(ctx.data),before);
console.log('PASS: repairs repeated legacy columns, no duplicates across round boundaries, repeated viewing is stable');
