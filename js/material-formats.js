'use strict';
function materialFormat(m){
 const ext=String(m.fileName||m.name||'').match(/\.([a-z\d]+)$/i)?.[1]?.toLowerCase(),mime=m.mimeType||'';
 if(ext==='pdf'||mime==='application/pdf')return 'PDF';
 if(['doc','docx'].includes(ext)||/wordprocessing|msword/.test(mime))return 'Word';
 if(['ppt','pptx'].includes(ext)||/presentation|powerpoint/.test(mime))return 'PPT';
 if(['xls','xlsx'].includes(ext)||/spreadsheet|ms-excel/.test(mime))return 'Excel';
 if(/google-apps.document/.test(mime))return 'Google文件';
 if(/audio\//.test(mime)||['mp3','wav','m4a'].includes(ext))return ext?.toUpperCase()||'音檔';
 if(/image\//.test(mime)||['jpg','jpeg','png'].includes(ext))return ext?.toUpperCase()||'圖片';
 return ext?.toUpperCase()||'連結';
}
function materialFormatGroups(rows){
 const map=new Map();
 for(const m of rows){
  const parts=englishMaterialParts(m),name=String(m.name||m.fileName||'').normalize('NFKC').replace(/\.(pdf|docx?|pptx?|xlsx?|png|jpe?g|mp3|wav|m4a)$/i,'').replace(/\s+/g,' ').trim();
  const version=/過期|\(舊\)|（舊）|舊版/.test(m.sourcePath||'')?'舊版':'一般';
  const key=JSON.stringify([name.toLowerCase(),materialSection(m),m.category||'其他',materialStage(m),parts.book,parts.paper,m.classId||'',m.unit||'',version]);
  if(!map.has(key))map.set(key,{...m,name,_formatMembers:[]});
  map.get(key)._formatMembers.push(m);
 }
 return [...map.values()].map(g=>({...g,starred:g._formatMembers.every(m=>m.starred)}));
}
function materialFormatLinks(group){
 const members=group._formatMembers||[group],counts={};members.forEach(m=>{const f=materialFormat(m);counts[f]=(counts[f]||0)+1;});const seen={};
 return '<div class="material-format-links">'+members.map(m=>{if(m.availability==='unavailable')return '<span class="material-file-unavailable" title="原站檔案連結已失效">'+esc((m.edition||'檔案')+'：連結失效')+'</span>';const u=materialUrl(m.url);if(!u)return '<span>無有效連結</span>';const format=materialFormat(m),index=(seen[format]||0)+1;seen[format]=index;const label=(m.edition?m.edition+' ':'')+format+(!m.edition&&counts[format]>1?' '+index:'');return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer" class="material-format-link" title="'+esc([m.fileName||m.name,m.fileSize?Math.round(m.fileSize/1024)+' KB':'',m.sourcePath||''].filter(Boolean).join(' · '))+'">'+esc(label)+' ↗</a>';}).join('')+'</div>';
}
function materialFormatActions(group){
 const members=group._formatMembers||[group];
 if(members.length===1)return '<button data-edit="'+esc(group.id)+'">編輯</button><button class="danger" data-delete="'+esc(group.id)+'">移除</button>';
 return '<details class="material-format-manage"><summary>管理 '+members.length+' 個檔案</summary><ul>'+members.map(m=>'<li><span>'+esc(materialFormat(m)+' · '+(m.fileName||m.name))+'</span><button data-edit="'+esc(m.id)+'">編輯</button><button class="danger" data-delete="'+esc(m.id)+'">移除</button></li>').join('')+'</ul></details>';
}
function materialFormatRow(m){
 const parts=englishMaterialParts(m),ids=(m._formatMembers||[m]).map(f=>f.id);
 return '<tr class="material-list-row"><td><button class="material-star" data-mat-format-star="'+esc(JSON.stringify(ids))+'" aria-label="收藏 '+esc(m.name)+'" aria-pressed="'+!!m.starred+'">'+(m.starred?'★':'☆')+'</button></td><td class="material-list-name"><strong>'+esc(m.name)+'</strong>'+materialFormatLinks(m)+materialListDetails(m)+'</td><td><span class="material-type">'+esc(m.category||'其他')+'</span>'+(materialSection(m)==='英文'?'<small class="material-list-grade">'+esc(parts.book+' · '+parts.paper)+'</small>':'')+'</td><td>'+esc(materialStage(m))+(m.grade?'<small class="material-list-grade">'+esc(m.grade)+'</small>':'')+'</td><td>'+esc(m.unit||'—')+'</td><td>'+esc(m.classId?className(m.classId):'通用教材')+'</td><td class="material-list-actions">'+materialFormatActions(m)+'</td></tr>';
}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-mat-format-star]');if(!b)return;const ids=new Set(JSON.parse(b.dataset.matFormatStar)),members=data.attachments.filter(m=>ids.has(m.id)),star=!members.every(m=>m.starred);members.forEach(m=>m.starred=star);changed();render();});
