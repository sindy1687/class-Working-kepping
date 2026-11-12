const fs=require('fs'),vm=require('vm'),assert=require('assert');let calls=0,retries=0;
const ctx={document:{addEventListener(){}},AbortController,setTimeout,clearTimeout,fetch:async()=>{calls++;if(calls===1){const e=new Error('timeout');e.name='AbortError';throw e;}return {ok:true,json:async()=>({ok:true,title:'教材檔名'})};}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/material-link.js','utf8'),ctx);
(async()=>{
 assert.equal(await ctx.fetchMaterialTitle('https://example.com/exec',()=>retries++),'教材檔名');assert.equal(calls,2);assert.equal(retries,1);
 assert.equal(await ctx.fetchMaterialTitle('https://example.com/exec'),'教材檔名');assert.equal(calls,2);
 ctx.fetch=async()=>({ok:true,json:async()=>({ok:true,files:{}})});
 await assert.rejects(()=>ctx.fetchMaterialTitle('https://example.com/old'),/新版本/);
 console.log('PASS: retry once after timeout, cache successful title, detect old GAS response');
})().catch(e=>{console.error(e);process.exitCode=1;});
