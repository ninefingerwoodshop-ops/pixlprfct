// UI nodes keep their identity when adopted into a panel window. Lookups use
// the live nodes, never the cosmetic ancestor wrappers in those windows.
const panels=new Set();
export function registerEditorPanel(entry){panels.add(entry);}
export function panelHome(node){return [...panels].find(e=>e.node===node)?.placeholder??node;}
export function panelRoots(root){return [root,...[...panels].filter(e=>e.node?.isConnected&&e.placeholder&&root?.contains(e.placeholder)).map(e=>e.node)].filter(Boolean);}
export function queryPanel(root,selector){return [...new Set(panelRoots(root).flatMap(n=>[...(n.matches?.(selector)?[n]:[]),...n.querySelectorAll(selector)]))];}
export const editorDOM={
 getElementById(id){const main=document.getElementById(id);if(main)return main;for(const e of panels)if(e.ready&&!e.window?.closed){const node=e.window.document.getElementById(id);if(node&&!node.hasAttribute('data-panel-context'))return node;}return null;},
 querySelectorAll(selector){return [...new Set([document,...[...panels].filter(e=>e.ready&&!e.window?.closed).map(e=>e.window.document)].flatMap(doc=>[...doc.querySelectorAll(selector)].filter(n=>!n.hasAttribute('data-panel-context'))))];},
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;},
 get activeElement(){return this.focusedDocument().activeElement;},
 focusedDocument(){for(const e of panels)if(e.ready&&!e.window?.closed&&e.window.document.hasFocus())return e.window.document;return document;},
};
