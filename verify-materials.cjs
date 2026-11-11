const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const nodes={content:{}};
const ctx=vm.createContext({
 data:{classes:[{id:'c1',name:'文樂數學'}],attachments:[
  {id:'m1',name:'L19 學習單',url:'https://drive.google.com/file/d/abc',classId:'c1',subject:'數學',category:'學習單',date:'2026-11-01',note:'第五課'},
  {id:'m2',name:'KIST 影片',url:'https://youtu.be/xyz',classId:'',subject:'閱讀',category:'影片',date:'2026-10-20'},
  {id:'m3',name:'壞連結',url:'javascript:alert(1)',classId:'',subject:'',category:'',date:''},
 ]},
 matClass:'',matSubject:'',matCat:'',matQuery:'',
 SUBJ_CLS:{數學:'math',英文:'eng',閱讀:'read',國語:'read',自然:'passion',社會:'passion',其他:'other'},
 className:id=>({c1:'文樂數學'})[id]||'',
 esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
 head:()=>'',$:id=>nodes[id],render(){},document:{addEventListener(){}},
});
vm.runInContext(fs.readFileSync('js/materials.js','utf8')+'\nglobalThis.__m={c:v=>matClass=v,s:v=>matSubject=v,t:v=>matCat=v,q:v=>matQuery=v};',ctx);
ctx.materialsPage();
let html=nodes.content.innerHTML;
assert.ok(html.includes('L19 學習單')&&html.includes('KIST 影片'),'cards render');
assert.ok(html.includes('文樂數學'),'class name shown');
assert.ok(html.includes('通用教材'),'no-class material labelled 通用');
assert.ok(!html.includes('javascript:alert'),'non-http url never becomes a link');
assert.ok(html.includes('data-mat-subject'),'subject chips render');
// 篩選：班級
ctx.__m.c('c1');ctx.materialsPage();html=nodes.content.innerHTML;
assert.ok(html.includes('L19 學習單')&&!html.includes('KIST 影片'),'class filter');
ctx.__m.c('any');ctx.materialsPage();html=nodes.content.innerHTML;
assert.ok(!html.includes('L19 學習單')&&html.includes('KIST 影片'),'通用 filter');
// 篩選：科目
ctx.__m.c('');ctx.__m.s('閱讀');ctx.materialsPage();html=nodes.content.innerHTML;
assert.ok(!html.includes('L19 學習單')&&html.includes('KIST 影片'),'subject filter');
// 舊資料（無 classId/subject/category）歸類正確
ctx.__m.s('');ctx.__m.t('其他');ctx.materialsPage();html=nodes.content.innerHTML;
assert.ok(html.includes('壞連結'),'legacy record falls into 其他 category');
console.log('PASS: materials page renders, class/subject/category filters, safe URLs');
