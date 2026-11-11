const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const src=fs.readFileSync('js/app.js','utf8');
const label={hidden:false},note={value:'舊原因',closest:()=>label};const nodes={attNote:note,attWhyBox:{},attChips:{},attTimeBox:{}};
const ctx=vm.createContext({$:id=>nodes[id],esc:String,reasonChips:()=>''});
vm.runInContext(src.slice(src.indexOf('const needWhy='),src.indexOf('const attWhy='))+';globalThis.needsReason=needWhy;',ctx);
for(const status of ['事假','公假']){assert.equal(ctx.needsReason({status}),true);ctx.updateAttendanceReasonUI(status,true);assert.equal(label.hidden,false);assert.equal(note.required,true);assert.equal(note.disabled,false);}
for(const status of ['準時','遲到','早退','病假','缺席','請假']){assert.equal(ctx.needsReason({status}),false);note.value='舊原因';ctx.updateAttendanceReasonUI(status,true);assert.equal(label.hidden,true);assert.equal(note.required,false);assert.equal(note.disabled,true);assert.equal(note.value,'');assert.equal(nodes.attTimeBox.hidden,!['遲到','早退'].includes(status));}
console.log('PASS: reason required only for personal/official leave, other reasons hidden, late/early times retained');
