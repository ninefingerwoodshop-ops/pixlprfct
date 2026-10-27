export function pageMatchRanges(name, query) {
  if (!query) return [];
  const text = name.toLocaleLowerCase(), search = query.toLocaleLowerCase(), ranges = [];
  let from = 0;
  while (from < text.length) {
    const start = text.indexOf(search, from);
    if (start < 0) break;
    ranges.push([start, start + search.length]);
    from = start + search.length;
  }
  return ranges;
}

export function createPageTypeahead() {
  let query = '', lastTime = -Infinity, literal = false;
  const reset = () => { query = ''; lastTime = -Infinity; literal = false; };
  return {
    reset,
    setQuery(value, now) { query = value.toLocaleLowerCase(); lastTime = now; literal = true; },
    get query() { return !literal && [...query].every(char => char === query[0]) ? query[0] ?? '' : query; },
    match(key, pages, focusedId, now) {
      const editing = key === 'Backspace';
      if (!editing && now - lastTime > 1000) { query = ''; literal = false; }
      if (key === ' ' && !query) return null;
      lastTime = now;
      if (editing) query = [...this.query].slice(0, -1).join('');
      else query += key.toLocaleLowerCase();
      if (!query) return null;
      const repeated = !literal && [...query].every(char => char === query[0]);
      const search = repeated ? query[0] : query;
      const current = pages.findIndex(page => page.id === focusedId);
      const matches = page => pageMatchRanges(page.name, search).length > 0;
      // Keep the current match while extending a name; repeated letters cycle.
      if ((editing || !repeated) && current >= 0 && matches(pages[current])) return pages[current].id;
      for (let step = 1; step <= pages.length; step++) {
        const page = pages[(current + step) % pages.length];
        if (matches(page)) return page.id;
      }
      return null;
    },
  };
}

export function cyclePageMatch(pages, query, focusedId, direction, wrap = true) {
  const matches = pages.filter(page => !query || pageMatchRanges(page.name, query).length);
  if (!matches.length) return null;
  if (direction === 'first') return matches[0].id;
  if (direction === 'last') return matches[matches.length - 1].id;
  const index = matches.findIndex(page => page.id === focusedId);
  const next = index < 0 ? (direction > 0 ? 0 : matches.length - 1)
    : wrap ? ((index + direction) % matches.length + matches.length) % matches.length
      : Math.max(0, Math.min(matches.length - 1, index + direction));
  return matches[next].id;
}
