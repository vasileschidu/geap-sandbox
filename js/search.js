/* Search input (library .search-input) — states for every search on the page,
   including the ones rendered after load (delegated on document):
     has-value  → shows .btn-group
     is-typing  → spinner while the user types (500ms)
     is-ready   → clear (x) button
   A search with a submit (.btn-search, e.g. the cadastral lookup) skips is-typing; Enter in
   it clicks the submit.
   The clear button empties the field, resets the state, keeps focus and fires an
   `input` event so the list that listens to the field filters again. */
(() => {
  const TYPING_MS = 500;
  const timers = new WeakMap();

  const fieldOf = (input) => input?.closest?.('.search-input');

  const reset = (field) => {
    field.classList.remove('has-value', 'is-typing', 'is-ready');
    clearTimeout(timers.get(field));
  };

  document.addEventListener('input', (e) => {
    const input = e.target;
    const field = fieldOf(input);
    if (!field || !input.matches('input')) return;

    if (input.value.trim() === '') {
      reset(field);
      return;
    }

    /* a search with a submit (.btn-search) is not a live filter: no typing spinner — its
       spinner shows only while the request runs (`loading`, set by the page) */
    if (field.querySelector('.btn-search')) {
      field.classList.add('has-value', 'is-ready');
      return;
    }

    field.classList.add('has-value', 'is-typing');
    field.classList.remove('is-ready');
    clearTimeout(timers.get(field));
    timers.set(field, setTimeout(() => {
      field.classList.remove('is-typing');
      field.classList.add('is-ready');
    }, TYPING_MS));
  });

  document.addEventListener('click', (e) => {
    const clear = e.target.closest('.search-input .btn-icon.clear');
    if (!clear) return;
    e.preventDefault();
    const field = clear.closest('.search-input');
    const input = field.querySelector('input');
    if (!input) return;
    input.value = '';
    reset(field);
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const field = fieldOf(e.target);
    field?.querySelector('.btn-search')?.click();
  });
})();
