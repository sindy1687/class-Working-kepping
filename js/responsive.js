'use strict';
// 抽屜選單支援平板、觸控、鍵盤與尺寸切換。
const layoutViewport=window.matchMedia('(max-width: 1100px)');
function synchronizeNavigation(){const sidebar=$('sidebar'),menu=$('menu'),backdrop=$('navBackdrop'),mobile=layoutViewport.matches,open=mobile&&sidebar.classList.contains('open');sidebar.inert=mobile&&!open;sidebar.setAttribute('aria-hidden',String(mobile&&!open));menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-controls','sidebar');if(backdrop)backdrop.hidden=!open;document.documentElement.classList.toggle('nav-open',open);}
function closeResponsiveNavigation(){const wasOpen=$('sidebar').classList.contains('open');$('sidebar').classList.remove('open');synchronizeNavigation();if(wasOpen&&layoutViewport.matches)$('menu').focus();}
document.addEventListener('click',e=>{if(e.target.id==='navBackdrop')closeResponsiveNavigation();});
document.addEventListener('keydown',e=>{if(!layoutViewport.matches||!$('sidebar').classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();closeResponsiveNavigation();return;}if(e.key==='Tab'){const controls=[...$('sidebar').querySelectorAll('button,a,input,select,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||!$('sidebar').contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!$('sidebar').contains(document.activeElement))){e.preventDefault();first.focus();}}});
new MutationObserver(synchronizeNavigation).observe($('sidebar'),{attributes:true,attributeFilter:['class']});
layoutViewport.addEventListener('change',()=>{if(!layoutViewport.matches)$('sidebar').classList.remove('open');synchronizeNavigation();});
synchronizeNavigation();
