const path = require('node:path');
const {createHash} = require('node:crypto');
const APP_URL = 'pixlprfct://app/';
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' ws://127.0.0.1:* https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
function contentSecurityPolicy(value) {
 // Only this dedicated, opaque preview document can be embedded by the editor.
 if(isLocalURL(value)&&new URL(value).pathname==='/editor/svg-animation-preview.html')return "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; frame-ancestors 'self'; form-action 'none'; sandbox allow-scripts";
 return CSP;
}
function isLocalURL(value) {
 try { const url = new URL(value); return url.protocol === 'pixlprfct:' && url.host === 'app' && !url.username && !url.password; } catch { return false; }
}
function serverURL(value) {
 if(typeof value !== 'string' || value.length > 2048) throw new Error('Enter your workspace server address.');
 let url; try { url = new URL(value.trim()); } catch { throw new Error('Enter a full HTTPS address, such as https://design.example.com.'); }
 const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('Use HTTPS. HTTP is supported only for a server on this computer.');
 if(url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use the server’s base address, without a path, password, or query.');
 return url.origin;
}
function assetPath(root, requestURL) {
 if(!isLocalURL(requestURL)) return null;
 let pathname; try { pathname = decodeURIComponent(new URL(requestURL).pathname); } catch { return null; }
 if(pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part=>part==='..'||part==='.'||part.startsWith('.'))) return null;
 const relative = pathname === '/' ? 'web/project-home.html' : pathname.startsWith('/editor/') ? 'web/'+pathname.slice(8) : pathname.startsWith('/desktop/') ? pathname.slice(1) : null;
 if(!relative) return null;
 const target = path.resolve(root, relative);
 return target.startsWith(path.resolve(root)+path.sep) ? target : null;
}
function externalURL(value) {
 try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;} catch {return null;}
}
function sameWorkspace(url, base) {
 if(isLocalURL(base)) return isLocalURL(url);
 try{return !new URL(url).username&&!new URL(url).password&&new URL(url).origin===serverURL(new URL(base).origin);}catch{return false;}
}
function partitionFor(base) {return isLocalURL(base)?'persist:pixlprfct-local':'persist:workspace-'+createHash('sha256').update(serverURL(new URL(base).origin)).digest('hex').slice(0,24);}
module.exports={APP_URL,CSP,contentSecurityPolicy,isLocalURL,serverURL,assetPath,externalURL,sameWorkspace,partitionFor};
