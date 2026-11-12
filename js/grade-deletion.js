'use strict';
function gradeUnitTitles(){
 const titles=data.grades.filter(g=>(gSec==='all'||g.section===gSec)&&(!gClass||gClassOf(g)===gClass)).map(g=>g.title);
 if(gSec==='檢測')titles.push(...gExtraUnits);
 if(gSec==='數學檢測')titles.push(...mathAssessmentSettings(gClass).map(x=>x.title));
 return [...new Set(titles.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant',{numeric:true}));
}
function deleteGradeUnit(title){
 if(!title)return false;
 const matches=g=>g.title===title&&(gSec==='all'||g.section===gSec)&&(!gClass||gClassOf(g)===gClass),rows=data.grades.filter(matches);
 if(!confirm('確定刪除「'+title+'」單元？\n範圍：'+(gClass?className(gClass):'全部班級')+'／'+(gSec==='all'?'全部成績類別':gSec)+'\n將刪除所有日期、所有卷別共 '+rows.length+' 筆成績及此單元的成績設定，不受月份篩選限制。刪除前會下載備份。'))return false;
 exportData();data.grades=data.grades.filter(g=>!matches(g));
 if(gSec==='檢測')gExtraUnits=gExtraUnits.filter(x=>x!==title);
 if(gSec==='數學檢測'||gSec==='all'){
  const settings=data.meta.mathAssessments||{};
  Object.keys(settings).filter(k=>!gClass||k===gClass).forEach(k=>{settings[k]=settings[k].filter(x=>x.title!==title);});
 }
 changed();render();toast('已刪除單元「'+title+'」。');return true;
}
function openGradeUnitDeletion(){
 const titles=gradeUnitTitles();if(!titles.length){toast('目前沒有可刪除的成績單元。');return;}
 let d=document.getElementById('gradeUnitDeletionDialog');if(!d){d=document.createElement('dialog');d.id='gradeUnitDeletionDialog';document.body.appendChild(d);}
 d.innerHTML='<h2>刪除成績單元</h2><p>刪除目前班級及成績類別中，該單元所有日期與卷別的成績。</p><label>選擇單元<select id="gradeUnitToDelete">'+titles.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('')+'</select></label><div class="dialogfoot"><button data-grade-unit-close>取消</button><button class="danger" data-grade-unit-confirm>刪除單元</button></div>';d.showModal();
}
function deleteRegisteredGrades(ids){
 const selected=new Set(ids),rows=data.grades.filter(g=>selected.has(g.id));
 if(!rows.length){toast('沒有可刪除的成績。');return false;}
 if(!confirm('確定刪除 '+rows.length+' 筆成績？刪除前會下載備份，學生及週誌資料會保留。'))return false;
 exportData();
 data.grades=data.grades.filter(g=>!selected.has(g.id));
 changed();render();toast('已刪除 '+rows.length+' 筆成績。');return true;
}
function openGradeDeletion(){
 const rows=[...gradeRows()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 let d=document.getElementById('gradeDeletionDialog');
 if(!d){d=document.createElement('dialog');d.id='gradeDeletionDialog';document.body.appendChild(d);}
 d.innerHTML='<h2>刪除成績</h2><p class="help">依目前類別、班級、月份與搜尋條件顯示。勾選要刪除的項目。</p><div class="actions"><button data-grade-select="all">全選</button><button data-grade-select="none">取消全選</button></div><div class="tablewrap grade-delete-table"><table><thead><tr><th>選取</th><th>日期</th><th>學生</th><th>測驗</th><th>成績</th></tr></thead><tbody>'+rows.map(g=>'<tr><td><input type="checkbox" data-grade-delete-id="'+esc(g.id)+'" aria-label="選取 '+esc(sLabel(student(g.studentId))+' '+g.date+' '+g.title)+'"></td><td>'+esc(g.date)+'</td><td>'+esc(sLabel(student(g.studentId)))+'</td><td>'+esc([g.title,g.paper].filter(Boolean).join(' '))+'</td><td>'+esc(gCellVal(g))+'</td></tr>').join('')+'</tbody></table></div>'+(rows.length?'':'<p>目前沒有成績。</p>')+'<div class="dialogfoot"><button data-grade-close>取消</button><button class="danger" data-grade-confirm>刪除勾選成績</button></div>';
 d.showModal();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-grade-unit-open'))openGradeUnitDeletion();
 if(b.hasAttribute('data-grade-unit-close'))document.getElementById('gradeUnitDeletionDialog')?.close();
 if(b.hasAttribute('data-grade-unit-confirm')){const d=document.getElementById('gradeUnitDeletionDialog');if(deleteGradeUnit(d.querySelector('select').value))d.close();}
 if(b.hasAttribute('data-grade-delete-open'))openGradeDeletion();
 if(b.hasAttribute('data-grade-delete-one'))deleteRegisteredGrades([b.dataset.gradeDeleteOne]);
 if(b.hasAttribute('data-grade-delete-exam'))deleteRegisteredGrades(data.grades.filter(g=>gKey(g)===b.dataset.gradeDeleteExam).map(g=>g.id));
 const d=document.getElementById('gradeDeletionDialog');
 if(b.hasAttribute('data-grade-select'))d?.querySelectorAll('[data-grade-delete-id]').forEach(c=>c.checked=b.dataset.gradeSelect==='all');
 if(b.hasAttribute('data-grade-close'))d?.close();
 if(b.hasAttribute('data-grade-confirm')){const ids=[...d.querySelectorAll('[data-grade-delete-id]:checked')].map(c=>c.dataset.gradeDeleteId);if(deleteRegisteredGrades(ids))d.close();}
});
