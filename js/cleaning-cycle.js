'use strict';
// 固定輪序，每次向前一位；輪完所有學生才重複起點。
function assignCleaningCycle(jobs,students,cls,date,replaced=[],advance=true){
 if(!jobs.length||!students.length)return [];
 const roster=[...students].sort((a,b)=>String(a.id).localeCompare(String(b.id))),n=roster.length;
 if(!data.meta.cleaningCycles)data.meta.cleaningCycles={};
 const key=JSON.stringify([cls,date]),signature=JSON.stringify([jobs,roster.map(s=>s.id)]),saved=data.meta.cleaningCycles[key];
 let offset;
 if(saved?.signature===signature)offset=(saved.offset+(advance?1:0))%n;
 else{
  const overlaps=o=>jobs.reduce((count,area,i)=>count+Number(replaced.some(r=>r.date===date&&r.area===area&&r.studentId===roster[(i+o)%n].id)),0);
  offset=0;for(let o=1;o<n;o++)if(overlaps(o)<overlaps(offset))offset=o;
  if(!replaced.some(r=>r.date===date)){
   const prior=Object.values(data.meta.cleaningCycles).filter(x=>x.cls===cls&&x.signature===signature&&x.date<date).sort((a,b)=>b.date.localeCompare(a.date))[0];
   offset=prior?(prior.offset+1)%n:0;
  }
 }
 // 以本月已排定的實際紀錄決定每一欄的輪次，不能只依各日期的舊游標。
 const history=(data.cleaning||[]).filter(r=>r.classId===cls&&r.date<date&&String(r.date).slice(0,7)===date.slice(0,7));
 if(history.length){
  const last=history.filter(r=>r.area===jobs[0]).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(last){const index=roster.findIndex(s=>s.id===last.studentId);if(index>=0)offset=(index+1)%n;}
  const counts=jobs.map(area=>roster.map(s=>history.filter(r=>r.area===area&&r.studentId===s.id).length));
  const cost=o=>jobs.reduce((total,area,i)=>{
   const j=(i+o)%n,min=Math.min(...counts[i]);
   const recent=history.filter(r=>r.area===area).sort((a,b)=>b.date.localeCompare(a.date));
   const gap=recent.findIndex(r=>r.studentId===roster[j].id);
   return total+(counts[i][j]-min)*100000+(gap<0?0:Math.max(0,n-1-gap))*100+Number(replaced.some(r=>r.date===date&&r.area===area&&r.studentId===roster[j].id));
  },0);
  let best=offset;for(let step=1;step<n;step++){const candidate=(offset+step)%n;if(cost(candidate)<cost(best))best=candidate;}offset=best;
 }
 data.meta.cleaningCycles[key]={cls,date,signature,offset};
 return jobs.map((area,i)=>({area,studentId:roster[(i+offset)%n].id}));
}
