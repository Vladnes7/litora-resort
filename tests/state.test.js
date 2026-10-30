import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBooking,getRoute,translate,filterRooms,makeBookingDraft,buildStaySummary} from '../src/state.js';
const valid={arrival:'2027-06-10',departure:'2027-06-15',adults:'2',children:'0',name:'Анна Петрова',email:'anna@example.com',consent:true,room:'panorama'};
test('valid future request is accepted',()=>assert.deepEqual(validateBooking(valid,'2026-10-29'),{}));
test('past, reverse and invalid calendar dates are rejected',()=>{
 assert.ok(validateBooking({...valid,arrival:'2026-01-01'},'2026-10-29').arrival);
 assert.ok(validateBooking({...valid,departure:'2027-06-01'},'2026-10-29').departure);
 assert.ok(validateBooking({...valid,arrival:'2027-02-30'},'2026-10-29').arrival);
});
test('guest count, email and consent are validated',()=>{
 for(const patch of [{adults:'0'},{adults:'2.5'},{children:'-1'},{email:'bad'},{consent:false},{name:' '}]) assert.ok(Object.keys(validateBooking({...valid,...patch},'2026-10-29')).length);
});
test('route parsing supports direct links and rejects unknown pages',()=>{
 assert.equal(getRoute('/rooms/panorama/').type,'room');
 assert.equal(getRoute('/dining/terra').type,'restaurant');
 assert.equal(getRoute('/no-such-page').type,'notfound');
 assert.equal(getRoute('/rooms/not-a-room').type,'notfound');
});
test('language selects the correct content with a readable fallback',()=>{
 assert.equal(translate(['Море','Sea'],'en'),'Sea');
 assert.equal(translate(['Море','Sea'],'ru'),'Море');
 assert.equal(translate(['Море'],'en'),'Море');
});
test('a chosen room cannot accept a party larger than its capacity',()=>{
 assert.equal(validateBooking({...valid,room:'garden-deluxe',adults:'2',children:'1'},'2026-10-29').room,'room');
 assert.deepEqual(validateBooking({...valid,room:'family',adults:'2',children:'2'},'2026-10-29'),{});
 assert.equal(validateBooking({...valid,room:'presidential',adults:'4',children:'1'},'2026-10-29').room,'room');
 assert.equal(validateBooking({...valid,room:'',adults:'4',children:'3'},'2026-10-29').room,'room');
});
test('room filtering respects party size and requested view',()=>{
 assert.deepEqual(filterRooms({guests:4}).map(r=>r.id),['family','presidential']);
 assert.deepEqual(filterRooms({guests:2,view:'garden'}).map(r=>r.id),['garden-deluxe','family']);
 assert.deepEqual(filterRooms({guests:5}),[]);
});
test('booking draft preserves entered values without retaining unknown fields',()=>{
 const draft=makeBookingDraft({...valid,notes:'Трансфер к вечеру',unknown:'ignored'});
 assert.equal(draft.arrival,valid.arrival);assert.equal(draft.name,valid.name);assert.equal(draft.consent,true);assert.equal(draft.notes,'Трансфер к вечеру');assert.equal('unknown' in draft,false);
});
test('stay summary retains the package, notes and full party composition',()=>{
 const s=buildStaySummary({...valid,children:'1',notes:'  Позднее прибытие  '},'sea-week');
 assert.equal(s.nights,5);assert.equal(s.guests,3);assert.equal(s.adults,2);assert.equal(s.children,1);assert.equal(s.offerId,'sea-week');assert.equal(s.notes,'Позднее прибытие');assert.equal(s.roomId,'panorama');
});
