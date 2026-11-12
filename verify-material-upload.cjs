const fs=require('fs'),vm=require('vm'),assert=require('assert');let created=0,removed=0,index=null,fail=false;
const iter=list=>{let i=0;return {hasNext:()=>i<list.length,next:()=>list[i++]};};
function folder(){const folders=new Map(),files=[];return {getFoldersByName:n=>iter(folders.has(n)?[folders.get(n)]:[]),createFolder:n=>{const f=folder();folders.set(n,f);return f;},getFilesByName:n=>iter(files.filter(f=>f.getName()===n)),createFile:(name,text)=>{
 if(typeof name==='object'){created++;let desc='';const f={getName:()=>name.name,getId:()=> 'file'+created,getUrl:()=> 'https://drive.google.com/file/d/file'+created,getMimeType:()=>name.mime,setDescription:d=>desc=d,getDescription:()=>desc,setTrashed:()=>removed++};files.push(f);return f;}
 index={getName:()=>name,getBlob:()=>({getDataAsString:()=>text}),setContent:t=>{if(fail)throw Error('write failure');text=t;},makeCopy(){}};return index;
 }};}
const root=folder(),ctx={Utilities:{base64Decode:s=>[...Buffer.from(s,'base64')],newBlob:(bytes,mime,name)=>({bytes,mime,name}),formatDate:()=> '2026-11-11'}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('雲端同步/Code.gs','utf8'),ctx);
ctx.folder_=()=>root;ctx.index_=()=>({attachments:index});ctx.backupFolder_=()=>({getFilesByName:()=>iter([{}])});ctx.ver_=s=>String(s.length);
const body={requestId:'request-00001',fileName:'test.pdf',mimeType:'application/pdf',base64:Buffer.from('test file').toString('base64'),material:{category:'檢定卷',subject:'英文',unit:'L10'}};
const result=ctx.uploadMaterial_(body);assert.equal(created,1);assert.equal(result.material.name,'test.pdf');assert.equal(result.material.category,'檢定卷');assert.equal(result.attachments.length,1);assert(index.getBlob().getDataAsString().includes('file1'));
const retry=ctx.uploadMaterial_(body);assert.equal(created,1);assert.equal(retry.material.id,body.requestId);
const next=ctx.uploadMaterial_({...body,requestId:'request-00002',material:{category:'課本'}});assert.equal(next.attachments.length,2);assert.equal(next.attachments[0].unit,'L10');
assert.throws(()=>ctx.uploadMaterial_({...body,requestId:'request-00003',base64:''}));assert.throws(()=>ctx.uploadMaterial_({...body,material:{category:'../bad'}}));
fail=true;assert.throws(()=>ctx.uploadMaterial_({...body,requestId:'request-00004'}),/write failure/);assert.equal(removed,1);
console.log('PASS: Drive upload + persistent shared index; classification; retry deduplication; previous entries retained; invalid files rejected; failed writes cleaned up');
