'use strict';
let matFolder='';
function materialFolderPaths(m){return [...new Set([m.sourcePath,...(m.sourcePaths||[]),...(m.alternateFiles||[]).flatMap(f=>[f.sourcePath,...(f.sourcePaths||[])])].filter(Boolean))];}
function materialInFolder(m,path){return !path||materialFolderPaths(m).some(p=>p===path||p.startsWith(path+'/'));}
function materialCloudFolders(){
 const catalog=Array.isArray(data.meta?.materialFolders)?data.meta.materialFolders:[],paths=new Set(catalog.map(f=>f.path));for(const m of data.attachments)for(const path of materialFolderPaths(m)){const parts=path.split('/');for(let i=1;i<=parts.length;i++)paths.add(parts.slice(0,i).join('/'));}
 const childMap=new Map(),labels=new Map(catalog.map(f=>[f.path,f.name])),counts=new Map();
 for(const path of paths){const parent=path.split('/').slice(0,-1).join('/');if(!childMap.has(parent))childMap.set(parent,[]);childMap.get(parent).push(path);}
 for(const list of childMap.values())list.sort((a,b)=>a.localeCompare(b,'zh-Hant',{numeric:true}));
 for(const m of data.attachments){const ancestors=new Set();for(const path of materialFolderPaths(m)){const parts=path.split('/');for(let i=1;i<=parts.length;i++)ancestors.add(parts.slice(0,i).join('/'));}for(const path of ancestors)counts.set(path,(counts.get(path)||0)+1);}
 const children=parent=>childMap.get(parent)||[];
 const node=path=>{const nested=children(path),label=labels.get(path)||path.split('/').pop(),count=counts.get(path)||0;
  return '<li>'+(nested.length?'<details '+(matFolder===path||matFolder.startsWith(path+'/')?'open':'')+'><summary>'+esc(label)+'</summary><button data-mat-folder="'+esc(path)+'" aria-pressed="'+(matFolder===path)+'">查看此資料夾 <small>'+count+'</small></button><ul>'+nested.map(node).join('')+'</ul></details>':'<button data-mat-folder="'+esc(path)+'" aria-pressed="'+(matFolder===path)+'">'+esc(label)+' <small>'+count+'</small></button>')+'</li>';};
 const crumbs=matFolder?matFolder.split('/').map((name,i,parts)=>'<button data-mat-folder="'+esc(parts.slice(0,i+1).join('/'))+'">'+esc(name)+'</button>').join('<span>›</span>'):'<span>全部雲端資料夾</span>';
 return '<section class="panel material-cloud-folders"><button class="material-folder-refresh" data-mat-refresh>↻ 更新雲端清單</button><details '+(matFolder?'':'open')+'><summary>雲端原資料夾 <small>'+paths.size+' 個資料夾 · 完整名稱與層級</small></summary><div class="material-folder-tree"><button data-mat-folder="" aria-pressed="'+!matFolder+'">全部資料夾</button><ul>'+children('').map(node).join('')+'</ul></div></details><div class="material-folder-breadcrumb"><button data-mat-folder="">全部</button><span>›</span>'+crumbs+'</div><p class="help">顯示所選資料夾及其子資料夾中的教材，包含空資料夾與各個原始來源。</p></section>';
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-mat-folder')){matFolder=b.dataset.matFolder;matSubject='';matCat='';matStage='';matBook='';matPaper='';matClass='';matGrade='';matQuery='';matStar=false;matPage=1;render();}if(b.hasAttribute('data-mat-clear'))matFolder='';});
document.addEventListener('click',async e=>{const b=e.target.closest('button[data-mat-refresh]');if(!b)return;if(typeof cloud==='undefined'||!cloud.url){toast('請先設定雲端同步網址。');return;}if(cloud.busy){toast('雲端正在同步，請稍候。');return;}b.disabled=true;b.textContent='正在更新…';try{await cloudPull({force:true});toast(cloud.state==='error'?cloud.msg:'已更新雲端教材與資料夾。');}finally{if(b.isConnected){b.disabled=false;b.textContent='↻ 更新雲端清單';}}});
