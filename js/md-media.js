'use strict';
/* 教案內文圖片：貼上的圖片、AI 回答裡的圖表存進 data.meta.mdMedia，內文只寫 ![說明](media:代號)
   這樣圖片不會因 AI 網站的暫時連結過期而消失，也會跟著雲端同步。 */
const MD_DATA_IMG_RE=/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
function mdMediaStore(){if(typeof data==='undefined'||!data)return null;if(!data.meta||typeof data.meta!=='object')data.meta={};
 if(!data.meta.mdMedia||typeof data.meta.mdMedia!=='object'||Array.isArray(data.meta.mdMedia))data.meta.mdMedia={};return data.meta.mdMedia;}
function mdMediaGet(id){const s=typeof data!=='undefined'&&data&&data.meta&&data.meta.mdMedia;const v=s&&s[id];return v&&typeof v.src==='string'?v.src:'';}
function mdMediaPut(src){const st=mdMediaStore();if(!st||!MD_DATA_IMG_RE.test(src))return '';
 for(const [k,v] of Object.entries(st))if(v&&v.src===src)return k; // 同一張圖只存一次
 const id='m'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);st[id]={src,at:new Date().toISOString().slice(0,10)};
 if(src.length>300000&&!/^data:image\/svg/.test(src))mdShrink(src).then(s=>{if(s&&s.length<src.length&&st[id])st[id].src=s;}).catch(()=>{});
 return id;}
/* 壓縮：最長邊 1400px；圖表（PNG、色塊少）保留 PNG，相片轉 JPEG */
function mdShrink(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{try{const sc=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(img.width*sc));c.height=Math.max(1,Math.round(img.height*sc));const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  const png=c.toDataURL('image/png');if(png.length<350000)return res(png);let j=c.toDataURL('image/jpeg',.85);if(j.length>450000)j=c.toDataURL('image/jpeg',.68);res(j);}catch(e){rej(e);}};img.onerror=()=>rej(Error('圖片無法讀取'));img.src=src;});}
function mdFileToData(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=()=>rej(r.error);r.readAsDataURL(f);});}
async function mdBlobToMedia(blob){if(blob.size>15*1024*1024)throw Error('圖片太大');let src=await mdFileToData(blob);if(!MD_DATA_IMG_RE.test(src))throw Error('不是圖片');
 if(src.length>300000)src=await mdShrink(src);const st=mdMediaStore();if(!st)throw Error('資料尚未載入');
 const id='m'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);st[id]={src,at:new Date().toISOString().slice(0,10)};return id;}
/* SVG 圖表（AI 網頁上畫的圖表）→ 安全的圖片：移除程式、事件、外部連結；小圖示略過 */
function svgToMedia(svg){try{const vb=(svg.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number),w=parseFloat(svg.getAttribute('width'))||vb[2]||0,h=parseFloat(svg.getAttribute('height'))||vb[3]||0;
 if((w&&w<80)||(h&&h<60)||svg.querySelectorAll('*').length<8)return '';
 const c=svg.cloneNode(true);c.querySelectorAll('script,foreignObject,iframe,a').forEach(x=>{if(x.tagName.toLowerCase()==='a')x.replaceWith(...x.childNodes);else x.remove();});
 for(const el of [c,...c.querySelectorAll('*')])for(const at of [...el.attributes]){const n=at.name.toLowerCase(),v=at.value.trim();
  if(n.startsWith('on')||((n==='href'||n==='xlink:href')&&!v.startsWith('#')&&!MD_DATA_IMG_RE.test(v))||/javascript:|url\(\s*['"]?(?!#)/i.test(v))el.removeAttribute(at.name);}
 c.setAttribute('xmlns','http://www.w3.org/2000/svg');if(!c.getAttribute('width')&&w)c.setAttribute('width',w);if(!c.getAttribute('height')&&h)c.setAttribute('height',h);
 if(!c.getAttribute('style'))c.setAttribute('style','background:#fff;color:#0d0d0d;font-family:Segoe UI,Noto Sans TC,sans-serif');
 const s=new XMLSerializer().serializeToString(c);if(s.length>800000)return '';
 return mdMediaPut('data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s))));}catch{return '';}}
/* 貼上圖片檔 */
async function pasteImageFiles(ta,files){const pos=ta.selectionStart,end=ta.selectionEnd;let md='',bad=0;
 for(const f of files){try{const id=await mdBlobToMedia(f);md+='\n![圖片](media:'+id+')\n';}catch{bad++;}}
 if(md){ta.focus();ta.setRangeText(md,pos,end,'end');ta.dispatchEvent(new Event('input',{bubbles:true}));if(typeof refreshPreview==='function')refreshPreview(ta);}
 if(typeof toast==='function')toast(md?'已把圖片存進教案'+(bad?'（'+bad+' 張無法讀取）':'')+'，按「預覽排版」看看。':'圖片無法讀取，請換一張試試。');}
/* AI 網頁上的圖片連結通常幾小時後就失效 → 試著下載存進教案；下載不到就提醒改用「複製圖片」 */
const MD_TEMP_HOSTS=/(oaiusercontent\.com|openai\.com|chatgpt\.com|claude\.ai|anthropic\.com|gemini\.google\.com|googleusercontent\.com|bing\.com|copilot\.microsoft\.com|perplexity\.ai)$/i;
async function localizeRemoteImages(ta,md){const urls=[...new Set([...md.matchAll(/!\[[^\]]*\]\((https?:[^\s)]+)\)/g)].map(m=>m[1]))];let failTemp=0,ok=0;
 for(const u of urls){let host='';try{host=new URL(u).hostname;}catch{continue;}
  try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);const r=await fetch(u,{signal:ctl.signal,referrerPolicy:'no-referrer'});clearTimeout(t);if(!r.ok)throw Error('HTTP '+r.status);
   const b=await r.blob();if(!/^image\//.test(b.type))throw Error('不是圖片');const id=await mdBlobToMedia(b);
   if(ta.value.includes('('+u+')')){ta.value=ta.value.split('('+u+')').join('(media:'+id+')');ta.dispatchEvent(new Event('input',{bubbles:true}));if(typeof refreshPreview==='function')refreshPreview(ta);}ok++;}
  catch{if(MD_TEMP_HOSTS.test(host))failTemp++;}}
 if(failTemp&&typeof toast==='function')toast('有 '+failTemp+' 張 AI 圖片是暫時連結，之後可能看不到。請回 AI 網頁在圖片上按右鍵 →「複製圖片」，再貼到這裡。');
 else if(ok&&typeof toast==='function')toast('已把 '+ok+' 張圖片存進教案。');}
