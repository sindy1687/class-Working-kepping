const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({document:{addEventListener(){}},URL,console});
vm.runInContext(fs.readFileSync('js/md-chart.js','utf8'),ctx);vm.runInContext(fs.readFileSync('js/md-media.js','utf8'),ctx);vm.runInContext(fs.readFileSync('js/rich-content.js','utf8'),ctx);
const {mdToHtml,mdPlain,mdUnescape}=ctx;
// 帶跳脫符號的原文直接顯示也不會有反斜線
const raw=String.raw`1\. She \_\_\_ a girl.`+'\n\n'+String.raw`2\. We \_\_\_ friends.`;
const h=mdToHtml(raw);assert.ok(!h.includes('\\'),h);assert.equal((h.match(/md-blank/g)||[]).length,2);assert.match(h,/1\. She <span class="md-blank"/);
// 貼上時去掉反斜線 → 變成編號清單＋填空線
const u=mdUnescape(raw);assert.equal(u,'1. She ___ a girl.\n\n2. We ___ friends.');
const h2=mdToHtml(u);assert.match(h2,/<ol><li>She <span class="md-blank" style="--n:3"/);assert.match(h2,/<ol start="2">/);
assert.match(mdToHtml('I ＿＿＿＿ a student.'),/--n:4/);
assert.match(mdToHtml('__粗體__'),/<strong>粗體<\/strong>/,'兩條底線仍是粗體');
assert.equal(mdPlain(raw),'1. She ＿＿＿ a girl.\n\n2. We ＿＿＿ friends.');
console.log('PASS: 填空線 ___、跳脫符號不再顯示反斜線、貼上自動清理');
