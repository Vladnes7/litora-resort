import {motionReduced} from './motion-preference.js';
const reduce=motionReduced;
const easeOut='cubic-bezier(.23,1,.32,1)',easeInOut='cubic-bezier(.77,0,.175,1)';
let transitionId=0,curtainAnimation;
export function cancelTransition(){transitionId++;curtainAnimation?.cancel();document.querySelector('#curtain').style.transform='translateY(100%)';}

export async function transitionPage(commit){
 const id=++transitionId,curtain=document.querySelector('#curtain');
 const current=getComputedStyle(curtain).transform;
 curtainAnimation?.cancel();
 if(reduce()){commit();curtain.style.transform='translateY(100%)';return;}
 curtain.style.transform=current;
 curtainAnimation=curtain.animate([{transform:current},{transform:'translateY(0)'}],{duration:300,easing:easeOut,fill:'forwards'});
 await curtainAnimation.finished.catch(()=>{});if(id!==transitionId)return;
 commit();curtain.style.transform='translateY(0)';curtainAnimation.cancel();
 const hero=document.querySelector('.hero-image img,.page-hero>.photo img');
 if(hero)hero.animate([{transform:'scale(1.07)'},{transform:'scale(1)'}],{duration:1200,easing:easeOut});
 curtainAnimation=curtain.animate([{transform:'translateY(0)'},{transform:'translateY(-100%)'}],{duration:750,easing:easeInOut,fill:'forwards'});
 await curtainAnimation.finished.catch(()=>{});if(id!==transitionId)return;
 curtain.style.transform='translateY(100%)';curtainAnimation.cancel();
}

export async function runIntro(){
 const intro=document.querySelector('#intro');let visited=false;
 try{visited=sessionStorage.getItem('litora-visited')==='1';sessionStorage.setItem('litora-visited','1');}catch{}
 if(reduce()){intro.classList.add('done');return;}
 const hero=document.querySelector('.hero-image img,.page-hero>.photo img');
 if(hero){await Promise.race([hero.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1800))]);}
 const mark=intro.querySelector('.intro-mark');
 await mark.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:visited?180:650,easing:easeOut,fill:'forwards'}).finished.catch(()=>{});
 if(hero)hero.animate([{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:1400,easing:easeOut});
 await intro.animate([{clipPath:'inset(0 0 0 0 round 0 0 0 0)'},{clipPath:'inset(0 42% 0 42% round 0 0 50% 50%)',offset:.5},{clipPath:'inset(0 50% 100% 50% round 0 0 50% 50%)'}],{duration:visited?450:1100,easing:easeInOut,fill:'forwards'}).finished.catch(()=>{});
 intro.classList.add('done');
}

function splitWords(el){
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){if(!node.textContent.trim())continue;const fragment=document.createDocumentFragment();node.textContent.split(/(\s+)/).forEach(word=>{if(!word.trim()){fragment.append(document.createTextNode(word));return;}const outer=document.createElement('span');outer.className='word-mask';const inner=document.createElement('span');inner.textContent=word;outer.append(inner);fragment.append(outer);});node.replaceWith(fragment);}
 return [...el.querySelectorAll('.word-mask>span')];
}

export function setupMotion(root){
 const reduced=reduce(),animations=[],parallaxes=new Set();let frame=0,disposed=false;
 document.body.classList.add('motion-ready');
 const titles=[...root.querySelectorAll('h2.reveal,h1[data-title]')];
 const words=new Map(titles.map(el=>[el,splitWords(el)]));
 const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const el=entry.target;el.classList.remove('pending');if(!reduced){words.get(el)?.forEach((word,i)=>animations.push(word.animate([{transform:'translateY(110%) rotate(3deg)',opacity:0},{transform:'translateY(0) rotate(0)',opacity:1}],{duration:850,delay:Math.min(i*.055,350),easing:easeOut})));}revealObserver.unobserve(el);}},{threshold:.12,rootMargin:'0px 0px -3% 0px'});
 for(const el of titles){if(el.getBoundingClientRect().top>innerHeight&&!reduced)el.classList.add('pending');revealObserver.observe(el);}
 const parallaxObserver=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting)parallaxes.add(e.target);else parallaxes.delete(e.target);}update();},{rootMargin:'150px'});
 if(!reduced&&innerWidth>760)root.querySelectorAll('.page-hero>[data-parallax]').forEach(el=>parallaxObserver.observe(el));
 function tick(){frame=0;if(disposed)return;document.body.classList.toggle('header-scrolled',scrollY>100);if(!reduced)for(const el of parallaxes){const rect=el.getBoundingClientRect(),progress=(rect.top+rect.height/2-innerHeight/2)/innerHeight,img=el.querySelector('img');if(img)img.style.transform=`translateY(${Math.max(-4,Math.min(4,progress*5))}%)`;}}
 function update(){if(!frame)frame=requestAnimationFrame(tick);}
 addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
 const footer=document.querySelector('[data-footer-sign]');
 function pointer(event){if(reduced||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;const rect=footer.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;footer.querySelector('.footer-birds').style.transform=`translate(${x*24}px,${y*18}px)`;}
 function reset(){footer.querySelectorAll('.signature span').forEach(el=>el.style.transform='');footer.querySelector('.footer-birds').style.transform='';}
 footer?.addEventListener('pointermove',pointer);footer?.addEventListener('pointerleave',reset);
 return()=>{disposed=true;cancelAnimationFrame(frame);revealObserver.disconnect();parallaxObserver.disconnect();animations.forEach(a=>a.cancel());removeEventListener('scroll',update);removeEventListener('resize',update);footer?.removeEventListener('pointermove',pointer);footer?.removeEventListener('pointerleave',reset);};
}

export function setupFilm(root,{language='ru'}={}){
 const video=root.querySelector('[data-season-film]');if(!video)return()=>{};
 const button=root.querySelector('[data-film-toggle]');let visible=false,manualPause=false,disposed=false,repeatAnimation;
 const label=playing=>{button.textContent=playing?(language==='ru'?'ПАУЗА':'PAUSE'):(language==='ru'?'ВОСПРОИЗВЕСТИ':'PLAY FILM');button.setAttribute('aria-pressed',String(playing));};
 async function play(){if(disposed||document.hidden)return;try{await video.play();label(!video.paused);}catch{label(false);}}
 function pause(){video.pause();label(false);}
 function toggle(){if(video.paused){manualPause=false;play();}else{manualPause=true;pause();}}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!manualPause&&!reduce())play();else pause();},{threshold:.35});observer.observe(video);
 function visibility(){if(document.hidden)pause();else if(visible&&!manualPause&&!reduce())play();}
 async function ended(){if(!visible||manualPause||reduce())return;repeatAnimation=video.animate([{opacity:1},{opacity:.25}],{duration:220,fill:'forwards'});await repeatAnimation.finished.catch(()=>{});if(disposed||!visible||manualPause||reduce()||document.hidden){repeatAnimation.cancel();return;}video.currentTime=0;await play();repeatAnimation.cancel();video.animate([{opacity:.25},{opacity:1}],{duration:300});}
 button.addEventListener('click',toggle);video.addEventListener('ended',ended);document.addEventListener('visibilitychange',visibility);label(false);
 return()=>{disposed=true;observer.disconnect();video.pause();repeatAnimation?.cancel();button.removeEventListener('click',toggle);video.removeEventListener('ended',ended);document.removeEventListener('visibilitychange',visibility);};
}


export function setupRails(root){
 const cleaners=[];
 for(const rail of root.querySelectorAll('.scroll-rail')){
  const status=root.querySelector(`[data-rail-status="${rail.id}"]`),buttons=[...root.querySelectorAll(`[data-rail="${rail.id}"]`)];let frame=0;
  function update(){frame=0;const cards=[...rail.querySelectorAll('.rail-card')];if(!cards.length)return;const gap=parseFloat(getComputedStyle(rail).columnGap)||0,width=cards[0].getBoundingClientRect().width+gap,index=Math.max(0,Math.min(cards.length-1,Math.round(rail.scrollLeft/width)));const text=String(index+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');if(status&&status.textContent!==text)status.textContent=text;for(const button of buttons)button.disabled=Number(button.dataset.direction)<0?rail.scrollLeft<=1:rail.scrollLeft>=rail.scrollWidth-rail.clientWidth-2;}
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  rail.addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);update();cleaners.push(()=>{cancelAnimationFrame(frame);rail.removeEventListener('scroll',schedule);removeEventListener('resize',schedule);});
 }
 return()=>cleaners.forEach(fn=>fn());
}
