'use strict';
let gradeStudentFilter='',gradeTitleFilter='';
function gradeSearchMatch(g){return (!gradeStudentFilter||g.studentId===gradeStudentFilter)&&(!gradeTitleFilter||g.title===gradeTitleFilter);}
function gradeSelectedStudents(cls){return classStudents(cls).filter(s=>!gradeStudentFilter||s.id===gradeStudentFilter);}
function gradeSearchSelects(matrix,cls=gClass,sec=gSec){
 const students=classStudents(cls),recs=data.grades.filter(g=>(sec==='all'||g.section===sec)&&(!cls||gClassOf(g)===cls));
 if(gradeStudentFilter&&!students.some(s=>s.id===gradeStudentFilter))gradeStudentFilter='';
 const titles=[...new Set(recs.map(g=>g.title).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant',{numeric:true}));
 if(gradeTitleFilter&&!titles.includes(gradeTitleFilter))gradeTitleFilter='';
 return '<label>選擇學生<select id="gradeStudentFilter"><option value="">全部學生</option>'+students.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===gradeStudentFilter?'selected':'')+'>'+esc(sLabel(s))+'</option>').join('')+'</select></label>'+(matrix?'':'<label>選擇測驗／單元<select id="gradeTitleFilter"><option value="">全部測驗／單元</option>'+titles.map(t=>'<option value="'+esc(t)+'" '+(t===gradeTitleFilter?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>');
}
document.addEventListener('change',e=>{if(e.target.id==='gradeStudentFilter'){gradeStudentFilter=e.target.value;render();}if(e.target.id==='gradeTitleFilter'){gradeTitleFilter=e.target.value;render();}if(e.target.id==='gClass'||e.target.id==='classFilter'){gradeStudentFilter='';gradeTitleFilter='';}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&(b.dataset.gtab||['gClear','clearFilters'].includes(b.dataset.action))){gradeStudentFilter='';gradeTitleFilter='';}});
