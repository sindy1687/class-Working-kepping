const fs=require('fs'),vm=require('vm'),assert=require('assert');let saves=0,id=0;
const ctx={document:{addEventListener(){}},isOnline:()=>false,classStudents:()=>[{id:'a'},{id:'b'}],cleaningJobs:()=>['掃地','拖地'],today:()=> '2026-11-11',addDays:(s,i)=>'2026-11-'+String(Number(s.slice(-2))+i).padStart(2,'0'),allowedOn:(s,d)=>d==='2026-11-11',uid:()=> 'new'+(++id),changed:()=>saves++,data:{cleaning:[{id:'past',classId:'c',date:'2026-11-09',area:'掃地',studentId:'a',note:'自動輪替'},{id:'off',classId:'c',date:'2026-11-12',area:'掃地',studentId:'a',note:'自動輪替'},{id:'manual',classId:'c',date:'2026-11-13',area:'掃地',studentId:'a',note:'手動'},{id:'done',classId:'c',date:'2026-11-14',area:'掃地',studentId:'a',note:'自動輪替',done:true}]}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/cleaning.js','utf8'),ctx);vm.runInContext(fs.readFileSync('js/cleaning-schedule.js','utf8'),ctx);
// Feature declarations in cleaning.js are overridden with fixtures for this isolated schedule test.
ctx.cleaningJobs=()=>['掃地','拖地'];
assert(ctx.syncCleaningSchedule('c','2026-11-09'));assert(!ctx.data.cleaning.some(r=>r.id==='off'));
for(const key of ['past','manual','done'])assert(ctx.data.cleaning.some(r=>r.id===key));
assert.equal(ctx.data.cleaning.filter(r=>r.date==='2026-11-11').length,2);assert.equal(saves,1);
assert.equal(ctx.syncCleaningSchedule('c','2026-11-09'),false);assert.equal(saves,1);
console.log('PASS: scheduled days only, remove off-day auto assignments, preserve history/manual/completed, idempotent sync');
