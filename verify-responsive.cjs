const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function classes(){const values=new Set();return {contains:v=>values.has(v),add:v=>values.add(v),remove:v=>values.delete(v),toggle(v,force){if(force)values.add(v);else values.delete(v);}};}
const elements={sidebar:{classList:classes(),attributes:{},setAttribute(k,v){this.attributes[k]=v;},querySelectorAll:()=>[],contains:()=>false},menu:{attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus(){this.focused=true;}},navBackdrop:{hidden:true}};
const media={matches:true,addEventListener(n,cb){this.onChange=cb;}};
const ctx=vm.createContext({window:{matchMedia:()=>media},document:{documentElement:{classList:classes()},addEventListener(){}},$:id=>elements[id],MutationObserver:class{observe(){}}});
vm.runInContext(fs.readFileSync('js/responsive.js','utf8'),ctx);
assert.equal(elements.sidebar.inert,true);assert.equal(elements.navBackdrop.hidden,true);
elements.sidebar.classList.add('open');ctx.synchronizeNavigation();assert.equal(elements.sidebar.inert,false);assert.equal(elements.navBackdrop.hidden,false);assert.equal(elements.menu.attributes['aria-expanded'],'true');
ctx.closeResponsiveNavigation();assert.equal(elements.sidebar.inert,true);assert.equal(elements.menu.focused,true);
elements.sidebar.classList.add('open');media.matches=false;media.onChange();assert.equal(elements.sidebar.inert,false);assert.equal(elements.sidebar.classList.contains('open'),false);assert.equal(elements.navBackdrop.hidden,true);
media.matches=true;media.onChange();assert.equal(elements.sidebar.inert,true);
console.log('PASS: touch drawer states, backdrop, keyboard focus return, desktop/tablet switching and hidden-navigation focus protection');
