const fs=require('fs'),vm=require('vm'),assert=require('assert');const old={id:'g1',section:'數學檢測',classId:'c1',studentId:'s1',date:'2026-11-10',title:'5-1',paper:'1',score:'78',passed:false,note:'原備註'},other={...old,id:'g2',date:'2026-11-11'};
const c={data:{grades:[old,other]},gClassOf:g=>g.classId,document:{addEventListener(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/math-record-editor.js','utf8'),c);
const values={studentId:'s1',date:'2026-11-12',title:'5-2',paper:'2',resultState:'score',score:'92',maxScore:'100',passScore:'80',note:'修改後'};
const next=c.mathRecordEditValues(old,values);assert.equal(next.id,'g1');assert.equal(next.score,'92');assert.equal(next.date,'2026-11-12');assert.equal(old.score,'78');assert.equal(other.date,'2026-11-11');
const pass=c.mathRecordEditValues(old,{...values,resultState:'passed',score:''});assert.equal(pass.passed,true);assert.equal(pass.score,'');assert.equal(pass.absent,false);
assert.equal(c.mathRecordEditValues({...old,passed:true},{...values,score:'0'}).passed,false);
assert.throws(()=>c.mathRecordEditValues(old,{...values,score:'101'}),/分數/);assert.throws(()=>c.mathRecordEditValues(old,{...values,passScore:'101'}),/通過/);assert.throws(()=>c.mathRecordEditValues(old,{...values,date:'2026-11-11',title:'5-1',paper:'1'}),/已有成績/);
assert.equal(c.mathRecordEditValues(old,{...values,date:old.date,title:old.title,paper:old.paper}).id,old.id);
console.log('PASS: edit exact record fields, retain other history, PASS/numeric transitions, score thresholds, duplicate protection');
