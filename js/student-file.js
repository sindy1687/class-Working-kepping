/* 學生檔案：在「班級與學生」點學生名字，集中查看這位學生所有的舊紀錄（結案、離班學生也可查）。 */
let sfileSid='';
function sfileDate(r){return String(r?.date||r?.week||r?.start||r?.from||'');}
function sfileText(v,max=160){let t=String(v??'');if(typeof mdPlain==='function')t=mdPlain(t);t=t.replace(/\s+/g,' ').trim();return t.length>max?t.slice(0,max)+'…':t;}
// 每個功能裡屬於這位學生的紀錄（依模組欄位定義；沒有定義的資料也列出）
function sfileGroups(sid){const out=[],seen=new Set();
 Object.entries(modules).forEach(([name,m])=>{if(!m||m.key==='students'||seen.has(m.key)||!Array.isArray(data[m.key]))return;seen.add(m.key);const rows=data[m.key].filter(r=>r&&r.studentId===sid);if(rows.length)out.push({name,m,rows});});
 Object.entries(data).forEach(([k,list])=>{if(seen.has(k)||!Array.isArray(list))return;const rows=list.filter(r=>r&&typeof r==='object'&&r.studentId===sid);if(rows.length){seen.add(k);out.push({name:(typeof CLOUD_EXTRA_LABELS!=='undefined'&&CLOUD_EXTRA_LABELS[k])||k,m:{key:k,fields:[]},rows});}});
 out.forEach(g=>g.rows.sort((a,b)=>sfileDate(b).localeCompare(sfileDate(a))));
 // 重要的學習紀錄排前面，其餘依最近日期
 const pri=['學生週誌','每週觀察','成績登記','學生進度','學校成績','出席總覽','個人閱讀清單'],rank=n=>{const i=pri.indexOf(n);return i<0?99:i;};
 return out.sort((a,b)=>rank(a.name)-rank(b.name)||sfileDate(b.rows[0]).localeCompare(sfileDate(a.rows[0])));}
function sfileTable(g){const skip=new Set(['studentId']);let fields=(g.m.fields||[]).filter(f=>!skip.has(f.key)&&f.type!=='images');
 const extra=[];if(g.rows.some(r=>Array.isArray(r.tasks)&&r.tasks.length)&&!fields.some(f=>f.key==='tasks'))extra.push({key:'__tasks',label:'進度清單',type:'textarea'});
 if(g.rows.some(r=>Array.isArray(r.readings)&&r.readings.length)&&!fields.some(f=>f.key==='readings'))extra.push({key:'__readings',label:'閱讀',type:'textarea'});
 // 進度清單、閱讀放在「科目／主題」後面（沒有就放日期後面），長文字欄位留在右邊
 if(extra.length){const at=Math.max(fields.findIndex(f=>f.key==='subject'),fields.findIndex(f=>f.key==='date'))+1;fields=[...fields.slice(0,at),...extra,...fields.slice(at)];extra.length=0;}
 if(!fields.length){const keys=[...new Set(g.rows.flatMap(r=>Object.keys(r)))].filter(k=>!['id','studentId','updatedAt','createdAt'].includes(k)&&g.rows.some(r=>r[k]!==''&&r[k]!=null&&typeof r[k]!=='object'));fields=keys.slice(0,8).map(k=>({key:k,label:k,type:'text'}));}
 const val=(f,r)=>{if(f.key==='__readings')return (r.readings||[]).map(x=>(x.done||x.checked?'✓ ':'')+(x.type?x.type+' ':'')+String(x.title||x.name||x.book||'').trim()).filter(x=>x.replace('✓','').trim()).join('、');if(f.key==='__tasks')return (r.tasks||[]).map(t=>(t.done?'✓ ':'')+String(t.text||t.name||t.title||'').trim()).filter(x=>x.trim()).join('、');const v=typeof plainValue==='function'&&g.m.fields?.length?plainValue(f,r):r[f.key];return typeof v==='object'&&v!==null?JSON.stringify(v):v;};
 const cols=[...fields,...extra].filter(f=>g.rows.some(r=>String(val(f,r)??'').trim()!==''));
 return '<div class="tablewrap"><table class="sfile-table"><thead><tr>'+cols.map(f=>'<th>'+esc(String(f.label).replace(/（.*$/,''))+'</th>').join('')+'</tr></thead><tbody>'+
  g.rows.map(r=>'<tr>'+cols.map(f=>{const v=val(f,r);const long=f.type==='textarea'||String(v??'').length>40;return '<td>'+(long?'<div class="cellclamp">'+esc(sfileText(v,600))+'</div>':esc(String(v??'')))+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';}
function sfileStatus(s){return s.archived?'<span class="st none">已離班</span>':(typeof closedStudent==='function'&&closedStudent(s))?'<span class="st warn">結案</span>':'<span class="st good">在班</span>';}
function openStudentFile(sid){const s=data.students.find(x=>x.id===sid);if(!s)return;sfileSid=sid;
 if(!$('sfileDlg')){const d=document.createElement('dialog');d.id='sfileDlg';d.className='sfile-dlg';d.setAttribute('aria-labelledby','sfileTitle');document.body.append(d);}
 const groups=sfileGroups(sid),all=groups.flatMap(g=>g.rows),dates=all.map(sfileDate).filter(Boolean).sort();
 const att=(data.attendance||[]).filter(r=>r&&r.studentId===sid),cnt={};att.forEach(r=>{cnt[r.status]=(cnt[r.status]||0)+1;});
 const ids=[...new Set([s.classId,...(s.classIds||[])].filter(Boolean))];
 $('sfileDlg').innerHTML='<div class="sfile-head"><div><h2 id="sfileTitle">'+esc(s.name)+' 的學生檔案 '+sfileStatus(s)+'</h2><p class="help">'+esc(['編號 '+(s.number||'未填'),canonicalGrade(s.grade)||'未填年級',s.school,studentArea(s),ids.map(id=>className(id)||'（已刪除的班級）').join('、')].filter(Boolean).join(' · '))+'</p></div><button type="button" data-sfile-close aria-label="關閉">✕</button></div>'+
  '<div class="sfile-sum"><span><b>'+all.length+'</b> 筆紀錄</span><span>期間 <b>'+(dates.length?esc(dates[0])+' ～ '+esc(dates[dates.length-1]):'—')+'</b></span>'+(att.length?'<span>出席 '+Object.entries(cnt).map(([k,v])=>esc(k)+' '+v).join('、')+'</span>':'')+'</div>'+
  '<div class="actions" style="margin:8px 0 12px">'+(typeof openObsHistory==='function'?'<button type="button" data-sfile-obs>觀察紀錄整理</button>':'')+'<button type="button" data-sfile-csv>↓ 匯出這位學生的全部紀錄</button><button type="button" data-sfile-edit>編輯基本資料</button></div>'+
  (groups.length?groups.map((g,i)=>'<details class="sfile-sec"'+(i<2?' open':'')+'><summary><b>'+esc(g.name)+'</b> · '+g.rows.length+' 筆'+(sfileDate(g.rows[0])?' · 最近 '+esc(sfileDate(g.rows[0])):'')+(modules[g.name]?'<button type="button" class="sfile-go" data-sfile-go="'+esc(g.name)+'">到「'+esc(g.name)+'」查看</button>':'')+'</summary>'+sfileTable(g)+'</details>').join(''):'<div class="empty">這位學生還沒有任何紀錄。</div>');
 if(!$('sfileDlg').open)$('sfileDlg').showModal();}
function studentFileCsv(sid){const s=data.students.find(x=>x.id===sid);if(!s)return;const rows=[];
 sfileGroups(sid).forEach(g=>{const fields=(g.m.fields||[]).filter(f=>f.key!=='studentId'&&f.type!=='images');g.rows.forEach(r=>{const parts=fields.map(f=>{const v=plainValue(f,r);return v!==''&&v!=null?String(f.label).replace(/（.*$/,'')+'：'+sfileText(v,2000):'';}).filter(Boolean);if(Array.isArray(r.tasks)&&r.tasks.length)parts.push('學習內容：'+r.tasks.map(t=>String(t.text||'').trim()).filter(Boolean).join('、'));if(!fields.length)parts.push(sfileText(JSON.stringify(r),2000));rows.push([sfileDate(r),g.name,parts.join('；')]);});});
 rows.sort((a,b)=>String(b[0]).localeCompare(String(a[0])));csv('學生檔案-'+s.name,['日期','功能','內容'],rows);}
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-sfile],[data-sfile-close],[data-sfile-go],[data-sfile-obs],[data-sfile-csv],[data-sfile-edit]');if(!t)return;
 if(t.dataset.sfile){e.preventDefault();openStudentFile(t.dataset.sfile);return;}
 const dlg=$('sfileDlg');
 if(t.hasAttribute('data-sfile-close')){dlg?.close();return;}
 if(t.dataset.sfileGo){e.preventDefault();e.stopPropagation();const s=data.students.find(x=>x.id===sfileSid);dlg?.close();navigate(t.dataset.sfileGo);if(t.dataset.sfileGo==='學生週誌'){jView='list';jMonth='';}if(t.dataset.sfileGo==='出席總覽')attView='list';search=s?.name||'';render();return;}
 if(t.hasAttribute('data-sfile-obs')){dlg?.close();openObsHistory(sfileSid);return;}
 if(t.hasAttribute('data-sfile-csv')){studentFileCsv(sfileSid);return;}
 if(t.hasAttribute('data-sfile-edit')){dlg?.close();openEditor(sfileSid);return;}});
