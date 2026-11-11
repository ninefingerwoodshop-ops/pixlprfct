// The document changes only on drop. Native dragend also cleans up Escape and
// drops outside this section, so cancelling never creates an undo entry.
// `multi` shares the canvas track selection: {indices, select(index, event),
// move(indices, before)}. Dragging a selected card carries the whole selection.
export function bindGridTrackSort(section, cards, move, shift, multi = null) {
 let source = null, carried = [];
 const selected = new Set(multi?.indices ?? []);
 const clearPreview = () => cards.forEach(card => card.classList.remove('grid-drop-before', 'grid-drop-after'));
 const finish = () => {
  source = null;
  carried = [];
  clearPreview();
  cards.forEach(card => card.classList.remove('grid-track-dragging'));
 };
 const preview = event => {
  clearPreview();
  const before = cards.findIndex(card => {
   const box = card.getBoundingClientRect();
   return event.clientY < box.top + box.height / 2;
  });
  const slot = before < 0 ? cards.length : before;
  if(carried.length > 1 || slot !== source && slot !== source + 1) {
   const target = cards[slot] ?? cards.at(-1);
   target.classList.add(slot === cards.length ? 'grid-drop-after' : 'grid-drop-before');
  }
  return slot;
 };
 cards.forEach((card, index) => {
  const heading = card.querySelector('.grid-track-heading');
  const grip = card.querySelector('.grid-track-grip');
  if(selected.has(index)) card.classList.add('grid-track-selected');
  if(multi) heading.addEventListener('click', event => {
   // Plain clicks keep their existing meaning; modifiers build the selection.
   if(!event.shiftKey && !event.ctrlKey && !event.metaKey) return;
   const control = event.target.closest('button');
   if(control && control !== grip) return;
   event.preventDefault();
   multi.select(index, event);
  });
  heading.draggable = grip.draggable = cards.length > 1;
  grip.disabled = cards.length < 2;
  heading.addEventListener('dragstart', event => {
   const control = event.target.closest('button');
   if(cards.length < 2 || control && control !== grip) { event.preventDefault(); return; }
   event.stopPropagation();
   source = index;
   event.dataTransfer.effectAllowed = 'move';
   event.dataTransfer.setData('application/x-pixlprfct-grid-track', String(index));
   event.dataTransfer.setDragImage(card, 16, 16);
   carried = selected.has(index) && selected.size > 1 ? [...selected].sort((a, b) => a - b) : [index];
   (carried.length > 1 ? carried.map(i => cards[i]).filter(Boolean) : [card]).forEach(item => item.classList.add('grid-track-dragging'));
  });
  heading.addEventListener('dragend', finish);
  grip.addEventListener('keydown', event => {
   if(event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
   event.preventDefault();
   event.stopPropagation();
   shift(index, event.key === 'ArrowUp' ? -1 : 1);
  });
 });
 section.addEventListener('dragover', event => {
  if(source === null) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'move';
  preview(event);
 });
 section.addEventListener('dragleave', event => {
  if(!section.contains(event.relatedTarget)) clearPreview();
 });
 section.addEventListener('drop', event => {
  if(source === null) return;
  event.preventDefault();
  event.stopPropagation();
  const index = source, group = carried, before = preview(event);
  finish();
  if(group.length > 1) multi.move(group, before);
  else if(before !== index && before !== index + 1) move(index, before);
 });
 section.addEventListener('keydown', event => {
  if(source !== null && event.key === 'Escape') {
   event.preventDefault();
   event.stopPropagation();
   finish();
  }
 }, true);
}
