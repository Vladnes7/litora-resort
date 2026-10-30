/** A project Pages site lives under /repository; a custom domain may live at /. */
export function normalizeBasePath(value=''){
 const base=String(value).trim().replace(/\/+$/,'');
 if(!base||base==='/')return '';
 if(!/^\/(?:[a-zA-Z0-9._-]+\/?)+$/.test(base)||base.split('/').some(part=>part==='.'||part==='..'))throw new Error('Invalid site base path');
 return base;
}
export function localPath(pathname,base=''){
 base=normalizeBasePath(base);
 if(base&&(pathname===base||pathname.startsWith(base+'/')))pathname=pathname.slice(base.length)||'/';
 return pathname.replace(/\/+$/,'')||'/';
}
export function sitePath(pathname,base=''){
 base=normalizeBasePath(base);
 if(!base||pathname===base||pathname.startsWith(base+'/'))return pathname;
 return base+(pathname.startsWith('/')?pathname:'/'+pathname);
}
