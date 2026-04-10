/**
 * api.js — transparent fetch interceptor for static hosting (GitHub Pages)
 *
 * Intercepts:
 *   GET  /api/stops   → fetch data/stops.json (static file)
 *   GET  /api/planner → read from localStorage
 *   PUT  /api/planner → write to localStorage
 *
 * Drop-in: include this script before any fetch calls. No other code changes needed.
 */
(function () {
  const STORAGE_KEY = 'tourist-planner';
  const DEFAULT_PLANNER = JSON.stringify({ selectedPlaces: [], addedPacks: {} });

  // Resolve data/stops.json relative to the current page (works on any base URL)
  const stopsURL = new URL('data/stops.json', document.baseURI).href;

  const _fetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    const url = input instanceof Request ? input.url : String(input);
    const method = ((init && init.method) || 'GET').toUpperCase();

    /* ── /api/stops ── */
    if (url.includes('/api/stops')) {
      return _fetch(stopsURL);
    }

    /* ── /api/planner ── */
    if (url.includes('/api/planner')) {
      if (method === 'GET') {
        const raw = localStorage.getItem(STORAGE_KEY) || DEFAULT_PLANNER;
        return Promise.resolve(
          new Response(raw, { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }

      if (method === 'PUT' || method === 'POST') {
        const body = init && init.body ? init.body : '{}';
        try { localStorage.setItem(STORAGE_KEY, body); } catch (e) { /* storage full */ }
        return Promise.resolve(
          new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
    }

    return _fetch(input, init);
  };
})();
