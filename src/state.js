import {rooms,restaurants,routes} from './content.js';

export function translate(pair, language='ru') {
  if (!Array.isArray(pair)) return pair ?? '';
  return pair[language === 'en' ? 1 : 0] ?? pair[0] ?? '';
}

export function getRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const entry = routes.find(route => route.path === path);
  if (!entry) return {type:'notfound',path};
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'rooms' && segments[1]) return {type:'room',path,item:rooms.find(room => room.id === segments[1]),...entry};
  if (segments[0] === 'dining' && segments[1]) return {type:'restaurant',path,item:restaurants.find(restaurant => restaurant.id === segments[1]),...entry};
  return {type:segments[0] || 'home',...entry};
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export function todayInSochi() {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function validateBooking(data,today=todayInSochi()) {
  const errors = {};
  if (!isDate(data.arrival) || data.arrival < today) errors.arrival='arrival';
  if (!isDate(data.departure) || !isDate(data.arrival) || data.departure <= data.arrival) errors.departure='departure';
  const adults=Number(data.adults), children=Number(data.children ?? 0);
  if (!Number.isInteger(adults) || adults<1 || adults>4) errors.adults='adults';
  if (!Number.isInteger(children) || children<0 || children>3) errors.children='children';
  if (typeof data.name !== 'string' || data.name.trim().length<2) errors.name='name';
  if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email='email';
  if (data.consent !== true) errors.consent='consent';
  if (data.room) {
    const selected=rooms.find(room=>room.id===data.room);
    if (!selected || adults+children>selected.guests) errors.room='room';
  }
  if (adults+children>Math.max(...rooms.map(room=>room.guests))) errors.room='room';
  return errors;
}

export function filterRooms({guests=1,view='all'}={}) {
  const count=Number(guests);
  if (!Number.isInteger(count)||count<1||count>4) return [];
  return rooms.filter(room=>room.guests>=count && (view==='all' || (view==='garden' ? ['garden-deluxe','family'].includes(room.id) : room.id!=='garden-deluxe')));
}

export function makeBookingDraft(data) {
  const draft={};
  for (const key of ['arrival','departure','adults','children','room','name','email','notes']) if(typeof data[key]==='string')draft[key]=data[key];
  draft.consent=data.consent===true;
  return draft;
}

export function buildStaySummary(data,offerId='') {
  const adults=Number(data.adults),children=Number(data.children||0);
  return {arrival:data.arrival,departure:data.departure,nights:Math.round((Date.parse(data.departure+'T00:00:00Z')-Date.parse(data.arrival+'T00:00:00Z'))/86400000),adults,children,guests:adults+children,roomId:data.room||'',offerId,name:String(data.name||'').trim(),notes:String(data.notes||'').trim()};
}
