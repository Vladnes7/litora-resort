import {test,expect} from '@playwright/test';
import {routes} from '../../src/content.js';
const runtimeErrors=new WeakMap();
async function open(page,path='',params='lang=ru&season=summer'){
 await page.goto(path+'?'+params);
 await expect(page.locator('#intro')).toHaveClass(/done/);
 await expect(page.locator('main h1')).toBeVisible();
}
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
test.beforeEach(async({page})=>{
 const errors=[];runtimeErrors.set(page,errors);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===new URL(page.url()).origin)errors.push(`${r.status()} ${new URL(r.url()).pathname}`);});
});
test.afterEach(async({page})=>{expect(runtimeErrors.get(page)).toEqual([]);});

test('all 52 direct routes and their deployed resources resolve',async({page,request})=>{
 for(const route of routes){
  const response=await request.get(route.path.replace(/^\//,'')+'?lang=ru&season=summer');expect(response.ok(),route.path).toBe(true);expect(await response.text()).toContain('<title>'+route.title+' — LITORA</title>');
 }
 await open(page,'rooms/sea-deluxe/');
 await expect(page).toHaveTitle(/Sea Deluxe/);
 const image=page.locator('.page-hero img');await expect(image).toBeVisible();
 await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 await noOverflow(page);
});

test('menu opens, closes with Escape and follows a prefixed internal link',async({page})=>{
 await open(page);await page.locator('[data-menu]').click();
 await expect(page.locator('#menu')).toBeVisible();await expect(page.locator('[data-menu]')).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');await expect(page.locator('#menu')).not.toBeVisible();
 await page.locator('[data-menu]').click();await page.locator('#menu a').filter({hasText:'Номера и люксы'}).click();
 await expect(page).toHaveURL(/\/rooms\?lang=ru&season=summer/);await expect(page.locator('[data-room-row]')).toHaveCount(6);
 await page.reload();await expect(page.locator('[data-room-row]')).toHaveCount(6);await noOverflow(page);
});

test('room filters, rapid frame selection and the lightbox stay in sync',async({page})=>{
 await open(page,'rooms');
 await page.locator('[data-room-filter="guests"]').selectOption('4');await expect(page.locator('[data-room-row]')).toHaveCount(2);
 await expect(page.locator('[data-room-row] h2')).toHaveText(['Family Suite','Presidential Suite']);
 await page.locator('[data-room-filter="guests"]').selectOption('1');
 const room=page.locator('[data-room-row="garden-deluxe"]');
 await room.locator('[data-frame="3"]').click();await room.locator('[data-frame="8"]').click();await room.locator('[data-frame="2"]').click();
 await expect(room.locator('.photo-index')).toHaveText('03 / 12');
 await expect(room.locator('.photo-open')).toHaveAttribute('data-photo-open','room-garden-deluxe-03');
 await room.locator('.photo-open').click();await expect(page.locator('#lightbox')).toBeVisible();
 await expect.poll(()=>page.locator('#lightbox img').first().evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.keyboard.press('ArrowRight');await expect(page.locator('#lightbox .photo:not(.photo-outgoing)')).toHaveAttribute('data-photo-request','room-garden-deluxe-04');
 await page.keyboard.press('Escape');await expect(page.locator('#lightbox')).not.toBeVisible();
 await noOverflow(page);
});

test('restaurant album dissolves between images and keeps full rounded frames',async({page})=>{
 await open(page,'dining/sora','lang=ru&season=winter');
 const album=page.locator('.media-album').first();await album.locator('[data-gallery-pause]').click();
 await album.locator('[data-frame="1"]').click();await expect(album.locator('.photo-index')).toHaveText('02 / 07');
 await expect(album.locator('.photo-open')).toHaveAttribute('data-gallery-state','ready');
 await expect(album.locator('.photo')).toHaveCount(1);
 expect(await album.locator('.album-view').evaluate(e=>parseFloat(getComputedStyle(e).borderRadius))).toBeGreaterThan(15);
 expect(await album.locator('img').evaluate(e=>getComputedStyle(e).objectFit)).toBe('contain');
 await album.locator('[data-album-view]').press('ArrowRight');await expect(album.locator('.photo-index')).toHaveText('03 / 07');
 await expect(album.locator('[data-gallery-pause]')).toHaveAttribute('aria-pressed','true');await noOverflow(page);
});

test('language, season and map selection remain usable',async({page})=>{
 await open(page);await page.locator('[data-language]').click();await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.locator('.hero [data-season="winter"]').click();await expect(page).toHaveURL(/season=winter/);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.hero [data-season="winter"]')).toHaveAttribute('aria-pressed','true');
 await open(page,'resort/territory');const pin=page.locator('.map-pin[data-place="r1"]');if(await pin.isVisible())await pin.click();else await page.locator('.map-list [data-place="r1"]').click();
 await expect(page.locator('.map-pin[data-place="r1"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#map-info h3')).toHaveText('Берег');
 await noOverflow(page);
});

test('booking validates dates and creates only a local stay summary',async({page})=>{
 await open(page,'reservation');const form=page.locator('#booking');
 await form.locator('[type="submit"]').click();await expect(form.locator('[name="arrival"]')).toHaveAttribute('aria-invalid','true');
 const start=new Date(Date.now()+10*86400000).toISOString().slice(0,10),end=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
 await form.locator('[name="arrival"]').fill(start);await form.locator('[name="departure"]').fill(end);
 await form.locator('[name="name"]').fill('Demo Guest');await form.locator('[name="email"]').fill('demo@example.com');
 await form.locator('[name="consent"]').check();await form.locator('[type="submit"]').click();
 await expect(page.locator('#booking-result')).toContainText('Ваш план поездки');await expect(page.locator('#booking-result')).toContainText('данные не отправлены');await noOverflow(page);
});

test('system reduced motion disables pinned travel and autoplay without hiding content',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await open(page);
 await expect(page.locator('html')).toHaveAttribute('data-motion','quiet');await expect(page.locator('.water-stage')).toHaveCount(0);
 await page.locator('#pool-rail').scrollIntoViewIfNeeded();await expect(page.locator('#pool-rail .rail-card')).toHaveCount(5);
 expect(await page.locator('[data-sc-in]').evaluateAll(elements=>elements.every(e=>getComputedStyle(e).opacity==='1'))).toBe(true);
 await noOverflow(page);
});
