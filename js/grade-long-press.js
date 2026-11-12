'use strict';
function openGradeCellDetails(cell){
 if(page!=='成績登記')return;
 const d=cell.dataset,id=d.gradeId;
 if(id&&typeof openMathRecordEditor==='function'&&data.grades.some(g=>g.id===id&&g.section==='數學檢測')){openMathRecordEditor(id);return;}
 openEditor(id||null);
 if(!id){
  const values={studentId:d.sid,classId:gClass,section:d.gsec,date:d.date||gEntryDate||today(),subject:gClassSubject(gClass),title:d.title||(d.gsec==='每週單字'?'每週單字測驗':''),paper:d.paper||'',maxScore:'100',passScore:d.paper==='B'?'60':'80'};
  Object.entries(values).forEach(([key,value])=>{const field=$('editForm').elements.namedItem(key);if(field)field.value=value;});
 }
}
let gradeHold=null;
function cancelGradeHold(){if(gradeHold)clearTimeout(gradeHold.timer);gradeHold=null;}
document.addEventListener('pointerdown',e=>{
 const cell=e.target.closest?.('.gcell');if(!cell||e.button!==0)return;
 cancelGradeHold();const hold={cell,x:e.clientX,y:e.clientY};gradeHold=hold;
 hold.timer=setTimeout(()=>{if(gradeHold!==hold)return;gradeHold=null;openGradeCellDetails(cell);},650);
});
document.addEventListener('pointermove',e=>{if(gradeHold&&Math.hypot(e.clientX-gradeHold.x,e.clientY-gradeHold.y)>10)cancelGradeHold();});
['pointerup','pointercancel','scroll'].forEach(type=>document.addEventListener(type,cancelGradeHold,true));
document.addEventListener('contextmenu',e=>{const cell=e.target.closest?.('.gcell');if(cell){e.preventDefault();cancelGradeHold();if(!$('editor').open)openGradeCellDetails(cell);}});
document.addEventListener('keydown',e=>{if(e.key==='F2'&&e.target.matches?.('.gcell')){e.preventDefault();openGradeCellDetails(e.target);}});
