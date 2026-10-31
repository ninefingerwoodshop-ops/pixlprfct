import {interactionClock,mountSvgInteraction,validInteraction} from './svg-animation-interactions.js';

// This entry point is bundled as a classic script so the opaque sandbox can load
// trusted code without module CORS access or permission to run inline scripts.
function receive(event){
 if(event.source!==parent||event.data?.type!=='pxl-svg-preview')return;
 const {svg,interaction}=event.data;
 if(typeof svg!=='string'||svg.length>10_000_000)return;
 if(interaction&&(!validInteraction(interaction)||!Number.isFinite(interaction.duration)||interaction.duration<=0||interaction.duration>60000||typeof interaction.loop!=='boolean'))return;
 const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(parsed.querySelector('parsererror')||parsed.documentElement.localName!=='svg')return;
 const root=document.importNode(parsed.documentElement,true);
 window.removeEventListener('message',receive);
 // The parent supplies its sanitized export. Never execute embedded code:
 // interaction uses the same trusted controller serialized into the download.
 root.querySelectorAll('script').forEach(node=>node.remove());
 document.body.replaceChildren(root);
 if(interaction)mountSvgInteraction(root,interaction,interactionClock);
}
window.addEventListener('message',receive);
parent.postMessage({type:'pxl-svg-preview-ready'},'*');
