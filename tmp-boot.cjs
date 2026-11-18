const{JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const bodyHtml=html.slice(html.indexOf('<body'),html.lastIndexOf('</body>')+7);
const dom=new JSDOM(bodyHtml,{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener:()=>{},addListener:()=>{}}));
const srcs=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
const all=srcs.map(s=>fs.readFileSync(s,'utf8')).join('\n;\n');
try{w.eval(all);}catch(e){console.log('LOAD ERR:',e.message);console.log((e.stack||'').split('\n').slice(0,5).join('\n'));process.exit(1);}
try{w.eval('render()');}catch(e){console.log('RENDER ERR:',e.message);console.log((e.stack||'').split('\n').slice(0,6).join('\n'));process.exit(1);}
console.log('OK content len:',w.document.getElementById('content')?.innerHTML.length);
