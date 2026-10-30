import './vendor/scrollcraft.js';

import {motionReduced} from './motion-preference.js';
export const prefersQuiet=motionReduced;
const curve='cubic-bezier(.22,1,.36,1)';
const photoJobs=new WeakMap();
/** Keep the old photograph visible until the incoming frame has decoded. */
export async function dissolvePhoto(host,markup,onReady=()=>{}){
 if(!host)return false;
 const job={};photoJobs.set(host,job);
 const template=document.createElement('template');template.innerHTML=markup.trim();
 const candidate=template.content.firstElementChild;
 const incoming=candidate?document.importNode(candidate,true):null,img=incoming?.querySelector('img');
 if(!incoming||!img)return false;
 img.loading='eager';
 try{await img.decode();}catch{if(!img.complete||!img.naturalWidth)return false;}
 if(photoJobs.get(host)!==job||!host.isConnected)return false;
 const previous=host.querySelector('.photo');
 host.querySelectorAll('.photo-outgoing').forEach(el=>el.remove());
 if(!previous||prefersQuiet()){host.replaceChildren(incoming);onReady();return true;}
 const old=previous.cloneNode(true);old.classList.add('photo-outgoing');old.setAttribute('aria-hidden','true');old.removeAttribute('data-sc-in');
 host.replaceChildren(incoming,old);host.dataset.galleryState='transitioning';onReady();
 const fade=old.animate([{opacity:1},{opacity:0}],{duration:950,easing:curve,fill:'forwards'});
 const settle=img.animate([{transform:'scale(1.035)'},{transform:'scale(1)'}],{duration:1400,easing:curve});
 await fade.finished.catch(()=>{});old.remove();
 if(photoJobs.get(host)===job){host.dataset.galleryState='ready';}
 // No retained animation fill: the next image can always start from a clean frame.
 fade.cancel();settle.finished.then(()=>settle.cancel()).catch(()=>{});
 return true;
}

let menuJob=0,menuAnimation;
export async function openSoftMenu(dialog){
 const job=++menuJob;menuAnimation?.cancel();
 if(!dialog.open)dialog.showModal();
 document.body.classList.add('menu-is-open');dialog.classList.remove('is-closing');
 document.querySelector('[data-menu]')?.setAttribute('aria-expanded','true');
 if(prefersQuiet())return;
 menuAnimation=dialog.animate([{opacity:0,transform:'translateY(-22px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:550,easing:curve});
 dialog.querySelectorAll('.menu-group,.menu-season,.menu-small').forEach((el,i)=>el.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,delay:60+i*55,easing:curve,fill:'backwards'}));
 await menuAnimation.finished.catch(()=>{});if(job===menuJob)menuAnimation.cancel();
}
export async function closeSoftMenu(dialog){
 if(!dialog.open)return;const job=++menuJob;menuAnimation?.cancel();
 if(!prefersQuiet()){
  dialog.classList.add('is-closing');
  menuAnimation=dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-18px) scale(.99)'}],{duration:280,easing:curve,fill:'forwards'});
  await menuAnimation.finished.catch(()=>{});
 }
 if(job!==menuJob)return;
 dialog.close();menuAnimation?.cancel();dialog.classList.remove('is-closing');document.body.classList.remove('menu-is-open');
}

/** ScrollCraft owns scroll-driven transforms. Crossfades and the native dialog use WAAPI. */
export function setupFluid(root,{album,catalogue,room,language='ru',onPreferenceChange}={}){
 const disposers=[];let disposed=false;
 const section=selector=>root.querySelector(selector);
 // The hero has distinct photographic, typographic, atmospheric and near brand planes.
 const hero=section('.hero');
 if(hero){
  hero.setAttribute('data-sc-act','flow');
  hero.querySelector('.hero-image')?.setAttribute('data-sc-parallax','1.3');
  hero.querySelector('.hero-birds')?.setAttribute('data-sc-parallax','-.7');
  hero.querySelector('.hero-atmosphere')?.setAttribute('data-sc-parallax','.5');
 }
 const panorama=section('.panorama');
 if(panorama){panorama.setAttribute('data-sc-act','flow');panorama.querySelector('.photo')?.setAttribute('data-sc-parallax','.8');panorama.querySelector('.photo')?.removeAttribute('data-parallax');}
 // Four device families: layered opening, flow entrances, lateral water story, pointer light.
 root.querySelectorAll('.intro-photos,.wellness-photos,.celebration-section>.photo,.section-head,.index-grid .image-link,.thermal-item .photo,.bar-row .photo-open,.dish-grid .photo,.catalogue-shot,.album-view,.detail-gallery .photo').forEach(el=>el.setAttribute('data-sc-in',''));
 root.querySelectorAll('.intro-photos,.wellness-photos').forEach(el=>el.setAttribute('data-sc-stagger','90'));
 const pool=section('.pools-section'),rail=section('#pool-rail');
 if(pool&&rail&&innerWidth>900&&!prefersQuiet()){
  pool.classList.add('water-journey');pool.setAttribute('data-sc-act','pan');pool.setAttribute('data-sc-span','3.9');
  const stage=document.createElement('div');stage.className='water-stage';stage.setAttribute('data-sc-stage','');
  while(pool.firstChild)stage.append(pool.firstChild);pool.append(stage);
  rail.setAttribute('data-sc-pan','0');rail.removeAttribute('tabindex');rail.setAttribute('aria-label',language==='ru'?'Пять бассейнов: продолжайте прокрутку вниз':'Five pools: continue scrolling down');
  const status=stage.querySelector('[data-rail-status]');let frame=0;
  const sync=()=>{frame=0;const p=Math.max(0,Math.min(1,-pool.getBoundingClientRect().top/(pool.offsetHeight-innerHeight)));const n=Math.min(5,Math.floor(p*5)+1);if(status)status.textContent=String(n).padStart(2,'0')+' / 05';};
  const tick=()=>{if(!frame)frame=requestAnimationFrame(sync);};addEventListener('scroll',tick,{passive:true});disposers.push(()=>{removeEventListener('scroll',tick);cancelAnimationFrame(frame);});
  // A focused link must never remain outside the clipped stage.
  const focusCard=e=>{const card=e.target.closest('.rail-card');if(!card)return;const cards=[...rail.children],i=cards.indexOf(card),top=pool.getBoundingClientRect().top+scrollY;window.scrollTo({top:top+(pool.offsetHeight-innerHeight)*i/(cards.length-1),behavior:'instant'});};
  rail.addEventListener('focusin',focusCard);disposers.push(()=>rail.removeEventListener('focusin',focusCard));
 }
 const craft=prefersQuiet()?null:window.ScrollCraft.mount(root);disposers.push(()=>craft?.destroy());
 // No auto-advance while hidden, offscreen, interacting, modal, or reduced-motion.
 let last=performance.now();const clocks=new WeakMap();
 function galleryKind(el){return el.matches('.media-album')?'album':el.matches('.catalogue-media')?'catalogue':'room';}
 function resetClock(el,delay=0){const c=clocks.get(el)||{};c.elapsed=0;c.until=performance.now()+delay;clocks.set(el,c);el.style.setProperty('--gallery-progress',0);}
 function interacted(e){const el=e.target.closest('.media-album,.catalogue-media,#room-theatre');if(el)resetClock(el,9000);}
 function pauseToggle(e){const button=e.target.closest('[data-gallery-pause]');if(!button)return;const el=button.closest('.media-album,.catalogue-media,#room-theatre');if(!el)return;const paused=el.dataset.galleryPaused!=='true';el.dataset.galleryPaused=String(paused);button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?(language==='ru'?'Продолжить смену фотографий':'Resume slideshow'):(language==='ru'?'Приостановить смену фотографий':'Pause slideshow'));resetClock(el);}
 root.addEventListener('pointerdown',interacted);root.addEventListener('keydown',interacted);root.addEventListener('click',pauseToggle);
 const timer=setInterval(()=>{
  const now=performance.now(),delta=Math.min(2000,now-last);last=now;
  if(disposed||document.hidden||prefersQuiet()||document.querySelector('dialog[open]'))return;
  for(const el of root.querySelectorAll('.media-album,.catalogue-media,#room-theatre')){
   const viewport=el.querySelector('.album-view,.catalogue-shot,.room-photo');if(!viewport)continue;
   const rect=viewport.getBoundingClientRect(),visible=Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(rect.top,80));
   const c=clocks.get(el)||{elapsed:0,until:0};clocks.set(el,c);
   if(visible<Math.min(rect.height,innerHeight)*.48||el.dataset.galleryPaused==='true'||el.contains(document.activeElement)||el.matches(':hover')&&matchMedia('(hover:hover)').matches||now<c.until)continue;
   c.elapsed+=delta;el.style.setProperty('--gallery-progress',Math.min(1,c.elapsed/6500));
   if(c.elapsed<6500)continue;c.elapsed=0;
   const kind=galleryKind(el);if(kind==='album')album?.(el.id,{step:1});else if(kind==='catalogue')catalogue?.(el.closest('[data-room-row]').dataset.roomRow,{step:1});else room?.();
  }
 },200);
 disposers.push(()=>{clearInterval(timer);root.removeEventListener('pointerdown',interacted);root.removeEventListener('keydown',interacted);root.removeEventListener('click',pauseToggle);});
 // The final signature catches light on entry, and the highlight follows a fine pointer.
 const sign=document.querySelector('[data-footer-sign]');
 if(sign){
  const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){sign.classList.add('light-arrived');io.disconnect();}},{threshold:.35});io.observe(sign);disposers.push(()=>io.disconnect());
  const light=e=>{if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;const r=sign.getBoundingClientRect();sign.style.setProperty('--light-x',((e.clientX-r.left)/r.width*100).toFixed(2)+'%');};
  sign.addEventListener('pointermove',light);disposers.push(()=>sign.removeEventListener('pointermove',light));
 }
 // Runtime preference changes rebuild the scene into its static fallback.
 const viewport=matchMedia('(min-width:901px)');const resized=()=>onPreferenceChange?.();viewport.addEventListener('change',resized);disposers.push(()=>viewport.removeEventListener('change',resized));
 const media=matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>{if(!root.isConnected)return;onPreferenceChange?.();};media.addEventListener('change',changed);disposers.push(()=>media.removeEventListener('change',changed));
 return()=>{disposed=true;disposers.forEach(fn=>fn());};
}
