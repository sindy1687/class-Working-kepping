const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/app.js','utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
// Real date helpers so week cells map to real days
const addDays=(d,i)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+i);return x.toISOString().slice(0,10);};
const weekday=d=>new Date(d+'T00:00:00').getDay();
const nodes={content:{}};
const ctx=vm.createContext({
 data:{
  classes:[{id:'c1',weekdays:[1,3,5]}],
  journals:[],
  attendance:[{studentId:'s1',date:'2026-11-11',classId:'c1',status:'事假'}],
 },
 jClass:'c1',jDate:'2026-11-11',
 classById:id=>ctx.data.classes.find(c=>c.id===id),
 classStudents:()=>[{id:'s1',name:'阿明'},{id:'s2',name:'小華'}],
 weekStartOf:()=>'2026-11-09',addDays,weekday,parseWeekdays:w=>w,
 allowedOn:()=>true,holidayOff:()=>null,holTag:h=>h,attWhy:()=>'',
 getWeekObs:()=>null,modules:{'學生週誌':{desc:''}},head:()=>'',classStrip:()=>'',classSelect:()=>'',
 weekLabel:ws=>ws,recordClass:r=>r.classId||'',sortTasks:a=>a,tTime:()=>'',formatAssessmentPaper:s=>s,
 esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),md2:d=>d?(+String(d).slice(5,7))+'/'+(+String(d).slice(8,10)):'',WEEK:'日一二三四五六',
 $:id=>nodes[id],toast(){},
});
vm.runInContext(slice('const needWhy','function updateAttendanceReasonUI')+'\n'+slice('const ATT=','const READ_TYPES')+'\n'+slice('function journalWeek','function attendancePage')+'\nglobalThis.isAbsentAtt=isAbsentAtt;',ctx);
// isAbsentAtt semantics
for(const st of['準時','遲到','早退'])assert.equal(ctx.isAbsentAtt({status:st}),false,st);
for(const st of['缺席','病假','事假','公假'])assert.equal(ctx.isAbsentAtt({status:st}),true,st);
assert.equal(ctx.isAbsentAtt(null),false);assert.equal(ctx.isAbsentAtt(undefined),false);
// Weekly view: absent student gets no add-journal button on that day
ctx.journalWeek('');
const html=nodes.content.innerHTML;
assert.ok(!html.includes('data-jnewd="s1|2026-11-11"'),'absent day must not offer ＋週誌');
assert.ok(html.includes('data-jnewd="s2|2026-11-11"'),'unrecorded day still offers ＋週誌');
assert.ok(html.includes('data-jnewd="s1|2026-11-09"'),'absent student other days still offer ＋週誌');
assert.ok(html.includes('事假'),'absent status still rendered');
// Existing journal on absent day stays editable, not blocked
ctx.data.journals.push({id:'j1',studentId:'s1',classId:'c1',date:'2026-11-11',tasks:[],readings:[]});
ctx.journalWeek('');
assert.ok(nodes.content.innerHTML.includes('data-jedit="j1"'),'existing journal on absent day stays editable');
// Source-level guards for daily card and batch selection
assert.ok(/abs=isAbsentAtt\(a\)/.test(source),'daily card computes abs');
assert.ok(source.includes('今日未到，不需寫週誌'),'daily card absent message');
assert.ok(/!ab&&allowedOn\(st,date,jClass\)/.test(source),'batch picker skips absent students');
assert.ok(source.includes('未到，免寫'),'batch picker absent label');
console.log('PASS: absent students need no journal (week cell, existing journal edit, batch guard, isAbsentAtt)');
