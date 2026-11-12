const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({document:{addEventListener(){}},URL,console});
vm.runInContext(fs.readFileSync('js/md-media.js','utf8'),ctx);vm.runInContext(fs.readFileSync('js/rich-content.js','utf8'),ctx);
const {chatTextToMd,mdToHtml,mdPlain}=ctx;

// ChatGPT 整頁複製（中文介面）
const gpt='你說：\n幫我設計一堂五年級分數加法的課\nChatGPT 說：\n## 教學目標\n- 理解通分\n- 會做異分母加法\n\n```\n1/2 + 1/3 = 5/6\n```\n你說：\n再加一個暖身活動\nChatGPT 說：\n**暖身**：披薩切片遊戲';
const md=chatTextToMd(gpt);
assert.ok(md,'ChatGPT 對話應被辨識');
assert.equal((md.match(/^:::我$/gm)||[]).length,2);
assert.equal((md.match(/^:::ChatGPT$/gm)||[]).length,2);
const html=mdToHtml(md);
assert.equal((html.match(/class="md-chat"/g)||[]).length,1,'連續對話應包在同一個對話框');
assert.equal((html.match(/md-turn user/g)||[]).length,2);
assert.equal((html.match(/md-turn ai/g)||[]).length,2);
assert.match(html,/<h3>教學目標<\/h3>/);assert.match(html,/<pre><code>1\/2 \+ 1\/3 = 5\/6<\/code><\/pre>/);assert.match(html,/<strong>暖身<\/strong>/);

// 英文介面 + 同一行內容
const en=chatTextToMd('You said:\nHi\nClaude: Hello **teacher**');
assert.match(en,/:::我\nHi\n:::/);assert.match(en,/:::Claude\nHello \*\*teacher\*\*\n:::/);

// 一般教案的「老師：」對話稿不應被自動改版（只有手動按鈕才會）
const script='老師：同學好\n學生：老師好\n老師：今天上分數';
assert.equal(chatTextToMd(script),null);
assert.ok(chatTextToMd('問：什麼是通分？\n答：把分母變一樣',true));
// 只有單方發言 → 不套用
assert.equal(chatTextToMd('ChatGPT：第一段\nChatGPT：第二段'),null);

// 防 XSS：對話內容一律跳脫
const x=mdToHtml(':::我\n<img src=x onerror=alert(1)>\n:::\n:::AI\nok\n:::');
assert.ok(!x.includes('<img'),'貼上的 HTML 必須被跳脫');

// 清單預覽
assert.equal(mdPlain(':::我\n你好\n:::\n:::AI\n**嗨**\n:::'),'【我】\n你好\n\n【AI】\n嗨');
// 程式碼區塊裡的 ::: 不會切斷
assert.match(mdToHtml(':::AI\n```\n:::\n```\n後面\n:::\n:::我\nq\n:::'),/<pre><code>:::<\/code><\/pre><\/div><p>後面<\/p>/);
console.log('PASS: AI 對話辨識（ChatGPT/Claude/中英文）、聊天版面、教案對話稿不誤判、跳脫、預覽文字、程式碼區塊');
