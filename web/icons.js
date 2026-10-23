const paths = {
  select:'m5 3 13 8-6 1-3 6Z', hand:'M8 10V5a1.5 1.5 0 0 1 3 0v4-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v5c0 5-3 7-6 7h-1c-2 0-3-1-4-3L5 12a1.5 1.5 0 0 1 2-2l1 1',
  frame:'M7 3v18M17 3v18M3 7h18M3 17h18',rectangle:'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',ellipse:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18',text:'M5 5V3h14v2M12 3v18M8 21h8',
  undo:'M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12',redo:'m16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12',file:'M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6M9 16h6',search:'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14m5 12 6 6',tools:'M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z',help:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01',
  'align-left':'M4 3v18M8 7h12v3H8Zm0 7h8v3H8Z','align-center':'M12 3v18M4 7h16v3H4Zm4 7h8v3H8Z','align-right':'M20 3v18M4 7h12v3H4Zm4 7h8v3H8Z','align-top':'M3 4h18M7 8h3v12H7Zm7 0h3v8h-3Z','align-middle':'M3 12h18M7 4h3v16H7Zm7 4h3v8h-3Z','align-bottom':'M3 20h18M7 4h3v12H7Zm7 4h3v8h-3Z',
};
export function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.rectangle}"/></svg>`; }
export function installIcons() { document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); document.querySelectorAll('[data-tool]').forEach(el => el.innerHTML = icon(el.dataset.tool)); for (const id of ['undo','redo']) document.getElementById(id).innerHTML = icon(id); }
