const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({document:{addEventListener(){}},URL,console,btoa:s=>Buffer.from(s,'binary').toString('base64'),unescape,encodeURIComponent});
vm.runInContext(fs.readFileSync('js/md-chart.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('js/md-media.js','utf8'),ctx);vm.runInContext(fs.readFileSync('js/rich-content.js','utf8'),ctx);
const {mdToHtml,mdPlain,parseChart}=ctx;

// 文字大小
const sz=mdToHtml('[特大]今天主題[/特大] 和 [小]備註[/小]\n[大]**重點**[/大]');
assert.match(sz,/<span class="md-size-xl">今天主題<\/span>/);assert.match(sz,/<span class="md-size-s">備註<\/span>/);assert.match(sz,/<span class="md-size-l"><strong>重點<\/strong><\/span>/);

// 內文圖片（Google 雲端硬碟 → 縮圖網址；非 http 不轉）
const im=mdToHtml('![分數板](https://drive.google.com/file/d/ABCDEFGHIJKL123/view)');
assert.match(im,/drive\.google\.com\/thumbnail\?id=ABCDEFGHIJKL123/);assert.match(im,/data-md-img=/);assert.match(im,/md-imgcap">分數板/);
assert.ok(!mdToHtml('![x](javascript:alert(1))').includes('<img'));

// 圖表：「名稱：數字」→ 長條
const c1=parseChart('類型：長條\n標題：閱讀\n單位：本\n小明：5\n小華：8');
assert.equal(c1.meta.type,'bar');assert.deepEqual([...c1.labels],['小明','小華']);assert.deepEqual([...c1.series[0].values],[5,8]);
const h1=mdToHtml('```chart\n標題：閱讀\n小明：5\n小華：8\n```');
assert.match(h1,/<figure class="md-chart">/);assert.equal((h1.match(/class="mk s1"/g)||[]).length,4,"寬版+手機版各 2 根");assert.match(h1,/看數據表/);

// 表格 → 多數列折線，含圖例
const h2=mdToHtml('```chart 折線\n| 週 | 國語 | 數學 |\n| --- | --- | --- |\n| 1 | 70 | 80 |\n| 2 | 75 | 85 |\n```');
assert.match(h2,/class="ln s1"/);assert.match(h2,/class="ln s2"/);assert.match(h2,/md-chart-legend/);assert.match(h2,/1・國語：70/);assert.doesNotMatch(h2,/class="tick"[^>]*>0</,"折線不必從 0 開始");
// 圓餅
const h3=mdToHtml('```圖表\n類型：圓餅\n繪本：4\n橋樑書：3\n文字書：1\n```');
assert.match(h3,/md-chart-pie/);assert.match(h3,/50%/);
// 資料錯誤 → 提示，不會壞掉；內容一律跳脫
assert.match(mdToHtml('```chart\n沒有數字\n```'),/圖表沒有資料/);
assert.ok(!mdToHtml('```chart\n<script>x</script>：3\n好：2\n```').includes('<script>'));

// 清單預覽文字
assert.equal(mdPlain('[大]重點[/大]\n![板書](https://a.com/x.png)\n```chart\n標題：閱讀\n小明：5\n```'),'重點\n〔圖片：板書〕\n〔圖表〕閱讀');
// 對話泡泡裡也能放圖表
assert.match(mdToHtml(':::我\n畫圖\n:::\n:::AI\n```chart\n甲：1\n乙：2\n```\n:::'),/md-bubble"><figure class="md-chart">/);
console.log('PASS: 文字大小、內文圖片（含 XSS 防護）、長條／折線／圓餅圖表、圖例與數據表、清單預覽、對話中的圖表');
