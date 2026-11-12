const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={URL,document:{addEventListener(){}},data:{classes:[]},className:()=>'',esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')};vm.createContext(c);for(const file of ['material-stage','material-english','material-formats','material-list','materials'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),c);
const base={name:'L1 檢測',subject:'英文',category:'檢測卷',bookLevel:'初上',paperNumber:'1卷',stage:'國小',unit:'L1'};
const rows=[{...base,id:'pdf',fileName:'L1 檢測.pdf',mimeType:'application/pdf',url:'https://example.com/a.pdf'},{...base,id:'word',fileName:'L1 檢測.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',url:'https://example.com/a.docx'}];
const groups=c.materialFormatGroups(rows);assert.equal(groups.length,1);assert.equal(groups[0]._formatMembers.length,2);const html=c.materialFormatRow(groups[0]);assert(html.includes('PDF ↗'));assert(html.includes('Word ↗'));assert(html.includes('data-edit="pdf"'));assert(html.includes('data-edit="word"'));
assert.equal(c.materialFormatGroups([...rows,{...rows[0],id:'other',paperNumber:'2卷'}]).length,2);
assert.equal(c.materialFormatGroups([...rows,{...rows[0],id:'answer',category:'解答'}]).length,2);
assert.equal(c.materialFormatGroups([...rows,{...rows[0],id:'old',sourcePath:'英文/過期檢測卷'}]).length,2);
assert(!c.materialFormatLinks({...rows[0],url:'javascript:alert(1)'}).includes('href='));
const all=require('./教材匯入/教材庫-合併第二資料夾.json'),actual=c.materialFormatGroups(all);assert.equal(actual.reduce((n,g)=>n+g._formatMembers.length,0),all.length);assert(actual.length<all.length);
console.log('PASS: same-name PDF/Word share a row; separate papers/answers/versions; each file editable; all '+all.length+' files retained in '+actual.length+' display rows');

