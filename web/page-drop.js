import {placeLayerDragPreview} from './layer-drop.js';

// Keep reordering separate from page navigation until a valid drop commits it.
export function pageAutoScrollSpeed(rect, y) {
  if (y < rect.top || y > rect.bottom) return 0;
  const edge = Math.min(40, (rect.bottom - rect.top) / 2);
  if (edge <= 0) return 0;
  if (y < rect.top + edge) return -600 * (1 - (y - rect.top) / edge) ** 2;
  if (y > rect.bottom - edge) return 600 * (1 - (rect.bottom - y) / edge) ** 2;
  return 0;
}
export function installPageDrop(menu, reorder, {
  canCopy = () => true,
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id),
} = {}) {
  let source = null, dragged = false, cancelled = false, copyMode = false;
  let preview = null, previewPoint = null, destinationLabel = null;
  const positionPreview = () => {
    if (!preview || !previewPoint) return;
    const view = menu.ownerDocument.defaultView, visual = view?.visualViewport;
    const viewport = {left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0,
      width: visual?.width ?? view.innerWidth, height: visual?.height ?? view.innerHeight};
    // The 16px inset also reserves space for the badge's 10px overhang.
    // Use the visible viewport, which can be smaller than CSS vw after zooming.
    preview.style.maxWidth = Math.max(0, viewport.width - 32) + 'px';
    preview.style.maxHeight = Math.max(0, viewport.height - 32) + 'px';
    const position = placeLayerDragPreview(previewPoint, preview.getBoundingClientRect(), viewport);
    preview.style.left = position.x + 'px'; preview.style.top = position.y + 'px';
  };
  const updatePreview = event => {
    if (!source) return;
    copyMode = !!event.altKey;
    if (!preview) return;
    preview.dataset.copy = String(copyMode);
    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      previewPoint = {x: event.clientX, y: event.clientY};
    }
    if (event.key && pointer) {
      const row = menu.ownerDocument.elementFromPoint(pointer.x, pointer.y)?.closest('[data-page-id]');
      indicate(row, pointer.y);
    }
    positionPreview();
  };
  const view = menu.ownerDocument.defaultView;
  view?.addEventListener('resize', positionPreview);
  view?.visualViewport?.addEventListener('resize', positionPreview);
  view?.visualViewport?.addEventListener('scroll', positionPreview);
  menu.ownerDocument.addEventListener('dragover', updatePreview, true);
  const clearIndicator = () => {
    menu.querySelectorAll('[data-page-drop]').forEach(row => delete row.dataset.pageDrop);
    if (destinationLabel) { destinationLabel.hidden = true; destinationLabel.textContent = ''; }
    positionPreview();
  };
  let pointer = null, scrollFrame = null, lastTime = null;
  const stopScroll = () => {
    if (scrollFrame !== null) cancelFrame(scrollFrame);
    scrollFrame = null; lastTime = null; pointer = null;
  };
  const indicate = (row, y) => {
    clearIndicator();
    if (!row || (!copyMode && row === source) || (copyMode && !canCopy()) || !menu.contains(row)) return false;
    const rect = row.getBoundingClientRect();
    row.dataset.pageDrop = y < rect.top + rect.height / 2 ? 'before' : 'after';
    if (destinationLabel) {
      destinationLabel.textContent = (row.dataset.pageDrop === 'before' ? 'Before ' : 'After ') + row.textContent;
      destinationLabel.hidden = false;
      positionPreview();
    }
    return true;
  };
  const scroll = time => {
    scrollFrame = null;
    if (!source || !pointer) return;
    const rect = menu.getBoundingClientRect();
    const speed = pointer.x >= rect.left && pointer.x <= rect.right ? pageAutoScrollSpeed(rect, pointer.y) : 0;
    const elapsed = lastTime === null ? 1 / 60 : Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    const previous = menu.scrollTop;
    menu.scrollTop = Math.max(0, Math.min(menu.scrollHeight - menu.clientHeight, previous + speed * elapsed));
    if (menu.scrollTop !== previous) {
      const row = menu.ownerDocument.elementFromPoint(pointer.x, pointer.y)?.closest('[data-page-id]');
      indicate(row, pointer.y);
      scrollFrame = requestFrame(scroll);
    } else lastTime = null;
  };
  const finish = () => {
    stopScroll();
    preview?.remove(); preview = null; previewPoint = null; destinationLabel = null;
    source?.classList.remove('page-dragging');
    source = null; copyMode = false;
    clearIndicator();
  };
  const rowAt = event => event.target.closest('[data-page-id]');
  menu.addEventListener('pointerdown', () => { dragged = false; cancelled = false; });
  menu.addEventListener('dragstart', event => {
    const row = rowAt(event);
    if (!row) return;
    source = row; dragged = true; cancelled = false;
    copyMode = !!event.altKey;
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-pixl-page', row.dataset.pageId);
    row.classList.add('page-dragging');
    if (event.dataTransfer.setDragImage) {
      preview = menu.ownerDocument.createElement('div');
      preview.className = 'layer-drag-preview page-drag-preview';
      preview.setAttribute('aria-hidden', 'true');
      const name = menu.ownerDocument.createElement('div');
      name.className = 'page-drag-preview-name'; name.textContent = row.textContent;
      destinationLabel = menu.ownerDocument.createElement('div');
      destinationLabel.className = 'page-drag-destination'; destinationLabel.hidden = true;
      preview.append(name, destinationLabel); menu.ownerDocument.body.append(preview);
      const blank = menu.ownerDocument.createElement('canvas'); blank.width = blank.height = 1;
      event.dataTransfer.setDragImage(blank, 0, 0);
      updatePreview(event);
    }
  });
  menu.addEventListener('dragover', event => {
    if (!source) return;
    copyMode = !!event.altKey;
    pointer = {x: event.clientX, y: event.clientY};
    if (scrollFrame === null) scrollFrame = requestFrame(scroll);
    const allowed = indicate(rowAt(event), event.clientY);
    event.preventDefault();
    event.dataTransfer.dropEffect = allowed ? (copyMode ? 'copy' : 'move') : 'none';
  });
  menu.addEventListener('dragleave', event => {
    if (!menu.contains(event.relatedTarget)) { stopScroll(); clearIndicator(); }
  });
  menu.addEventListener('drop', event => {
    if (!source) return;
    event.preventDefault();
    const row = rowAt(event), id = Number(source.dataset.pageId);
    copyMode = !!event.altKey;
    const allowed = indicate(row, event.clientY), copy = copyMode;
    const position = row?.dataset.pageDrop;
    finish();
    if (allowed && position) reorder(id, Number(row.dataset.pageId), position === 'after', copy);
  });
  menu.addEventListener('dragend', finish);
  // Dragging can leave keyboard focus outside the menu. Capture Escape before
  // the dropdown or editor handles it, while retaining native drag cancellation.
  menu.ownerDocument.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !source) { updatePreview(event); return; }
    cancelled = true;
    finish();
    event.stopImmediatePropagation();
  }, true);
  menu.ownerDocument.addEventListener('keyup', event => {
    if (event.key === 'Escape' && cancelled) {
      cancelled = false;
      event.stopImmediatePropagation();
    } else updatePreview(event);
  }, true);
  menu.addEventListener('click', event => {
    if (dragged) { event.preventDefault(); event.stopImmediatePropagation(); dragged = false; }
  }, true);
}
