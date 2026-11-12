const fs=require('fs'),vm=require('vm'),assert=require('assert'),listeners=[];const c={document:{addEventListener:(type,fn)=>{if(type==='click')listeners.push(fn);}},render(){}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/materials.js','utf8'),c);vm.runInContext("matCat='閱讀文章';matClass='reading';matGrade='5年級';matQuery='2026';matStage='國小';matStar=true;globalThis.matFolder='閱讀';globalThis.matBook='初上';globalThis.matPaper='1卷';",c);
const button={dataset:{matSubject:'數學'},hasAttribute:()=>false};listeners[0]({target:{closest:()=>button}});
assert(vm.runInContext("matSubject==='數學'&&!matCat&&!matClass&&!matGrade&&!matQuery&&!matStage&&!matStar&&!matFolder&&!matBook&&!matPaper",c));
console.log('PASS: switching from reading to math clears all incompatible filters');
