const fs=require('fs'),assert=require('assert'),html=fs.readFileSync('教材匯入/博幼每週大事原頁.html','utf8'),source='https://www.boyo.org.tw/boyoV2/online_tm/boyo_read_tm/weekly-news';
const strip=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim(),items=[];
for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
 const title=strip(row.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1]||''),issue=title.match(/每週國內外大事\s*(\d{3,4})\s*年\s*(\d+)\s*期/),range=title.match(/(\d{3})(\d{2})(\d{2})\s*[-~～]\s*(\d{7})/);
 if(!issue&&!range)continue;
 const year=issue?(Number(issue[1])<1911?Number(issue[1])+1911:Number(issue[1])):Number(range[1])+1911;
 for(const a of row.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const label=strip(a[2]),edition=/學生/.test(label)?'學生版':/教師/.test(label)?'教師版':'';if(!edition)continue;
  const url=new URL(a[1].replace(/&amp;/g,'&'),source);if(url.hostname!=='www.boyo.org.tw'||!url.searchParams.has('download'))continue;
  items.push({title,year,issue:issue?Number(issue[2]):0,period:range?range[0]:'',edition,url:url.href,downloadId:url.searchParams.get('download')});
 }
}
const unique=[...new Map(items.map(x=>[x.url,x])).values()].sort((a,b)=>b.year-a.year||b.issue-a.issue||b.period.localeCompare(a.period)||a.edition.localeCompare(b.edition));assert(unique.length>100);assert(unique.every(x=>x.year>2000&&(x.issue>0||x.period)));fs.writeFileSync('教材匯入/每週大事連結.json',JSON.stringify(unique));console.log(JSON.stringify({issues:new Set(unique.map(x=>x.title)).size,files:unique.length,newest:unique[0],years:[...new Set(unique.map(x=>x.year))]}));
