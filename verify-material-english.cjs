const fs=require('fs'),vm=require('vm'),assert=require('assert');const c={document:{addEventListener(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/material-english.js','utf8'),c);
const parse=(name,path='')=>c.englishMaterialParts({name,sourcePath:path});
assert.equal(parse('L1 題目卷','資料/04卷-初上').book,'初上');assert.equal(parse('L1 題目卷','資料/04卷-初上').paper,'4卷');
assert.equal(parse('初下L14練習').book,'初下');assert.equal(parse('初級下冊課本').book,'初下');
assert.equal(parse('第02卷','資料/中上').paper,'2卷');assert.equal(parse('I-1 文法','資料/01卷').book,'I級');
assert.equal(parse('L10').paper,'未標卷別');assert.equal(parse('1~4卷').paper,'未標卷別');
assert.equal(c.englishMaterialParts({bookLevel:'自訂冊別',paperNumber:'3'}).paper,'3卷');
console.log('PASS: explicit book/volume, nearest source folder, initial/lower books, no lesson/range confusion');
