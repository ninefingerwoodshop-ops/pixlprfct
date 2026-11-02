let closeMenu = () => {};

export function contextMenuBounds(point, size, viewport) {
  const margin = 4, left = (viewport.left ?? 0) + margin, top = (viewport.top ?? 0) + margin;
  const maxWidth = Math.max(0, viewport.width - margin * 2);
  const maxHeight = Math.max(0, viewport.height - margin * 2);
  return {
    maxWidth, maxHeight,
    x: Math.max(left, Math.min(point.x, left + maxWidth - Math.min(size.width, maxWidth))),
    y: Math.max(top, Math.min(point.y, top + maxHeight - Math.min(size.height, maxHeight))),
  };
}

export function showContextMenu(event, actions, returnFocus, {label = 'Layer actions', heading = null, container = null, anchor = null, onClose = () => {}, onShortcut = () => false} = {}) {
  container??=(returnFocus?.ownerDocument??anchor?.ownerDocument??event.target?.ownerDocument??globalThis.document).body;
  const document=container.ownerDocument,window=document.defaultView;
  event.preventDefault();
  closeMenu();
  const menu = document.createElement('div');
  menu.id = 'selection-menu';
  menu.className = 'selection-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);
  if (heading !== null) {
    const title = document.createElement('div');
    title.id = 'selection-menu-heading';
    title.className = 'selection-menu-heading';
    title.textContent = heading;
    menu.append(title);
    menu.setAttribute('aria-describedby', title.id);
  }
  const controller = new AbortController();
  const close = (restore = false) => {
    controller.abort();
    menu.remove();
    onClose();
    if (restore) returnFocus?.focus();
  };
  closeMenu = close;
  for (const action of actions) {
    if (action.visible === false) continue;
    if (action.separator) {
      const separator = document.createElement('div');
      separator.className = 'selection-menu-separator';
      separator.setAttribute('role', 'separator');
      menu.append(separator);
      continue;
    }
    const button = document.createElement('button');
    button.setAttribute('role', 'menuitem');
    const name = document.createElement('span');
    name.textContent = action.label;
    button.append(name);
    if (action.shortcut) {
      const shortcut = document.createElement('kbd');
      shortcut.textContent = action.shortcut;
      button.append(shortcut);
    }
    button.disabled = action.enabled === false;
    if (button.disabled && action.unavailable) button.title = action.unavailable;
    button.onclick = () => { close(true); action.run(); };
    menu.append(button);
  }
  container.append(menu);
  const position = () => {
    const visual = window.visualViewport;
    const viewport = {left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0,
      width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight};
    const rect = anchor?.getBoundingClientRect();
    const point = rect ? {x: rect.left, y: rect.bottom + 5} : {x: event.clientX, y: event.clientY};
    const limits = contextMenuBounds(point, {width: 0, height: 0}, viewport);
    menu.style.maxWidth = limits.maxWidth + 'px';
    menu.style.maxHeight = limits.maxHeight + 'px';
    const bounds = contextMenuBounds(point, menu.getBoundingClientRect(), viewport);
    menu.style.left = bounds.x + 'px';
    menu.style.top = bounds.y + 'px';
  };
  position();
  const buttons = () => [...menu.querySelectorAll('button:not(:disabled)')];
  buttons()[0]?.focus();
  document.addEventListener('pointerdown', e => { if (!menu.contains(e.target) && !(anchor && returnFocus?.contains(e.target))) close(); }, {signal:controller.signal});
  window.addEventListener('resize', position, {signal:controller.signal});
  window.visualViewport?.addEventListener('resize', position, {signal:controller.signal});
  window.visualViewport?.addEventListener('scroll', position, {signal:controller.signal});
  menu.onkeydown = e => {
    if (onShortcut(e)) { close(true); return; }
    if (['Escape','Tab'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation();
      const items = buttons(), index = items.indexOf(document.activeElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    } else if (e.key !== 'Enter' && e.key !== ' ') {
      // Close before the editor handles a shortcut so it cannot leave a stale menu.
      close(true);
    }
  };
  return close;
}
