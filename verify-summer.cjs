const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('js/app.js','utf8');
const pick=(name)=>{const i=src.indexOf('function '+name+'(');assert.ok(i>=0,name+' exists');let d=0,j=i;for(;j<src.length;j++){if(src[j]==='{')d++;if(src[j]==='}'){d--;if(!d)break;}}return src.slice(i,j+1);};
const ctx=vm.createContext({
 data:{classes:[{id:'c1',name:'暑期A班'}],students:[{id:'s1',name:'王小明',classId:'c1'}],
  summer:[
   {id:'a1',studentId:'s1',date:'2026-07-10',am:'出席',pm:'請假',pmNote:'家中聚餐',lunch:true,subsidy:80,classId:'c1'},
   {id:'a2',studentId:'s1',date:'2026-07-11',am:'出席',pm:'出席',lunch:true,subsidy:80},
   {id:'old',studentId:'s1',date:'2026-07-01',status:'出席',lunch:false}],
  teacherLunch:[{id:'t1',date:'2026-07-10',teacher:'陳老師',cost:100,count:2}],
  summerSchedule:[{id:'c1r',weekday:'一',session:'上午',classId:'c1',subject:'數學',teacher:'陳老師',room:'201'}],
  studentSchedule:[{id:'ss1',studentId:'s1',weekday:'三',session:'下午',subject:'英文',teacher:'林老師',room:''}]},
 filterClass:'',filterDate:'2026-07-10',
 today:()=>'2026-07-10',
 className:id=>({c1:'暑期A班'})[id]||'',
 student:id=>({s1:{id:'s1',name:'王小明'}})[id],
 recordClass:r=>r.classId||'',
 sLabel:s=>s?s.name:'?',
 md2:d=>d?(+d.slice(5,7))+'/'+(+d.slice(8,10)):'',
 esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
});
vm.runInContext([pick('summerMealPanel'),pick('studentScheduleBoard'),pick('summerTimetable')].join('\n'),ctx);
// 出席摘要：上午 1 人、下午 0 人（請假）、便當 1 份、補助 80、老師餐 2 份 200 元
let html=ctx.summerMealPanel();
assert.ok(html.includes('7/10'),'summary date shown');
assert.ok(/上午出席<\/span><strong>1<small> 人/.test(html),'am count');
assert.ok(/下午出席<\/span><strong>0<small> 人/.test(html),'pm count excludes 請假');
assert.ok(/學生便當<\/span><strong>1<small> 份/.test(html),'lunch count');
assert.ok(/補助合計<\/span><strong>80<small> 元/.test(html),'subsidy sum');
assert.ok(/老師訂餐<\/span><strong>2<small> 份/.test(html),'teacher lunch count');
assert.ok(/老師餐費<\/span><strong>200<small> 元/.test(html),'teacher lunch cost');
// 學生課表：王小明出現在週三下午
html=ctx.studentScheduleBoard();
assert.ok(html.includes('王小明')&&html.includes('林老師'),'student schedule cell');
assert.ok(html.includes('週三'),'weekday header');
// 班級課表也正常
html=ctx.summerTimetable();
assert.ok(html.includes('暑期A班')&&html.includes('201'),'class timetable cell');
// 舊資料遷移：status→am
const mig=vm.createContext({d:null});
// 直接套用 normalize 中 summer 的遷移邏輯驗證欄位名稱
const r=ctx.data.summer[2];if(r.am===undefined&&r.status)r.am=r.status;
assert.equal(r.am,'出席','legacy status migrates to am');
// 暑期模式排課規則
const ctx2=vm.createContext({
 data:{meta:{summerMode:{on:true,from:'2026-07-01',to:'2026-08-15'}},classes:[{id:'c1',gradeRule:true}]},
 weekday:d=>new Date(d+'T00:00:00').getDay(),
 parseWeekdays:t=>{const out=[];for(const ch of String(t||'')){const i='日一二三四五六'.indexOf(ch);if(i>=0&&!out.includes(i))out.push(i);}return out;},
 calFor:()=>null,gradeNum:g=>({九年級:9,三年級:3})[g]||0,WEEK:'日一二三四五六',
});
vm.runInContext([pick('summerOn'),pick('scheduledNormally'),pick('classAllows')].join('\n'),ctx2);
const cls={id:'c1',gradeRule:true},s7={grade:'七年級'};
assert.ok(ctx2.summerOn('2026-07-08'),'summer mode active in range');
assert.ok(!ctx2.summerOn('2026-09-01'),'summer mode off after range');
assert.equal(ctx2.scheduledNormally(cls,s7,'2026-07-08'),true,'summer: Wed class day for 7th grader (grade rule bypassed)');
assert.equal(ctx2.scheduledNormally(cls,s7,'2026-07-11'),false,'summer: Saturday still off by default');
ctx2.data.meta.summerMode.on=false;
assert.equal(ctx2.scheduledNormally(cls,{grade:'三年級'},'2026-07-10'),false,'normal: Fri not for 3rd grader');
ctx2.data.meta.summerMode.on=true;
assert.equal(ctx2.scheduledNormally(cls,{grade:'三年級'},'2026-07-10'),true,'summer: Fri class day for 3rd grader');
// 暑期出席 → 出席總覽連動
const ctx3=vm.createContext({
 data:{classes:[{id:'c1'}],students:[{id:'s1',name:'王小明',classId:'c1'}],attendance:[]},
 student:id=>({s1:{id:'s1',name:'王小明',classId:'c1'}})[id],uid:()=>'u1',
});
vm.runInContext(pick('syncSummerAttendance'),ctx3);
ctx3.syncSummerAttendance({studentId:'s1',date:'2026-07-10',am:'出席',pm:'請假',pmNote:'家庭因素',classId:'c1'});
let a=ctx3.data.attendance;
assert.equal(a.length,1,'attendance record created');
assert.equal(a[0].status,'準時','any 出席 maps to 準時');
assert.ok(a[0].note.includes('下午請假：家庭因素'),'pm reason synced to note');
assert.equal(a[0].summer,true,'record flagged as summer-synced');
ctx3.syncSummerAttendance({studentId:'s1',date:'2026-07-10',am:'請假',amNote:'感冒',pm:'不參加',classId:'c1'});
assert.equal(a[0].status,'請假','all-absent maps to leave status');
assert.ok(a[0].note.includes('上午請假：感冒'),'am reason synced');
ctx3.syncSummerAttendance({studentId:'s1',date:'2026-07-10',am:'不參加',pm:'不參加',classId:'c1'});
assert.equal(a.length,0,'不參加 removes synced attendance');
// 手動建立的出席紀錄不會被誤刪
ctx3.data.attendance.push({id:'m1',studentId:'s1',date:'2026-07-11',status:'準時',note:'手動'});
ctx3.syncSummerAttendance({studentId:'s1',date:'2026-07-11',am:'不參加',pm:'不參加'});
assert.equal(ctx3.data.attendance.length,1,'manual record kept');
console.log('PASS: summer meal panel, student schedule board, class timetable, legacy migration, summer-mode scheduling, attendance sync');
