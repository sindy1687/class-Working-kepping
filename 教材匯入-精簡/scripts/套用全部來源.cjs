const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={document:{addEventListener(){}}};vm.createContext(c);for(const f of ['material-stage','material-english'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const files=require('./全部雲端檔案.json'),folders=require('./全部雲端資料夾.json'),before=Buffer.from(fs.readFileSync('教材匯入/全部套用前.base64','utf8').trim(),'base64').toString('utf8'),rows=JSON.parse(before),byId=new Map();fs.writeFileSync('教材匯入/全部套用前.json',before);
for(const f of files){if(!byId.has(f.id))byId.set(f.id,[]);byId.get(f.id).push(f);}
const represented=new Set();let updated=0,added=0;
function applyFile(row,id){const sources=byId.get(id);if(!sources)return;represented.add(id);const f=sources[0];row.sourcePaths=[...new Set(sources.map(x=>x.path))];row.sourcePath=f.path;row.sourceFolderId=f.rootId;row.cloudFolderId=f.folderId;row.fileName=f.name;row.fileSize=f.size;row.mimeType=f.mimeType;row.name=f.name;row.url=f.url;updated++;}
for(const row of rows){const id=row.driveFileId||String(row.url||'').match(/\/d\/([\w-]+)/)?.[1];if(id)applyFile(row,id);for(const alt of row.alternateFiles||[])applyFile(alt,alt.driveFileId);}
for(const [id,sources] of byId){if(represented.has(id))continue;const f=sources[0],text=f.path+'/'+f.name;
 const category=/答案|解答/.test(text)?'解答':/^audio\//.test(f.mimeType)||/聽力/.test(text)?'聽力':/檢定/.test(text)?'檢定卷':/課本|textbook/i.test(text)?'課本':/檢測|評量|會考/.test(text)?'檢測卷':/講義/.test(text)?'講義':/練習|workbook/i.test(text)?'練習卷':'其他';
 const row={id:'drive-'+id,driveFileId:id,subject:'英文',category,date:'2026-11-12',classId:'',grade:'',unit:'',tags:/^~\$/.test(f.name)?'雲端原檔、暫存檔':'雲端原檔',note:'來源資料夾：'+f.path};applyFile(row,id);row.stage=c.materialStage(row);const p=c.englishMaterialParts(row);if(p.book!=='待確認冊別')row.bookLevel=p.book;if(p.paper!=='未標卷別')row.paperNumber=p.paper;rows.push(row);added++;
}
assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);for(const f of files)assert(represented.has(f.id));assert.equal(folders.length,611);
fs.writeFileSync('教材匯入/教材庫-全部雲端套用.json',JSON.stringify(rows));console.log(JSON.stringify({folders:folders.length,sourceFiles:files.length,uniqueFiles:byId.size,added,rows:rows.length,updated}));
