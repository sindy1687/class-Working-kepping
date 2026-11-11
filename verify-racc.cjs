const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('js/app.js','utf8');
const slice=src.slice(src.indexOf('function readingPage'),src.indexOf('function readingCsv'));
const students=[{id:'s1',name:'王小明',number:'12',grade:'三年級',classId:'rc1'},{id:'s2',name:'李大同',number:'3',grade:'四年級',classId:'rc1'}];
const rows=[
 {studentId:'s1',type:'KIST',title:'A',date:'2026-11-01',times:1},
 {studentId:'s1',type:'文字書',title:'B',date:'2026-11-02',times:1},
 {studentId:'s1',type:'文字書',title:'C',date:'2026-11-03',times:1},
 {studentId:'s2',type:'繪本',title:'D',date:'2026-11-04',times:1}];
const content={innerHTML:''};
const ctx=vm.createContext({data:{classes:[{id:'rc1',kind:'閱讀',name:'閱讀班'}],journals:[],students},
 page:'閱讀統計',rClass:'',rFrom:'',rTo:'',search:'',
 READ_TYPES:['KIST','大量閱讀','國內外大事','文字書','繪本','橋樑書'],
 READ_UNIT:{KIST:'篇',大量閱讀:'本','國內外大事':'則',文字書:'本','繪本':'本','橋樑書':'本'},
 $:id=>id==='content'?content:{innerHTML:''},head:()=>'',esc:s=>String(s),canonicalGrade:g=>g,
 student:id=>students.find(s=>s.id===id),
 byNum:(a,b)=>String(a.number||'').localeCompare(String(b.number||''),'zh-Hant',{numeric:true}),
 className:()=>'閱讀班',classById:()=>({kind:'閱讀'}),inClass:(s,c)=>s.classId===c,
 classStudents:()=>students,readingClasses:()=>[{id:'rc1',kind:'閱讀',name:'閱讀班'}],
 readingStudents:()=>students,readingClassSelect:()=>'<select></select>',
 readingItems:()=>({rows,unchecked:[],dup:0})});
vm.runInContext(slice,ctx);ctx.readingPage();
const html=content.innerHTML;
['racc-summary','racc-grid','第 1 名','書籍合計','KIST','王小明','全班書籍合計','racc-card top'].forEach(k=>console.log(k+':',html.includes(k)));
console.log((html.match(/racc-score"><strong>\d+/g)||[]).join(' | '));
