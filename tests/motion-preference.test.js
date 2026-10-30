import test from 'node:test';
import assert from 'node:assert/strict';
import {motionReduced,toggleMotion} from '../src/motion-preference.js';

function environment({system=false,saved='full',search=''}={}){
 let stored=saved,replaced='';
 globalThis.location={search,href:'http://localhost/?lang=en&season=winter'+search.replace('?','&')};
 globalThis.matchMedia=()=>({matches:system});
 globalThis.localStorage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
 globalThis.history={replaceState:(_a,_b,url)=>{replaced=String(url);}};
 return {saved:()=>stored,replaced:()=>replaced};
}
test('system reduced motion always wins over a saved full-motion choice',()=>{
 environment({system:true,saved:'full'});assert.equal(motionReduced(),true);
});
test('quiet share link disables movement without changing stored preferences',()=>{
 const state=environment({search:'?motion=quiet'});assert.equal(motionReduced(),true);assert.equal(state.saved(),'full');
});
test('reduced-motion control resumes without losing language or season',()=>{
 const state=environment({saved:'quiet',search:'?motion=quiet'});toggleMotion();
 assert.equal(state.saved(),'full');const url=new URL(state.replaced());assert.equal(url.searchParams.has('motion'),false);assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.searchParams.get('season'),'winter');
});
test('blocked local storage still honours system motion settings',()=>{
 environment();globalThis.localStorage.getItem=()=>{throw Error('blocked');};assert.equal(motionReduced(),false);
});
