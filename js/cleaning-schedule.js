'use strict';
// 課表調整僅同步今天起的自動分配，保留歷史、完成及手動紀錄。
function syncCleaningSchedule(cls,week,dates=Array.from({length:7},(_,i)=>addDays(week,i))){
 if(!cls||isOnline(cls))return false;
 const students=classStudents(cls),jobs=cleaningJobs(cls),start=today();let updated=false;
 for(const date of dates){
 if(date<start)continue;
  const eligible=students.filter(s=>allowedOn(s,date,cls)),ids=new Set(eligible.map(s=>s.id));
  const previous=data.cleaning.filter(r=>r.classId===cls&&r.date===date);
  const remove=new Set(previous.filter(r=>!r.done&&r.note==='自動輪替'&&(!ids.has(r.studentId)||!jobs.includes(r.area))).map(r=>r.id));
  if(remove.size){data.cleaning=data.cleaning.filter(r=>!remove.has(r.id));updated=true;}
  if(!eligible.length)continue;
  // 舊版的整日自動分工也要修復；純檢視不推進輪序，且保留完成及手動安排。
  const current=data.cleaning.filter(r=>r.classId===cls&&r.date===date);
  if(typeof assignCleaningCycle==='function'&&current.length===jobs.length&&current.every(r=>!r.done&&r.note==='自動輪替')&&jobs.every(area=>current.filter(r=>r.area===area).length===1)){
   const planned=assignCleaningCycle(jobs,eligible,cls,date,[],false);
   planned.forEach(p=>{const row=current.find(r=>r.area===p.area);if(row.studentId!==p.studentId){row.studentId=p.studentId;updated=true;}});
   continue;
  }
  const kept=data.cleaning.filter(r=>r.classId===cls&&r.date===date),missing=jobs.filter(area=>!kept.some(r=>r.area===area));
  if(!missing.length)continue;
  const used=new Set(kept.map(r=>r.studentId)),available=eligible.filter(s=>!used.has(s.id));
  const pool=available.length>=missing.length?available:eligible;
  (typeof assignCleaningCycle==='function'?assignCleaningCycle(missing,pool,cls,date,previous):assignCleaningJobs(missing,pool,data.cleaning.filter(r=>r.classId===cls),date,previous)).forEach(assignment=>{
   data.cleaning.push({id:uid(),date,classId:cls,...assignment,done:false,note:'自動輪替'});updated=true;
  });
 }
 if(updated)changed();return updated;
}
