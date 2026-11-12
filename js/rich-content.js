'use strict';
/* 圖文內容：AI 排版（Markdown）顯示、貼上 AI 網頁內容自動轉排版、紀錄圖片（Google 相簿 / OneDrive / 雲端硬碟 / 圖片網址）、閱讀檢視 */

/* ---------- Markdown → HTML（先跳脫再轉換，不會執行任何貼上的程式碼） ---------- */
function mdEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function mdSafeUrl(u){try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:'';}catch{return '';}}
function mdInline(s){
 const keep=[];const hold=h=>'\u0000'+(keep.push(h)-1)+'\u0000';
 s=String(s).replace(/`([^`]+)`/g,(_,c)=>hold('<code>'+mdEsc(c)+'</code>'));
 /* 填空線：___（3 條以上，含 \_\_\_ 與全形＿＿＿） */
 s=s.replace(/(?:\\?_|＿){3,}/g,m=>{const n=(m.match(/[_＿]/g)||[]).length;return hold('<span class="md-blank" style="--n:'+Math.min(n,40)+'" role="img" aria-label="填空"></span>');});
 /* 跳脫字元：\. \* \# … 直接顯示符號本身 */
 s=s.replace(/\\([\\`*_{}\[\]()#+\-.!|~=>:])/g,(_,c)=>hold(mdEsc(c)));
 s=s.replace(/!\[([^\]]*)\]\((\S+?)\)/g,(m,cap,u)=>{const html=mdImage(u,cap);return html?hold(html):m;});
 s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(m,t,u)=>{const h=mdSafeUrl(u);return h?hold('<a href="'+mdEsc(h)+'" target="_blank" rel="noopener noreferrer">'+mdEsc(t)+'</a>'):m;});
 s=s.replace(/https?:\/\/[^\s<>()（）「」，。]+/g,u=>{const h=mdSafeUrl(u);return h?hold('<a href="'+mdEsc(h)+'" target="_blank" rel="noopener noreferrer">'+mdEsc(u)+'</a>'):u;});
 s=mdEsc(s);
 s=s.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/__(.+?)__/g,'<strong>$1</strong>')
  .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g,'$1<em>$2</em>').replace(/~~(.+?)~~/g,'<del>$1</del>').replace(/==(.+?)==/g,'<mark>$1</mark>');
 for(let k=0;k<3;k++)s=s.replace(/\[(特大|大|小)\](.+?)\[\/\1\]/g,(_,z,t)=>'<span class="md-size-'+MD_SIZES[z]+'">'+t+'</span>');
 return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>keep[i]);
}
/* 文字大小：[特大]…[/特大]、[大]…[/大]、[小]…[/小] */
const MD_SIZES={'特大':'xl','大':'l','小':'s'};
/* 內文圖片：![說明](圖片或分享連結)，點一下放大 */
function mdImage(u,cap){const im=classifyImageLink(u);if(!im)return '';im.caption=String(cap||'').trim();
 const body=imgSrc(im,'view')?'<button type="button" class="md-imgbtn" data-md-img="'+mdEsc(JSON.stringify(im))+'" aria-label="放大圖片">'+imgTag(im,'view')+'</button>':imgFallback(im);
 return '<span class="md-img">'+body+(im.caption?'<span class="md-imgcap">'+mdEsc(im.caption)+'</span>':'')+'</span>';}
function mdTableRow(l){return l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());}
function mdToHtml(src){
 const lines=String(src||'').replace(/\r\n?/g,'\n').split('\n');let out='',i=0,para=[];
 const flush=()=>{if(para.length){out+='<p>'+para.map(mdInline).join('<br>')+'</p>';para=[];}};
 const listRe=/^(\s*)([-*+•]|\d+[.)、])\s+(.*)$/;
 while(i<lines.length){const l=lines[i];
  if(MD_TURN_RE.test(l)){flush();let chat='';
   while(i<lines.length){const t=lines[i].match(MD_TURN_RE);if(!t)break;i++;const body=[];let fence=false;
    while(i<lines.length){const x=lines[i];if(/^\s*```/.test(x))fence=!fence;if(!fence&&/^\s*:::\s*$/.test(x)){i++;break;}if(!fence&&MD_TURN_RE.test(x))break;body.push(x);i++;}
    chat+=mdTurn(t[1],body.join('\n'));
    let j=i;while(j<lines.length&&!lines[j].trim())j++;if(j<lines.length&&MD_TURN_RE.test(lines[j]))i=j;else break;}
   out+='<div class="md-chat">'+chat+'</div>';continue;}
  if(/^\s*```/.test(l)){flush();const fm=l.match(/^\s*```\s*(\S*)\s*(.*)$/),code=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))code.push(lines[i++]);i++;
   if(/^(chart|圖表)$/i.test(fm[1])&&typeof renderChart==='function'){out+=renderChart(code.join('\n'),fm[2]);continue;}
   out+='<div class="md-code"><div class="md-code-h"><span>'+mdEsc(fm[1]||'程式碼')+'</span><button type="button" class="md-copy" data-md-copy>複製</button></div><pre><code>'+mdEsc(code.join('\n'))+'</code></pre></div>';continue;}
  if(!l.trim()){flush();i++;continue;}
  let m=l.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);if(m){flush();const n=Math.min(6,m[1].length+1);out+='<h'+n+'>'+mdInline(m[2])+'</h'+n+'>';i++;continue;}
  if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){flush();out+='<hr>';i++;continue;}
  if(l.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i+1])){flush();const head=mdTableRow(l);i+=2;const rows=[];while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rows.push(mdTableRow(lines[i++]));
   out+='<div class="md-table"><table><thead><tr>'+head.map(c=>'<th>'+mdInline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+head.map((_,k)=>'<td>'+mdInline(r[k]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';continue;}
  if(/^\s*>/.test(l)){flush();const q=[];while(i<lines.length&&/^\s*>/.test(lines[i]))q.push(lines[i++].replace(/^\s*>\s?/,''));out+='<blockquote>'+mdToHtml(q.join('\n'))+'</blockquote>';continue;}
  if(listRe.test(l)){flush();const items=[];
   while(i<lines.length){const x=lines[i].match(listRe);if(x){items.push({ind:x[1].replace(/\t/g,'  ').length,ord:/\d/.test(x[2]),num:parseInt(x[2],10),text:x[3]});i++;continue;}
    if(lines[i].trim()&&/^\s{2,}/.test(lines[i])&&items.length){items[items.length-1].text+='\n'+lines[i].trim();i++;continue;}break;}
   out+=mdList(items);continue;}
  para.push(l.trim());i++;}
 flush();return out;
}
/* AI 對話版面：:::我 … ::: / :::ChatGPT … ::: */
const MD_TURN_RE=/^\s*:::\s*([^:\s].*?)\s*$/;
const CHAT_USER_NAME=/^(我|使用者|user|you|老師|學生|問|提問)$/i;
function mdTurn(label,body){const user=CHAT_USER_NAME.test(label),ava=user?label.slice(0,1):(label.match(/[A-Za-z一-鿿]/)||['A'])[0].toUpperCase();
 /* 版面比照 AI 網站：我的提問＝右側灰色泡泡（不顯示名字）；AI 回答＝整欄文字，不加框 */
 return '<div class="md-turn '+(user?'user':'ai')+'"><div class="md-who'+(user?' md-sr':'')+'"><span class="md-ava" aria-hidden="true">'+mdEsc(ava)+'</span>'+mdEsc(label)+'</div><div class="md-bubble">'+(body.trim()?mdToHtml(body):'<p class="help">（沒有內容）</p>')+'</div></div>';}
function mdList(items){let html='';const stack=[];
 for(const it of items){
  while(stack.length&&it.ind<stack[stack.length-1].ind){html+='</li></'+stack.pop().tag+'>';}
  const top=stack[stack.length-1];
  if(!top||it.ind>top.ind){const tag=it.ord?'ol':'ul';html+='<'+tag+(it.ord&&it.num>1?' start="'+it.num+'"':'')+'>';stack.push({ind:it.ind,tag});}
  else html+='</li>';
  const task=it.text.match(/^\[([ xX])\]\s+(.*)$/s);
  html+=task?'<li class="md-task"><span class="md-check'+(task[1]===' '?'':' on')+'" aria-hidden="true"></span>'+task[2].split('\n').map(mdInline).join('<br>'):'<li>'+it.text.split('\n').map(mdInline).join('<br>');}
 while(stack.length)html+='</li></'+stack.pop().tag+'>';return html;}
/* 清單表格預覽用：去掉 Markdown 符號，只留文字 */
function mdPlain(s){return String(s||'').replace(/\r\n?/g,'\n').replace(/(?:\\?_|＿){3,}/g,'＿＿＿').replace(/\\([\\`*_{}\[\]()#+\-.!|~=>:])/g,'$1')
 .replace(/^[ \t]*```[ \t]*(?:chart|圖表)[^\n]*\n([\s\S]*?)^[ \t]*```[ \t]*$/gim,(_,b)=>'〔圖表〕'+(((b.match(/(?:標題|title)\s*[:：]\s*(.+)/i)||[])[1])||''))
 .replace(/!\[([^\]]*)\]\(\S+?\)/g,(_,c)=>'〔圖片'+(c?'：'+c:'')+'〕').replace(/\[\/?(特大|大|小)\]/g,'').split('\n').filter(l=>!/^\s*\|?\s*:?-{2,}/.test(l)&&!/^\s*```/.test(l)).map(l=>l.replace(/^\s*:::\s*([^:\s].*?)\s*$/,'【$1】').replace(/^\s*:::\s*$/,'').replace(/^\s*#{1,6}\s+/,'').replace(/^\s*>\s?/,'').replace(/^(\s*)[-*+]\s+(\[[ xX]\]\s+)?/,'$1• ').replace(/\*\*|__|~~|==|`/g,'').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,'$1').replace(/^\s*\|(.*)\|\s*$/,(_,c)=>c.split('|').map(x=>x.trim()).join('　'))).join('\n').replace(/\n{3,}/g,'\n\n').trim();}

/* ---------- 貼上 AI 網頁內容（ChatGPT / Gemini / Claude / Google 文件）→ 保留排版 ---------- */
function htmlToMd(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const inline=n=>[...n.childNodes].map(walkInline).join('');
 function walkInline(n){
  if(n.nodeType===3)return n.nodeValue.replace(/\s+/g,' ');
  if(n.nodeType!==1)return '';const t=n.tagName.toLowerCase(),fw=(n.getAttribute('style')||'').match(/font-weight:\s*(\d+|bold|normal)/);
  if(t==='br')return '\n';if(['script','style','button','canvas'].includes(t))return '';
  if(t==='svg'){const id=svgToMedia(n);return id?'\n![圖表](media:'+id+')\n':'';}
  if(t==='img'){const raw=n.getAttribute('src')||'',alt=(n.getAttribute('alt')||'').replace(/[\[\]\n]/g,' ').trim();
   if(MD_DATA_IMG_RE.test(raw)){const id=mdMediaPut(raw);return '\n!['+alt+'](media:'+id+')\n';}
   const src=mdSafeUrl(raw);return src?'\n!['+alt+']('+src+')\n':'';}
  if(['ul','ol','table','pre','blockquote','h1','h2','h3','h4','h5','h6','p','div','hr'].includes(t))return '\n'+block(n).trim()+'\n';
  const c=inline(n);if(!c.trim())return c;
  if((t==='strong'||(t==='b'&&!(fw&&fw[1]==='normal')))||(t==='span'&&fw&&(fw[1]==='bold'||+fw[1]>=600)))return '**'+c.trim()+'** ';
  if(t==='em'||t==='i')return '*'+c.trim()+'*';if(t==='del'||t==='s')return '~~'+c.trim()+'~~';if(t==='mark')return '=='+c.trim()+'==';
  if(t==='code')return '`'+n.textContent+'`';
  if(t==='a'){const h=mdSafeUrl(n.getAttribute('href')||'');return h&&c.trim()!==h?'['+c.trim()+']('+h+')':c;}
  const z=htmlSize(n,t);if(z&&!c.includes('\n'))return '['+z+']'+c.trim()+'[/'+z+']';
  return c;}
 /* 字級：Google 文件／Word 的 font-size、<big>/<small> → [特大]/[大]/[小] */
 function htmlSize(n,t){if(t==='big')return '大';if(t==='small')return '小';if(t==='font'){const s=+n.getAttribute('size');return s>=6?'特大':s===5?'大':s&&s<=2?'小':'';}
  if(t!=='span')return '';const m=(n.getAttribute('style')||'').match(/font-size:\s*([\d.]+)(px|pt|em|rem)/);if(!m)return '';
  const px=+m[1]*({px:1,pt:4/3,em:16,rem:16}[m[2]]);return px>=26?'特大':px>=19?'大':px<=12.5?'小':'';}
 function list(n,depth){const ord=n.tagName.toLowerCase()==='ol';let k=parseInt(n.getAttribute('start')||'1',10),s='';
  for(const li of n.children){if(li.tagName.toLowerCase()!=='li')continue;const box=li.querySelector(':scope > input[type=checkbox]');let txt='',sub='';
   for(const c of li.childNodes){const tg=c.nodeType===1?c.tagName.toLowerCase():'';if(tg==='ul'||tg==='ol')sub+=list(c,depth+1);else if(tg==='p'||tg==='div')txt+=' '+inline(c);else txt+=walkInline(c);}
   s+='  '.repeat(depth)+(ord?(k++)+'. ':'- ')+(box?(box.checked?'[x] ':'[ ] '):'')+txt.replace(/\s*\n\s*/g,' ').trim()+'\n'+sub;}
  return s;}
 function block(n){let s='';
  for(const c of n.childNodes){
   if(c.nodeType===3){s+=c.nodeValue.replace(/\s+/g,' ');continue;}if(c.nodeType!==1)continue;const t=c.tagName.toLowerCase();
   if(/^h[1-6]$/.test(t))s+='\n\n'+'#'.repeat(+t[1])+' '+inline(c).trim()+'\n\n';
   else if(t==='p')s+='\n\n'+inline(c).trim()+'\n\n';
   else if(t==='ul'||t==='ol')s+='\n\n'+list(c,0)+'\n';
   else if(t==='pre')s+='\n\n```\n'+c.textContent.replace(/\n$/,'')+'\n```\n\n';
   else if(t==='blockquote')s+='\n\n'+block(c).trim().split('\n').map(x=>'> '+x).join('\n')+'\n\n';
   else if(t==='hr')s+='\n\n---\n\n';
   else if(t==='table'){const rows=[...c.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>inline(td).replace(/\|/g,'／').replace(/\s+/g,' ').trim()));if(rows.length){const w=Math.max(...rows.map(r=>r.length));const fix=r=>'| '+Array.from({length:w},(_,k)=>r[k]||'').join(' | ')+' |';s+='\n\n'+fix(rows[0])+'\n|'+' --- |'.repeat(w)+'\n'+rows.slice(1).map(fix).join('\n')+'\n\n';}}
   else if(['div','section','article','main','body','span','b','font'].includes(t)&&c.querySelector('p,ul,ol,h1,h2,h3,h4,h5,h6,table,pre,blockquote,div'))s+=block(c);
   else if(t==='div')s+='\n'+inline(c).trim()+'\n';
   else if(t==='br')s+='\n';
   else s+=walkInline(c);}
  return s;}
 return block(doc.body).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/\*\* +([，。、：；！？）」])/g,'**$1').trim();
}
/* ---------- AI 對話 → 對話版面 ---------- */
const CHAT_AI_NAMES={chatgpt:'ChatGPT',gemini:'Gemini',claude:'Claude',copilot:'Copilot',perplexity:'Perplexity'};
const CHAT_NAMES_STRONG='you|user|我|使用者|你說|您說|你说|chatgpt|gemini|claude|copilot|perplexity|ai ?助理|ai|assistant|助理';
const CHAT_NAMES_BROAD=CHAT_NAMES_STRONG+'|老師|學生|提問|問|回答|答|q|a';
const chatLabelRe=names=>new RegExp('^\\s*(?:#{1,6}\\s+)?(?:\\*\\*)?\\s*('+names+')(?:\\s*(?:said|說了?|说|回答|回覆))?\\s*(?:\\*\\*)?\\s*[:：]\\s*(?:\\*\\*)?\\s*(.*)$','i');
const CHAT_RE=chatLabelRe(CHAT_NAMES_STRONG),CHAT_RE_BROAD=chatLabelRe(CHAT_NAMES_BROAD);
function chatWho(raw){const k=raw.toLowerCase().replace(/\s+/g,'');
 if(/^(you|user|我|使用者|你說|您說|你说|q|提問|問)$/.test(k))return {role:'user',name:'我'};
 if(k==='老師'||k==='學生')return {role:'user',name:raw};
 return {role:'ai',name:CHAT_AI_NAMES[k]||'AI'};}
function chatTurnsMd(turns){
 const merged=[];for(const t of turns){const last=merged[merged.length-1];if(last&&last.name===t.name)last.md+='\n\n'+t.md;else merged.push({...t});}
 if(merged.length<2||!merged.some(t=>t.role==='user')||!merged.some(t=>t.role==='ai'))return null;
 return merged.map(t=>':::'+t.name+'\n'+t.md.trim()+'\n:::').join('\n\n');}
/* 純文字：依「你說：／ChatGPT 說：／我：／AI：」等發言者切段 */
function chatTextToMd(text,broad){
 if(!text)return null;const re=broad?CHAT_RE_BROAD:CHAT_RE,turns=[],pre=[];let cur=null,fence=false;
 for(const l of String(text).replace(/\r\n?/g,'\n').split('\n')){if(/^\s*```/.test(l))fence=!fence;const m=!fence&&l.match(re);
  if(m){cur={...chatWho(m[1]),md:m[2]||''};turns.push(cur);continue;}
  if(cur)cur.md+='\n'+l;else pre.push(l);}
 const body=chatTurnsMd(turns.filter(t=>t.md.trim()));if(!body)return null;const head=pre.join('\n').trim();
 return (head?head+'\n\n':'')+body;}
/* 網頁 HTML：ChatGPT / Gemini / Claude 網頁本身標記的發言者 */
function chatHtmlToMd(html){const doc=new DOMParser().parseFromString(html,'text/html');
 let els=[...doc.querySelectorAll('[data-message-author-role],user-query,model-response,[data-testid="user-message"],.font-user-message,.font-claude-response,.font-claude-message')];
 els=els.filter(e=>!els.some(o=>o!==e&&o.contains(e)));
 const turns=els.map(e=>{const tag=e.tagName.toLowerCase(),r=e.getAttribute('data-message-author-role');if(r&&r!=='user'&&r!=='assistant')return null;
  const user=r?r==='user':tag==='user-query'||e.matches('[data-testid="user-message"],.font-user-message');
  const name=user?'我':tag==='model-response'?'Gemini':/font-claude/.test(e.className)?'Claude':r==='assistant'?'ChatGPT':'AI';
  const md=(htmlToMd(e.innerHTML)||e.textContent||'').replace(/^\s*(?:#{1,6}\s*)?(?:you said|你說|chatgpt said|chatgpt ?說)\s*[:：]\s*/i,'').trim();
  return md?{role:user?'user':'ai',name,md}:null;}).filter(Boolean);
 return chatTurnsMd(turns);}
function refreshPreview(ta){const pv=ta.closest('label')?.querySelector('.md-preview');if(pv&&!pv.hidden)pv.innerHTML=mdToHtml(ta.value);}
/* 手動按鈕：把已貼上的對話套成對話版面 */
document.addEventListener('click',e=>{const b=e.target.closest('[data-md-chat]');if(!b)return;e.preventDefault();const lab=b.closest('label'),ta=lab&&lab.querySelector('textarea');if(!ta)return;
 if(/^\s*:::\s*[^:\s]/m.test(ta.value)){toast('已經是對話版面了，按「預覽排版」查看。');return;}
 const c=chatTextToMd(ta.value,true);
 if(!c){toast('找不到發言者。請在每段開頭加上「我：」和「AI：」（也可用 ChatGPT：、Gemini：、Claude：），再按一次。');return;}
 ta.focus();ta.select();let ok=false;try{ok=document.execCommand('insertText',false,c);}catch{}
 if(!ok||ta.value!==c){ta.value=c;ta.dispatchEvent(new Event('input',{bubbles:true}));}
 const pv=lab.querySelector('.md-preview'),pb=lab.querySelector('[data-md-preview]');if(pv&&pv.hidden&&pb)pb.click();else refreshPreview(ta);
 toast('已套用 AI 對話版面，不滿意可按 Ctrl+Z 復原。');});
const MD_ESC_RE=/\\[_.*#\-!\[\]()+`>|~=]/;
function mdUnescape(s){return String(s).replace(/\\([_.*#\-!\[\]()+`>|~=])/g,'$1');}
document.addEventListener('paste',e=>{const ta=e.target;if(!(ta instanceof HTMLTextAreaElement)||!ta.closest('#editForm'))return;
 const cd=e.clipboardData;if(!cd)return;const html=cd.getData('text/html'),text=cd.getData('text/plain');let md='',chat=false;
 /* 直接貼上圖片（截圖、在 AI 網頁「複製圖片」）→ 存進教案 */
 const files=[...(cd.files||[])].filter(f=>/^image\/(png|jpeg|gif|webp)$/.test(f.type));
 if(files.length&&!(html&&new DOMParser().parseFromString(html,'text/html').body.textContent.trim())){e.preventDefault();pasteImageFiles(ta,files);return;}
 if(html){try{md=chatHtmlToMd(html)||'';chat=!!md;}catch{}
  if(!md&&/<(h[1-6]|li|strong|b|em|table|pre|blockquote|img|svg|big|small)\b|font-size:\s*(?:1[9-9]|[2-9]\d)px|font-size:\s*(?:1[4-9]|[2-9]\d)pt/i.test(html)){try{md=htmlToMd(html);}catch{}}}
 if(!chat){const c=chatTextToMd(md||text);if(c){md=c;chat=true;}}
 /* 從 AI／筆記軟體複製的文字常帶 \_ \. 這類跳脫符號 → 去掉反斜線 */
 let unesc=false;if(!md&&MD_ESC_RE.test(text)){md=mdUnescape(text);unesc=true;}else if(md&&MD_ESC_RE.test(md)){md=mdUnescape(md);}
 if(!md)return;e.preventDefault();
 if(unesc){ta.setRangeText(md,ta.selectionStart,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input',{bubbles:true}));refreshPreview(ta);if(typeof toast==='function')toast('已去掉多餘的反斜線，___ 會顯示成填空線。');return;}
 ta.setRangeText(md,ta.selectionStart,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input',{bubbles:true}));refreshPreview(ta);
 if(/!\[[^\]]*\]\(https?:/.test(md))localizeRemoteImages(ta,md);
 if(chat){if(typeof toast==='function')toast('已套用 AI 對話版面（我的提問／AI 回答分開顯示），按「預覽排版」看看。');return;}
 if(typeof toast==='function')toast('已保留 AI 排版（標題、粗體、清單、表格）。想貼純文字請按 Ctrl+Shift+V。');});

/* 編輯表單：textarea 下方的「預覽排版」 */
const MD_INSERT_BTNS=[['h','標題','把這一行變成標題'],['xl','特大字','選取文字後按，變特大字'],['l','大字','選取文字後按，變大字'],['s','小字','選取文字後按，變小字'],['b','粗體','選取文字後按，變粗體'],['table','表格','插入表格；選取從 Excel 複製的資料會直接轉成表格'],['img','圖片','插入一張圖片（貼上圖片或分享連結）'],['chart','圖表','插入圖表；選取表格或「名稱：數字」會直接畫成圖表']];
const CHART_TEMPLATE='```chart\n類型：長條（可改成 橫條、折線、圓餅）\n標題：本週閱讀本數\n單位：本\n小明：5\n小華：8\n小美：3\n```';
function mdInsert(ta,text,a,b){ta.focus();ta.setSelectionRange(a,b);let ok=false;try{ok=document.execCommand('insertText',false,text);}catch{}
 if(!ok||ta.value.slice(a,a+text.length)!==text){ta.setRangeText(text,a,b,'end');ta.dispatchEvent(new Event('input',{bubbles:true}));}}
function mdBlock(ta,a,b,text){const v=ta.value;return (a>0&&v[a-1]!=='\n'?'\n\n':a>0&&v[a-2]!=='\n'?'\n':'')+text+(b<v.length&&v[b]!=='\n'?'\n\n':'\n');}
function tsvToTable(s){const rows=s.replace(/\n+$/,'').split('\n').map(r=>r.split('\t').map(c=>c.trim().replace(/\|/g,'／')));const w=Math.max(...rows.map(r=>r.length));const fix=r=>'| '+Array.from({length:w},(_,k)=>r[k]||'').join(' | ')+' |';return [fix(rows[0]),'|'+' --- |'.repeat(w),...rows.slice(1).map(fix)].join('\n');}
function mdToolAction(ta,act){const a=ta.selectionStart,b=ta.selectionEnd,sel=ta.value.slice(a,b);
 if(act==='h'){const ls=ta.value.lastIndexOf('\n',a-1)+1;const m=ta.value.slice(ls).match(/^#{1,6}\s*/);if(m)mdInsert(ta,m[0].length>=4?'':'#'.repeat(m[0].trim().length+1)+' ',ls,ls+m[0].length);else mdInsert(ta,'## ',ls,ls);return;}
 if(act==='b'||act==='xl'||act==='l'||act==='s'){const tag={xl:'特大',l:'大',s:'小'}[act],w=x=>act==='b'?'**'+x+'**':'['+tag+']'+x+'[/'+tag+']';
  const t=sel||'文字';mdInsert(ta,t.split('\n').map(x=>x.trim()?w(x):x).join('\n'),a,b);if(!sel){const p=a+(act==='b'?2:tag.length+2);ta.setSelectionRange(p,p+2);}return;}
 if(act==='table'){const t=sel.includes('\t')?tsvToTable(sel):'| 項目 | 內容 | 備註 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |';mdInsert(ta,mdBlock(ta,a,b,t),a,b);return;}
 if(act==='chart'){const t=sel.trim()&&(/\|/.test(sel)||/[:：]\s*-?\d/.test(sel)||sel.includes('\t'))?'```chart\n類型：長條\n標題：\n'+sel.trim()+'\n```':CHART_TEMPLATE;mdInsert(ta,mdBlock(ta,a,b,t),a,b);
  const pv=ta.closest('label')?.querySelector('.md-preview'),pb=ta.closest('label')?.querySelector('[data-md-preview]');if(pv&&pv.hidden&&pb)pb.click();return;}
 if(act==='img'){const u=prompt('貼上圖片連結（Google 相簿「複製圖片網址」、Google 雲端硬碟或 OneDrive 分享連結都可以）');if(!u)return;const c=classifyImageLink(u);
  if(!c){toast('請貼上 http 開頭的連結。');return;}if(c.kind==='google-album')toast('這是整本相簿的連結，會顯示成相簿卡片；要直接看到照片，請在照片上按右鍵「複製圖片網址」。');
  const cap=sel.trim().replace(/[\[\]\n]/g,' ');mdInsert(ta,mdBlock(ta,a,b,'!['+cap+']('+c.url+')'),a,b);}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-md-tool]');if(!b)return;e.preventDefault();const ta=b.closest('label')?.querySelector('textarea');if(ta)mdToolAction(ta,b.dataset.mdTool);});
function mdToolsHtml(){return '<span class="md-insert" role="toolbar" aria-label="插入排版">'+MD_INSERT_BTNS.map(([k,t,h])=>'<button type="button" class="iconbtn md-tool-'+k+'" data-md-tool="'+k+'" title="'+h+'">'+t+'</button>').join('')+'</span><span class="md-tools"><button type="button" class="iconbtn" data-md-preview>預覽排版</button><button type="button" class="iconbtn" data-md-chat title="把「我：…」「AI：…」的對話排成聊天版面">套用對話版面</button><span class="help">可直接貼上 ChatGPT、Gemini、Claude 的回答或整段對話，會自動排版</span></span><span class="md-preview md-body" hidden></span>';}
document.addEventListener('click',e=>{const b=e.target.closest('[data-md-preview]');if(!b)return;e.preventDefault();const lab=b.closest('label'),ta=lab&&lab.querySelector('textarea'),pv=lab&&lab.querySelector('.md-preview');if(!ta||!pv)return;
 const on=pv.hidden;pv.hidden=!on;b.textContent=on?'收起預覽':'預覽排版';b.classList.toggle('on',on);if(on)pv.innerHTML=ta.value.trim()?mdToHtml(ta.value):'<span class="help">還沒有內容</span>';});
document.addEventListener('input',e=>{const ta=e.target;if(!(ta instanceof HTMLTextAreaElement))return;const pv=ta.closest('label')?.querySelector('.md-preview');if(pv&&!pv.hidden)pv.innerHTML=mdToHtml(ta.value);});

/* ---------- 圖片 ---------- */
const IMG_MAX=40;
function imgId(){return 'im'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function oneDriveDirect(u){const b=btoa(unescape(encodeURIComponent(u))).replace(/=+$/,'').replace(/\//g,'_').replace(/\+/g,'-');return 'https://api.onedrive.com/v1.0/shares/u!'+b+'/root/content';}
/* 依連結種類判斷能不能直接顯示 */
function classifyImageLink(raw){
 let s=String(raw||'').trim();
 const mm=s.match(/^media:([\w-]{4,40})$/);if(mm){const src=mdMediaGet(mm[1]);return {kind:'media',url:'',src};}const iframe=s.match(/<iframe[^>]+src=["']([^"']+)["']/i)||s.match(/<img[^>]+src=["']([^"']+)["']/i);if(iframe)s=iframe[1].replace(/&amp;/g,'&');
 const url=mdSafeUrl(s);if(!url)return null;const u=new URL(url),h=u.hostname;
 if(/(^|\.)googleusercontent\.com$/.test(h))return {kind:'google-photos',url,src:url.replace(/=[a-z][\w-]*$/i,'')};
 if(h==='photos.app.goo.gl'||h==='photos.google.com'||(h==='goo.gl'&&u.pathname.startsWith('/photos')))return {kind:'google-album',url,src:''};
 if(h==='drive.google.com'||h==='docs.google.com'){const id=(u.pathname.match(/\/d\/([\w-]{10,})/)||[])[1]||u.searchParams.get('id');if(id)return {kind:'drive',url,src:'https://drive.google.com/thumbnail?id='+id+'&sz=w1600'};return {kind:'link',url,src:''};}
 if(h==='onedrive.live.com'&&/\/(embed|redir|download)/.test(u.pathname)){const d=new URL(url);d.pathname=d.pathname.replace(/\/(embed|redir)/,'/download');return {kind:'onedrive',url,src:d.href};}
 if(h==='1drv.ms'||h==='onedrive.live.com'||/(^|\.)sharepoint\.com$/.test(h)||h==='photos.onedrive.com')return {kind:'onedrive',url,src:oneDriveDirect(url)};
 if(/\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(u.pathname)||/^(i\.imgur\.com|images\.unsplash\.com)$/.test(h))return {kind:'image',url,src:url};
 return {kind:'link',url,src:''};
}
function imgSrc(im,size){if(!im||!im.src)return '';if(im.kind==='media')return MD_DATA_IMG_RE.test(im.src)?im.src:'';const s=mdSafeUrl(im.src);if(!s)return '';if(/googleusercontent\.com/.test(s)&&!/\/d\//.test(s))return s+'='+(size==='full'?'w2400':size==='thumb'?'w300-h300-c':'w1200');if(/drive\.google\.com\/thumbnail/.test(s))return s.replace(/sz=w\d+/,'sz='+(size==='full'?'w2400':size==='thumb'?'w400':'w1200'));return s;}
const IMG_KIND_LABEL={'google-photos':'Google 相簿','google-album':'Google 相簿','drive':'Google 雲端硬碟','onedrive':'OneDrive','image':'圖片','link':'連結','media':'圖片遺失'};
function imgFallback(im){return '<a class="img-linkcard" href="'+mdEsc(mdSafeUrl(im.url))+'" target="_blank" rel="noopener noreferrer"><b>'+(im.kind==='google-album'?'▦':'🖼')+'</b><span>'+mdEsc(IMG_KIND_LABEL[im.kind]||'連結')+'<small>'+(im.kind==='google-album'?'點開看相簿':'無法直接顯示，點開看原圖')+'</small></span></a>';}
function imgTag(im,size,attrs){const src=imgSrc(im,size);if(!src)return imgFallback(im);return '<img src="'+mdEsc(src)+'" alt="'+mdEsc(im.caption||'圖片')+'" loading="lazy" referrerpolicy="no-referrer" data-img-fallback="'+mdEsc(mdSafeUrl(im.url))+'" data-img-kind="'+mdEsc(im.kind)+'" '+(attrs||'')+'>';}
/* 圖片載入失敗（未公開分享、OneDrive 限制等）→ 換成可點開的連結卡 */
document.addEventListener('error',e=>{const img=e.target;if(!(img instanceof HTMLImageElement)||!img.dataset.imgFallback)return;const card=document.createElement('span');card.innerHTML=imgFallback({url:img.dataset.imgFallback,kind:img.dataset.imgKind});img.replaceWith(card.firstChild);},true);
function cleanImages(v){return (Array.isArray(v)?v:[]).filter(x=>x&&typeof x==='object'&&mdSafeUrl(x.url)).slice(0,IMG_MAX).map(x=>({id:String(x.id||imgId()),url:mdSafeUrl(x.url),src:x.src?mdSafeUrl(x.src):'',kind:String(x.kind||'link'),caption:String(x.caption||'').slice(0,200)}));}
function imagesThumbs(v,max=3){const a=cleanImages(v);if(!a.length)return '';return '<span class="img-thumbs">'+a.slice(0,max).map(im=>imgSrc(im,'thumb')?imgTag(im,'thumb'):'<span class="img-mini">'+(im.kind==='google-album'?'▦':'🔗')+'</span>').join('')+(a.length>max?'<span class="img-more">+'+(a.length-max)+'</span>':'')+'</span>';}

/* 編輯表單的圖片欄 */
function imagesControl(v){const a=cleanImages(v);
 return '<div class="imgfield" data-images="'+mdEsc(JSON.stringify(a))+'"><div class="img-edit-list"></div>'+
 '<div class="img-add"><input type="text" class="img-url" placeholder="貼上圖片或相簿連結（可一次貼多行）" aria-label="圖片或相簿連結"><button type="button" class="iconbtn" data-img-add>＋ 加入</button></div>'+
 '<details class="img-help"><summary>怎麼從 Google 相簿、OneDrive 拿連結？</summary><ul>'+
 '<li><b>Google 相簿（一張）</b>：電腦開啟照片 → 在照片上按右鍵 →「複製圖片網址」貼上，會直接顯示。</li>'+
 '<li><b>Google 相簿（整本或分享連結）</b>：相簿 →「分享」→「建立連結」，貼上 photos.app.goo.gl 連結。有設定雲端同步時，會自動把相簿裡的照片全部匯入；沒有的話會顯示成可點開的相簿卡片。</li>'+
 '<li><b>OneDrive</b>：選照片 →「分享」→「複製連結」貼上；或「內嵌」→ 複製產生的程式碼整段貼上（最穩定）。若顯示不出來會改成可點開的卡片。</li>'+
 '<li><b>Google 雲端硬碟</b>：照片設為「知道連結的任何人」可檢視後，貼上分享連結。</li></ul></details></div>';}
function imgEditRows(box){const a=JSON.parse(box.dataset.images||'[]');const list=box.querySelector('.img-edit-list');
 list.innerHTML=a.length?a.map((im,i)=>'<div class="img-edit" data-i="'+i+'">'+(imgSrc(im,'thumb')?imgTag(im,'thumb'):imgFallback(im))+'<input class="img-cap" data-i="'+i+'" value="'+mdEsc(im.caption)+'" placeholder="說明（可留白）" maxlength="200" aria-label="圖片說明"><span class="img-edit-acts"><button type="button" class="iconbtn" data-img-move="'+i+'" '+(i?'':'disabled')+' aria-label="往前移">↑</button><button type="button" class="iconbtn danger" data-img-del="'+i+'" aria-label="移除圖片">×</button></span></div>').join(''):'<p class="help img-empty">還沒有圖片</p>';}
function imgSet(box,a){box.dataset.images=JSON.stringify(cleanImages(a));imgEditRows(box);}
function readImagesField(scope){const box=(scope||document).querySelector('.imgfield');return box?cleanImages(JSON.parse(box.dataset.images||'[]')):undefined;}
function initImageFields(root){(root||document).querySelectorAll('.imgfield').forEach(imgEditRows);}
async function fetchAlbumPhotos(url){
 if(typeof cloud==='undefined'||!cloud||!cloud.url)return null;
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),45000);
 try{const r=await fetch(cloud.url+(cloud.url.includes('?')?'&':'?')+'action=albumPhotos&url='+encodeURIComponent(url),{cache:'no-store',redirect:'follow',signal:ctl.signal});const j=JSON.parse(await r.text());if(!j.ok)throw Error(j.error||'讀取相簿失敗');return j;}
 finally{clearTimeout(t);}}
async function addImageLinks(box){const inp=box.querySelector('.img-url'),btn=box.querySelector('[data-img-add]');const raw=inp.value.trim();if(!raw)return inp.focus();
 const parts=/<iframe|<img/i.test(raw)?[raw]:raw.split(/[\s\n]+/).filter(Boolean);const a=JSON.parse(box.dataset.images||'[]');let added=0,bad=0,album=0;
 btn.disabled=true;const old=btn.textContent;
 try{for(const p of parts){const c=classifyImageLink(p);if(!c){bad++;continue;}
   if(c.kind==='google-album'){btn.textContent='讀取相簿中…';let res=null;try{res=await fetchAlbumPhotos(c.url);}catch(err){if(typeof toast==='function')toast('相簿無法自動匯入：'+err.message+'，先存成相簿卡片。');}
    if(res&&res.photos&&res.photos.length){for(const ph of res.photos){if(a.length>=IMG_MAX)break;if(a.some(x=>x.src===ph.src))continue;a.push({id:imgId(),url:c.url,src:ph.src,kind:'google-photos',caption:''});added++;}album++;continue;}}
   if(a.length>=IMG_MAX)break;if(a.some(x=>x.url===c.url&&x.src===c.src))continue;a.push({id:imgId(),...c,caption:''});added++;}}
 finally{btn.disabled=false;btn.textContent=old;}
 imgSet(box,a);inp.value='';
 if(typeof toast==='function')toast(added?'已加入 '+added+' 張'+(album?'（含相簿匯入）':'')+(a.length>=IMG_MAX?'；每筆最多 '+IMG_MAX+' 張':''):bad?'請貼上 http 開頭的連結。':'沒有新的圖片（可能已加入過）。');}
document.addEventListener('click',e=>{const box=e.target.closest('.imgfield');if(!box)return;
 if(e.target.closest('[data-img-add]')){e.preventDefault();addImageLinks(box);return;}
 const del=e.target.closest('[data-img-del]'),mv=e.target.closest('[data-img-move]');
 if(del||mv){e.preventDefault();const a=JSON.parse(box.dataset.images||'[]');if(del)a.splice(+del.dataset.imgDel,1);else{const i=+mv.dataset.imgMove;[a[i-1],a[i]]=[a[i],a[i-1]];}imgSet(box,a);}
 if(e.target.closest('a.img-linkcard'))return;if(e.target.closest('.img-edit img'))e.preventDefault();});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList?.contains('img-url')){e.preventDefault();addImageLinks(e.target.closest('.imgfield'));}});
document.addEventListener('input',e=>{if(!e.target.classList?.contains('img-cap'))return;const box=e.target.closest('.imgfield'),a=JSON.parse(box.dataset.images||'[]'),im=a[+e.target.dataset.i];if(im){im.caption=e.target.value.slice(0,200);box.dataset.images=JSON.stringify(a);}});

/* ---------- 閱讀檢視：排版後的內容 + 圖片相簿 ---------- */
let readerImgs=[],readerIdx=0,readerGallery=[];
function recordReaderTitle(m,r){const f=m.fields.find(x=>['title','name'].includes(x.key))||m.fields.find(x=>x.key==='subject');return (f&&r[f.key])||(r.date?r.date+' 的紀錄':'紀錄');}
function openRecordReader(id){const m=modules[page];if(!m)return;const r=data[m.key].find(x=>x.id===id);if(!r)return;
 let d=document.getElementById('recordReader');if(!d){d=document.createElement('dialog');d.id='recordReader';d.className='reader-dlg';document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d)d.close();});}
 const meta=m.fields.filter(f=>!['textarea','images','url'].includes(f.type)&&!['title','name'].includes(f.key)&&r[f.key]!==''&&r[f.key]!=null&&r[f.key]!==false).map(f=>'<span class="reader-chip"><small>'+mdEsc(f.label.replace(/（.*?）/g,''))+'</small>'+(f.type==='checkbox'?'✓':mdEsc(plainValue(f,r)))+'</span>').join('');
 const links=m.fields.filter(f=>f.type==='url'&&mdSafeUrl(r[f.key])).map(f=>'<a class="reader-link" href="'+mdEsc(mdSafeUrl(r[f.key]))+'" target="_blank" rel="noopener noreferrer">'+mdEsc(f.label)+' ↗</a>').join('');
 const texts=m.fields.filter(f=>f.type==='textarea'&&String(r[f.key]||'').trim()).map(f=>'<section class="reader-sec"><h3>'+mdEsc(f.label)+'</h3><div class="md-body">'+mdToHtml(r[f.key])+'</div></section>').join('');
 readerImgs=readerGallery=cleanImages(r.images);
 const gallery=readerImgs.length?'<section class="reader-sec"><h3>圖片 <small>'+readerImgs.length+' 張</small></h3><div class="reader-gallery">'+readerImgs.map((im,i)=>'<figure>'+(imgSrc(im,'view')?'<button type="button" class="reader-imgbtn" data-reader-img="'+i+'" aria-label="放大圖片">'+imgTag(im,'view')+'</button>':imgFallback(im))+(im.caption?'<figcaption>'+mdEsc(im.caption)+'</figcaption>':'')+'</figure>').join('')+'</div></section>':'';
 d.innerHTML='<div class="reader-head"><div><p class="reader-kicker">'+mdEsc(page)+'</p><h2>'+mdEsc(recordReaderTitle(m,r))+'</h2></div><button type="button" class="iconbtn" data-reader-close aria-label="關閉">×</button></div>'+
  (meta||links?'<div class="reader-meta">'+meta+links+'</div>':'')+'<div class="reader-content">'+(texts||(gallery?'':'<p class="help">這筆紀錄沒有文字內容。</p>'))+gallery+'</div>'+
  '<div class="dialogfoot"><span class="help">內容支援 AI 排版（Markdown）</span><div class="actions">'+(texts?'<button type="button" data-reader-copy="'+mdEsc(r.id)+'">複製文字</button>':'')+'<button type="button" data-reader-edit="'+mdEsc(r.id)+'">編輯</button><button type="button" class="primary" data-reader-close>關閉</button></div></div>';
 d.showModal();d.querySelector('.reader-content').scrollTop=0;}
function openLightbox(i){readerIdx=i;let lb=document.getElementById('imgLightbox');if(!lb){lb=document.createElement('dialog');lb.id='imgLightbox';lb.className='lightbox';document.body.appendChild(lb);lb.addEventListener('click',e=>{if(e.target===lb||e.target.closest('[data-lb-close]'))lb.close();const nav=e.target.closest('[data-lb]');if(nav)openLightbox((readerIdx+(+nav.dataset.lb)+readerImgs.length)%readerImgs.length);});
  lb.addEventListener('keydown',e=>{if(e.key==='ArrowRight')openLightbox((readerIdx+1)%readerImgs.length);if(e.key==='ArrowLeft')openLightbox((readerIdx-1+readerImgs.length)%readerImgs.length);});}
 const im=readerImgs[i];const many=readerImgs.length>1;
 lb.innerHTML='<button type="button" class="lb-close" data-lb-close aria-label="關閉">×</button>'+(many?'<button type="button" class="lb-nav prev" data-lb="-1" aria-label="上一張">‹</button><button type="button" class="lb-nav next" data-lb="1" aria-label="下一張">›</button>':'')+'<figure>'+imgTag(im,'full')+'<figcaption>'+(im.caption?mdEsc(im.caption)+'　':'')+(many?(i+1)+' / '+readerImgs.length+'　':'')+(mdSafeUrl(im.url)?'<a href="'+mdEsc(mdSafeUrl(im.url))+'" target="_blank" rel="noopener noreferrer">開啟原始連結 ↗</a>':'')+'</figcaption></figure>';
 if(!lb.open)lb.showModal();}
document.addEventListener('click',e=>{
 const rd=e.target.closest('[data-reader]');if(rd){e.preventDefault();openRecordReader(rd.dataset.reader);return;}
 const cl=e.target.closest('.listtable .cellclamp,.listtable .img-thumbs');if(cl&&!e.target.closest('a')&&!getSelection().toString()){const id=cl.closest('tr')?.querySelector('[data-reader]')?.dataset.reader;if(id){openRecordReader(id);return;}}
 if(e.target.closest('[data-reader-close]')){document.getElementById('recordReader')?.close();return;}
 const im=e.target.closest('[data-reader-img]');if(im){readerImgs=readerGallery;openLightbox(+im.dataset.readerImg);return;}
 const mi=e.target.closest('[data-md-img]');if(mi){e.preventDefault();const box=mi.closest('.md-body'),btns=box?[...box.querySelectorAll('[data-md-img]')]:[mi];
  try{readerImgs=btns.map(x=>JSON.parse(x.dataset.mdImg));openLightbox(Math.max(0,btns.indexOf(mi)));}catch{}return;}
 const ed=e.target.closest('[data-reader-edit]');if(ed){document.getElementById('recordReader')?.close();openEditor(ed.dataset.readerEdit);return;}
 const cp=e.target.closest('[data-reader-copy]');if(cp){const m=modules[page],r=data[m.key].find(x=>x.id===cp.dataset.readerCopy);if(!r)return;const txt=m.fields.filter(f=>f.type==='textarea'&&r[f.key]).map(f=>'## '+f.label+'\n\n'+r[f.key]).join('\n\n');navigator.clipboard.writeText(txt).then(()=>toast('已複製（含排版符號，可貼回 AI 或文件）'),()=>toast('無法複製，請手動選取。'));}
});
/* 程式碼區塊的「複製」按鈕 */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-md-copy]');if(!b)return;e.preventDefault();e.stopPropagation();
 const t=b.closest('.md-code')?.querySelector('code')?.textContent||'';const done=()=>{b.textContent='已複製 ✓';setTimeout(()=>b.textContent='複製',1500);};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,()=>{});else{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch{}ta.remove();}},true);
