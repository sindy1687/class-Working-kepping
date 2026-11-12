const fs=require('fs'),vm=require('vm'),assert=require('assert'),c={};vm.createContext(c);vm.runInContext(fs.readFileSync('js/material-stage.js','utf8'),c);
const before=Buffer.from(fs.readFileSync('教材匯入/檢定學段調整前.base64','utf8').trim(),'base64').toString('utf8'),rows=JSON.parse(before),counts={國小:0,國中:0};fs.writeFileSync('教材匯入/檢定學段調整前.json',before);
let changed=0;for(const row of rows){const stage=c.materialVocabStage(row);if(!stage)continue;if(row.stage!==stage)changed++;row.stage=stage;counts[stage]++;}
assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);fs.writeFileSync('教材匯入/教材庫-檢定學段.json',JSON.stringify(rows));console.log(JSON.stringify({total:rows.length,changed,classified:counts}));
