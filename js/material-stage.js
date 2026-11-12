'use strict';
const MATERIAL_STAGES=['國小','國中','共用','待確認'];
function materialVocabStage(row){
 const context=[row.category,row.name,row.fileName,row.bookLevel,row.sourcePath,row.tags].filter(Boolean).join(' ');
 if(!/檢定|認讀/.test(context))return '';
 for(const text of [row.name,row.fileName,row.bookLevel,...String(row.sourcePath||'').split('/').reverse()]){
  const m=String(text||'').match(/(基礎|成長)(?:級)?\s*(?:第\s*)?(\d{1,2})?/);
  if(!m)continue;
  const limit=m[1]==='基礎'?8:10;
  if(m[2]&&(+m[2]<1||+m[2]>limit))return '';
  return m[1]==='基礎'?'國小':'國中';
 }
 return '';
}
function materialStageTabs(){return '<div class="material-stage-tabs" role="group" aria-label="教材學段">'+['',...MATERIAL_STAGES].map(stage=>'<button data-mat-stage="'+stage+'" aria-pressed="'+(matStage===stage)+'">'+(stage||'全部學段')+'<small>'+data.attachments.filter(m=>!stage||materialStage(m)===stage).length+'</small></button>').join('')+'</div>';}
function materialStage(row){
 if(MATERIAL_STAGES.includes(row.stage))return row.stage;
 const vocab=materialVocabStage(row);if(vocab)return vocab;
 const grade=String(row.grade||'').match(/[1-9]/);if(grade)return Number(grade[0])<=6?'國小':'國中';
 const detect=text=>{const primary=/國小|小學/.test(text),junior=/國中|初中/.test(text);return primary&&junior?'共用':primary?'國小':junior?'國中':'';};
 const named=detect(String(row.name||row.fileName||''));if(named)return named;
 const parts=String(row.sourcePath||'').split('/').reverse();for(const part of parts){const stage=detect(part);if(stage)return stage;}
 return detect(String(row.tags||''))||'待確認';
}
