let closeMenu = () => {};

export function showContextMenu(event, actions, returnFocus) {
  event.preventDefault();
  closeMenu();
  const menu = document.createElement('div');
  menu.id = 'selection-menu';
  menu.className = 'selection-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Layer actions');
  const controller = new AbortController();
  const close = (restore = false) => {
    controller.abort();
    menu.remove();
    if (restore) returnFocus?.focus();
  };
  closeMenu = close;
  for (const action of actions) {
    if (action.visible === false) continue;
    const button = document.createElement('button');
    button.setAttribute('role', 'menuitem');
    button.textContent = action.label + (action.shortcut ? ' · ' + action.shortcut : '');
    button.disabled = action.enabled === false;
    if (button.disabled && action.unavailable) button.title = action.unavailable;
    button.onclick = () => { close(true); action.run(); };
    menu.append(button);
  }
  document.body.append(menu);
  const position = () => {
    const rect = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(event.clientX, innerWidth - rect.width - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(event.clientY, innerHeight - rect.height - 4)) + 'px';
  };
  position();
  const buttons = () => [...menu.querySelectorAll('button:not(:disabled)')];
  buttons()[0]?.focus();
  document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) close(); }, {signal:controller.signal});
  window.addEventListener('resize', position, {signal:controller.signal});
  menu.onkeydown = e => {
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
}
