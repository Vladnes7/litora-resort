export function motionReduced(){
 const requested=new URLSearchParams(location.search).get('motion')==='quiet';
 let saved=false;try{saved=localStorage.getItem('litora-motion')==='quiet';}catch{}
 return requested||saved||matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function toggleMotion(){
 const next=motionReduced()?'full':'quiet';try{localStorage.setItem('litora-motion',next);}catch{}
 const url=new URL(location.href);url.searchParams.delete('motion');history.replaceState({},'',url);
}
