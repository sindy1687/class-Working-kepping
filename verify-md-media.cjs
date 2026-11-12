// 教案內文圖片（media:代號）：顯示、遺失提示、不接受非圖片資料
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ctx=vm.createContext({document:{addEventListener(){}},URL,console,data:{meta:{mdMedia:{mabc1:{src:PNG},mbad1:{src:'data:text/html;base64,PHNjcmlwdD4='}}}}});
for(const f of ['js/md-chart.js','js/md-media.js','js/rich-content.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const {mdToHtml,mdPlain,mdMediaPut,classifyImageLink}=ctx;
const h=mdToHtml(':::我\n畫圖\n:::\n:::ChatGPT\n這是圖表：\n![圖表](media:mabc1)\n:::');
assert.ok(h.includes('src="'+PNG+'"'),'圖片直接顯示');assert.match(h,/md-imgcap">圖表/);
assert.ok(!mdToHtml('![x](media:mbad1)').includes('<img'),'非圖片資料不顯示');
assert.match(mdToHtml('![x](media:mnone)'),/圖片遺失/);
assert.equal(mdPlain('![圖表](media:mabc1)'),'〔圖片：圖表〕');
// 同一張圖只存一次；非圖片拒收
assert.equal(mdMediaPut(PNG),'mabc1');assert.equal(mdMediaPut('data:text/html;base64,AAAA'),'');
const id=mdMediaPut('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');assert.match(id,/^m[\w]+$/);assert.equal(classifyImageLink('media:'+id).kind,'media');
console.log('PASS: 教案內文圖片（存進資料、顯示、遺失提示、只收圖片）');
