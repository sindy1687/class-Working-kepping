'use strict';
function openMathRecordEditor(id){
 const g=data.grades.find(r=>r.id===id&&r.section==='數學檢測');if(!g)return;
 let d=$('mathRecordEditor');if(!d){d=document.createElement('dialog');d.id='mathRecordEditor';document.body.appendChild(d);}
 const state=g.exempt?'exempt':g.absent?'absent':g.passed?'passed':scoreOf(g)===null?'none':'score';
 d.innerHTML='<form id="mathRecordEditForm" data-record-id="'+esc(g.id)+'"><h2>修改數學檢測</h2><p class="help">'+esc(className(gClassOf(g)))+' · 直接修改這一筆歷史紀錄</p><div class="formgrid"><label>學生<select name="studentId" required>'+classStudents(gClassOf(g)).map(s=>'<option value="'+esc(s.id)+'" '+(s.id===g.studentId?'selected':'')+'>'+esc(sLabel(s))+'</option>').join('')+'</select></label><label>測驗日期<input type="date" name="date" required value="'+esc(g.date)+'"></label><label>單元<input name="title" required maxlength="100" value="'+esc(g.title)+'" placeholder="例如 5-1"></label><label>卷別<select name="paper">'+[...new Set(['','1','2','3','4',g.paper||''])].map(p=>'<option value="'+esc(p)+'" '+(p===(g.paper||'')?'selected':'')+'>'+esc(p?p+'卷':'未分卷')+'</option>').join('')+'</select></label><label>登記方式<select name="resultState">'+[['score','分數'],['passed','PASS 通過'],['absent','缺考'],['exempt','不用考'],['none','未登記']].map(([v,label])=>'<option value="'+v+'" '+(v===state?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>分數<input name="score" type="number" min="0" step="any" value="'+esc(g.score??'')+'" '+(state==='score'?'':'disabled')+'></label><label>滿分<input name="maxScore" type="number" min="1" max="1000" step="any" required value="'+gMax(g)+'"></label><label>通過分數<input name="passScore" type="number" min="0" max="1000" step="any" required value="'+gPass(g)+'"></label><label class="wide">備註<textarea name="note" rows="3" maxlength="4000">'+esc(g.note||'')+'</textarea></label></div><p id="mathRecordEditError" class="error" role="alert"></p><div class="dialogfoot"><button type="button" data-math-editor-close>取消</button><button class="primary" type="submit">儲存修改</button></div></form>';
 d.showModal();
}
function mathRecordEditValues(old,values){
 const max=Number(values.maxScore),pass=Number(values.passScore),score=Number(values.score);
 if(!values.studentId||!values.title.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(values.date))throw Error('請填寫學生、日期與單元。');
 if(!Number.isFinite(max)||max<=0||max>1000||!Number.isFinite(pass)||pass<0||pass>max||values.passScore==='')throw Error('請確認滿分與通過分數，通過分數不可超過滿分。');
 if(!['score','passed','absent','exempt','none'].includes(values.resultState))throw Error('請選擇登記方式。');
 if(values.resultState==='score'&&(values.score.trim()===''||!Number.isFinite(score)||score<0||score>max))throw Error('分數須介於 0 與滿分之間。');
 const next={...old,studentId:values.studentId,date:values.date,title:values.title.trim(),paper:values.paper,score:values.resultState==='score'?String(score):'',maxScore:String(max),passScore:String(pass),passed:values.resultState==='passed',absent:values.resultState==='absent',exempt:values.resultState==='exempt',note:values.note.trim()};
 if(data.grades.some(r=>r.id!==old.id&&r.section==='數學檢測'&&r.studentId===next.studentId&&gClassOf(r)===gClassOf(old)&&r.date===next.date&&r.title===next.title&&(r.paper||'')===next.paper))throw Error('這位學生在該日期、單元與卷別已有成績，請改為編輯該筆紀錄。');
 return next;
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.hasAttribute('data-math-editor-close'))$('mathRecordEditor')?.close();});
document.addEventListener('change',e=>{if(e.target.form?.id==='mathRecordEditForm'&&e.target.name==='resultState'){const score=e.target.form.elements.namedItem('score');score.disabled=e.target.value!=='score';if(!score.disabled)score.focus();}});
document.addEventListener('submit',e=>{if(e.target.id!=='mathRecordEditForm')return;e.preventDefault();const f=e.target,old=data.grades.find(r=>r.id===f.dataset.recordId);if(!old)return;
 try{const values=Object.fromEntries(['studentId','date','title','paper','resultState','score','maxScore','passScore','note'].map(k=>[k,f.elements.namedItem(k).value]));const next=mathRecordEditValues(old,values);Object.assign(old,next);$('mathRecordEditor').close();changed();render();toast('已修改這筆數學檢測。');}catch(err){$('mathRecordEditError').textContent=err.message;}
});
