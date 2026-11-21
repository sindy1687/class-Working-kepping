'use strict';
/* 遊戲連結：收集外部的數學、英文遊戲網站（上課暖身、投影或平板使用）。資料存在 data.gameLinks。 */
let gameLinkSubject='',gameLinkQuery='';
const GAME_LINK_SUBJECTS=['數學','英文','數英綜合'];
const GAME_LINK_ICON={數學:'🔢',英文:'🔤',數英綜合:'🎲'};
// 推薦網站：使用者按「加入推薦網站」時勾選加入，不會自動寫入資料
const GAME_LINK_SUGGEST=[
 {title:'Math Playground',subject:'數學',url:'https://www.mathplayground.com/',grade:'1–6 年級',note:'各年級數學小遊戲、邏輯題與應用題影片。'},
 {title:'Hit the Button（Topmarks）',subject:'數學',url:'https://www.topmarks.co.uk/maths-games/hit-the-button',grade:'2–6 年級',note:'九九乘法、加減、倍數的限時速算，適合投影全班搶答。'},
 {title:'Toy Theater 數學遊戲',subject:'數學',url:'https://toytheater.com/category/math-games/',grade:'1–4 年級',note:'數數、位值、加減法與錢幣的互動遊戲，免登入。'},
 {title:'PhET 互動模擬（中文）',subject:'數學',url:'https://phet.colorado.edu/zh_TW/',grade:'3–9 年級',note:'分數、面積、函數圖形等互動教具，可切換中文。'},
 {title:'Math Learning Center 數學教具',subject:'數學',url:'https://www.mathlearningcenter.org/apps',grade:'1–6 年級',note:'數線、分數、幾何板等線上教具，適合示範。'},
 {title:'均一教育平台',subject:'數學',url:'https://www.junyiacademy.org/',grade:'1–9 年級',note:'中文影片與練習題，可指派給學生。',login:true},
 {title:'LearnEnglish Kids 遊戲（British Council）',subject:'英文',url:'https://learnenglishkids.britishcouncil.org/games',grade:'1–6 年級',note:'單字、拼字、文法小遊戲，英國文化協會製作。'},
 {title:'Games to Learn English',subject:'英文',url:'https://www.gamestolearnenglish.com/',grade:'3–9 年級',note:'單字、句型、聽力遊戲，免登入，可直接投影。'},
 {title:'ESL Games Plus',subject:'英文',url:'https://www.eslgamesplus.com/',grade:'3–9 年級',note:'依主題分類的單字與文法遊戲，可分組比賽。'},
 {title:'ABCya',subject:'英文',url:'https://www.abcya.com/',grade:'1–6 年級',note:'字母、拼音、打字等遊戲（也有數學）。'},
 {title:'Wordwall',subject:'數英綜合',url:'https://wordwall.net/',grade:'不限',note:'自己做配對、轉盤、打地鼠等遊戲，也可搜尋別人做好的。',login:true},
 {title:'Quizlet',subject:'數英綜合',url:'https://quizlet.com/',grade:'不限',note:'單字卡、配對遊戲，可用 Quizlet Live 分組比賽。',login:true},
 {title:'Blooket',subject:'數英綜合',url:'https://www.blooket.com/',grade:'不限',note:'把題目變成全班遊戲，學生用平板加入。',login:true},
 {title:'Kahoot!',subject:'數英綜合',url:'https://kahoot.com/',grade:'不限',note:'全班即時搶答，學生用平板或手機作答。',login:true},
];
function gameLinkUrl(v){try{const u=new URL(String(v||'').trim());return ['https:','http:'].includes(u.protocol)?u:null;}catch{return null;}}
function gameLinkSubj(l){return GAME_LINK_SUBJECTS.includes(l?.subject)?l.subject:'數英綜合';}
function gameLinkRows(){const q=gameLinkQuery.trim().toLowerCase();return (data.gameLinks||[]).filter(l=>(!gameLinkSubject||gameLinkSubj(l)===gameLinkSubject)&&(!q||[l.title,l.subject,l.grade,l.note,l.url].join(' ').toLowerCase().includes(q)))
 .sort((a,b)=>GAME_LINK_SUBJECTS.indexOf(gameLinkSubj(a))-GAME_LINK_SUBJECTS.indexOf(gameLinkSubj(b))||String(a.title).localeCompare(String(b.title),'zh-Hant',{numeric:true}));}
function gameLinkCard(l){const u=gameLinkUrl(l.url),s=gameLinkSubj(l),ci=GAME_LINK_SUBJECTS.indexOf(s);
 const open=u?'<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">':'';
 return '<article class="ul-card ul-color-'+ci+'"><div class="ul-card-top"><span class="ul-icon" aria-hidden="true">'+GAME_LINK_ICON[s]+'</span><span class="ul-category">'+esc(s)+(l.grade?' · '+esc(l.grade):'')+'</span><details class="ul-menu"><summary aria-label="'+esc(l.title)+'操作">⋯</summary><div><button data-edit="'+esc(l.id)+'">編輯</button><button class="danger" data-delete="'+esc(l.id)+'">移除</button></div></details></div>'+
  '<h3>'+(u?open+esc(l.title)+'<span aria-hidden="true">↗</span></a>':esc(l.title))+'</h3><p class="ul-domain">'+esc(u?u.hostname:'網址格式不正確')+(l.login?' · <span class="gl-login">需登入</span>':'')+'</p><p class="ul-description" title="'+esc(l.note||'')+'">'+esc(String(l.note||'').trim())+'</p>'+
  '<div class="ul-card-foot">'+(u?open+'開始玩 <span aria-hidden="true">↗</span></a>':'<button data-edit="'+esc(l.id)+'">修正網址</button>')+'</div></article>';}
function gameLinksPage(){if(!Array.isArray(data.gameLinks))data.gameLinks=[];const all=data.gameLinks,rows=gameLinkRows();
 const tab=(v,label)=>'<button data-game-link-subject="'+esc(v)+'" aria-pressed="'+(gameLinkSubject===v)+'">'+label+'<span>'+(v?all.filter(l=>gameLinkSubj(l)===v).length:all.length)+'</span></button>';
 const section=s=>{const list=rows.filter(l=>gameLinkSubj(l)===s);return list.length?'<div class="ul-section-head"><h2>'+GAME_LINK_ICON[s]+' '+esc(s)+'<small>'+list.length+' 個網站</small></h2></div><div class="ul-grid">'+list.map(gameLinkCard).join('')+'</div>':'';};
 $('content').innerHTML='<div class="ul-workspace">'+head('遊戲連結','收集數學、英文遊戲網站：上課暖身、投影全班玩，或讓學生用平板練習。','<button data-game-links-action="suggest">＋ 加入推薦網站</button><button data-game-links-action="csv">↓ 匯出清單</button><button class="primary" data-action="add">＋ 新增遊戲網站</button>')+
  '<section class="ul-toolbar"><div class="ul-search"><span aria-hidden="true">⌕</span><input type="search" id="gameLinkQuery" value="'+esc(gameLinkQuery)+'" placeholder="搜尋網站、年級或說明" aria-label="搜尋遊戲網站"></div><div class="ul-categories" aria-label="科目">'+tab('','全部')+GAME_LINK_SUBJECTS.map(s=>tab(s,GAME_LINK_ICON[s]+' '+s)).join('')+'</div></section>'+
  (rows.length?GAME_LINK_SUBJECTS.map(section).join('')+'<p class="help">點網站名稱或「開始玩」會開新分頁。標示「需登入」的網站要先用老師帳號登入才能建立或指派遊戲。</p>'
   :'<section class="panel empty"><p>'+(!all.length?'還沒有遊戲網站。可以先從推薦清單挑幾個，或自己新增。':'沒有符合條件的網站。')+'</p><div class="actions" style="justify-content:center">'+(!all.length?'<button class="primary" data-game-links-action="suggest">＋ 從推薦清單加入</button><button data-action="add">＋ 自己新增</button>':'<button data-game-links-action="clear">清除篩選</button>')+'</div></section>')+'</div>';}
function gameLinkSuggestDialog(){if(!$('glSuggestDlg')){const d=document.createElement('dialog');d.id='glSuggestDlg';d.className='sfile-dlg';d.setAttribute('aria-labelledby','glSuggestTitle');document.body.append(d);}
 const have=new Set((data.gameLinks||[]).map(l=>gameLinkUrl(l.url)?.href).filter(Boolean));
 $('glSuggestDlg').innerHTML='<div class="sfile-head"><h2 id="glSuggestTitle">＋ 加入推薦遊戲網站</h2><button type="button" data-game-links-action="suggestClose" aria-label="關閉">✕</button></div><p class="help">勾選想加入的網站；加入後都可以再編輯或移除。已經在清單裡的會標示「已加入」。</p>'+
  GAME_LINK_SUBJECTS.map(s=>'<fieldset class="gl-suggest"><legend>'+GAME_LINK_ICON[s]+' '+esc(s)+'</legend>'+GAME_LINK_SUGGEST.map((x,i)=>x.subject!==s?'':'<label class="gl-suggest-row"><input type="checkbox" name="glPick" value="'+i+'" '+(have.has(new URL(x.url).href)?'disabled':'checked')+'><span><b>'+esc(x.title)+'</b>'+(have.has(new URL(x.url).href)?' <small class="st good">已加入</small>':'')+(x.login?' <small class="gl-login">需登入</small>':'')+'<small>'+esc(x.grade+' · '+x.note)+'</small></span></label>').join('')+'</fieldset>').join('')+
  '<div class="actions" style="margin-top:12px"><button type="button" class="primary" data-game-links-action="suggestAdd">加入勾選的網站</button><button type="button" data-game-links-action="suggestClose">取消</button></div>';
 $('glSuggestDlg').showModal();}
function gameLinkSuggestAdd(){const picks=[...document.querySelectorAll('#glSuggestDlg input[name=glPick]:checked:not(:disabled)')].map(x=>GAME_LINK_SUGGEST[+x.value]).filter(Boolean);
 if(!picks.length){toast('請先勾選要加入的網站。');return;}if(!Array.isArray(data.gameLinks))data.gameLinks=[];
 picks.forEach(x=>data.gameLinks.push({id:uid(),title:x.title,subject:x.subject,url:x.url,grade:x.grade,login:!!x.login,note:x.note}));
 $('glSuggestDlg').close();changed();render();toast('已加入 '+picks.length+' 個遊戲網站。');}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.gameLinkSubject!==undefined){gameLinkSubject=d.gameLinkSubject;render();return;}
 const a=d.gameLinksAction;if(!a)return;
 if(a==='clear'){gameLinkSubject='';gameLinkQuery='';render();}
 else if(a==='csv')csv('遊戲連結',['科目','網站名稱','適用年級','需登入','網址','說明'],gameLinkRows().map(l=>[gameLinkSubj(l),l.title,l.grade||'',l.login?'是':'',l.url,l.note||'']));
 else if(a==='suggest')gameLinkSuggestDialog();
 else if(a==='suggestAdd')gameLinkSuggestAdd();
 else if(a==='suggestClose')$('glSuggestDlg')?.close();});
document.addEventListener('input',e=>{if(e.target.id!=='gameLinkQuery')return;const t=e.target,pos=t.selectionStart;gameLinkQuery=t.value;if(e.isComposing)return;clearTimeout(window._glqTimer);window._glqTimer=setTimeout(()=>{render();const i=$('gameLinkQuery');if(i){i.focus();i.setSelectionRange(pos,pos);}},150);});
document.addEventListener('compositionend',e=>{if(e.target.id!=='gameLinkQuery')return;gameLinkQuery=e.target.value;render();});
