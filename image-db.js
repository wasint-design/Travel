/**
 * image-db.js
 * Resolves image keys to local paths using data/image-db.json.
 * Usage: await ImageDB.get('map-preview')  → 'images/figma/map-preview.svg'
 */
const ImageDB = (() => {
  let _db = null;

  async function load() {
    if (_db) return _db;
    const res = await fetch(new URL('data/image-db.json', document.baseURI).href);
    _db = await res.json();
    return _db;
  }

  return {
    /**
     * Resolve a key to a local path.
     * Falls back to `fallback` if the key is not in the DB.
     */
    async get(key, fallback = '') {
      const db = await load();
      return db.images[key]?.path || fallback;
    },

    /**
     * Apply all DB entries to <img> and elements with data-img-key attribute.
     * Call once after DOMContentLoaded.
     */
    async applyAll() {
      const db = await load();
      document.querySelectorAll('[data-img-key]').forEach(el => {
        const key = el.dataset.imgKey;
        const entry = db.images[key];
        if (!entry) return;
        if (el.tagName === 'IMG') {
          el.src = entry.path;
          if (entry.alt) el.alt = entry.alt;
        } else {
          el.style.backgroundImage = `url('${entry.path}')`;
        }
      });
    }
  };
})();
