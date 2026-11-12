'use strict';
let matBook='',matPaper='';
const MATERIAL_BOOKS=['初上','初下','中上','中下','I級','II級','III級','基礎級','成長級'];
function englishMaterialParts(m){
 const texts=[m.name||m.fileName||'',...String(m.sourcePath||'').split('/').reverse()];
 let book=m.bookLevel||'',paper=String(m.paperNumber||'').trim();
 if(paper&&/^\d+$/.test(paper))paper=Number(paper)+'卷';
 for(const text of texts){
  if(!book){const half=String(text).match(/(初|中)(?:級)?\s*(上|下)(?:冊)?/);if(half)book=half[1]+half[2];}
 }
 if(!book)for(const text of texts){const level=String(text).match(/\b(III|II|I)\s*級|(?:^|[^A-Za-z])(III|II|I)(?=-\d|$)|基礎級|成長級/i);if(level){book=level[1]||level[2]?(level[1]||level[2]).toUpperCase()+'級':level[0];break;}}
 if(!paper)for(const text of texts){const hits=[...String(text).matchAll(/(?:第\s*)?0*(\d{1,2})\s*卷/g)].filter(x=>!/[~～\-至]/.test(String(text)[x.index-1]||''));const values=[...new Set(hits.map(x=>Number(x[1])+'卷'))];if(values.length===1){paper=values[0];break;}}
 return {book:book||'待確認冊別',paper:paper||'未標卷別'};
}
function englishMaterialNavigation(){
 if(matSubject!=='英文')return '';
 const all=data.attachments.filter(m=>materialSection(m)==='英文'&&(!matStage||materialStage(m)===matStage));
 const types=[...new Set(['檢測卷','課本','檢定卷','練習卷','解答',...all.map(m=>m.category||'其他')])];
 const byType=all.filter(m=>!matCat||(m.category||'其他')===matCat);
 const books=[...new Set(byType.map(m=>englishMaterialParts(m).book))].sort((a,b)=>{const ai=MATERIAL_BOOKS.indexOf(a),bi=MATERIAL_BOOKS.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b,'zh-Hant');});
 const papers=[...new Set(byType.filter(m=>!matBook||englishMaterialParts(m).book===matBook).map(m=>englishMaterialParts(m).paper))].sort((a,b)=>a.localeCompare(b,'zh-Hant',{numeric:true}));
 const line=(label,attr,values,selected,count)=>'<div class="material-hierarchy-line"><strong>'+label+'</strong><div>'+['',...values].map(v=>'<button '+attr+'="'+esc(v)+'" aria-pressed="'+(selected===v)+'">'+esc(v||'全部')+'<small>'+count(v)+'</small></button>').join('')+'</div></div>';
 return '<section class="panel material-english-navigation"><p class="material-breadcrumb">英文 › '+esc(matCat||'所有類型')+' › '+esc(matBook||'所有冊別')+' › '+esc(matPaper||'所有卷別')+'</p>'+line('① 類型','data-mat-cat',types,matCat,v=>all.filter(m=>!v||(m.category||'其他')===v).length)+line('② 冊別','data-mat-book',books,matBook,v=>byType.filter(m=>!v||englishMaterialParts(m).book===v).length)+line('③ 卷別','data-mat-paper',papers,matPaper,v=>byType.filter(m=>(!matBook||englishMaterialParts(m).book===matBook)&&(!v||englishMaterialParts(m).paper===v)).length)+'</section>';
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.matSubject!==undefined||d.matCat!==undefined||d.matStage!==undefined||d.matClear!==undefined){matBook='';matPaper='';}
 if(d.matBook!==undefined){matBook=d.matBook;matPaper='';matPage=1;render();}
 if(d.matPaper!==undefined){matPaper=d.matPaper;matPage=1;render();}
});
document.addEventListener('change',e=>{if(['matCat','matClass','matGrade'].includes(e.target.id)){matBook='';matPaper='';}});
