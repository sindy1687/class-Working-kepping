const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={document:{addEventListener(){}},classById:()=>({}),addDays:(s,i)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);},calFor:()=>null,scheduledNormally:(c,s,d)=>[1,3].includes(new Date(d+'T00:00:00Z').getUTCDay())};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/cleaning.js','utf8'),ctx);
assert.equal(ctx.cleaningVisibleDays('c','2026-11-01').length,9);
assert.equal(ctx.cleaningMonthDates('2028-02-01').length,29);
assert.equal(ctx.cleaningMonthDates('2027-02-01').length,28);
assert.equal(ctx.shiftCleaningMonth('2026-12-01',1),'2027-01-01');
assert.equal(ctx.shiftCleaningMonth('2026-01-01',-1),'2025-12-01');
console.log('PASS: monthly school days, leap year and year boundary navigation');
