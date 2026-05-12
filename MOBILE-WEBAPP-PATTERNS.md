# Mobile Web App Prototype — Constraints & Patterns

Lessons learned from building the muvmi Tourist Planner.
Use as a starting checklist for future mobile-view web prototypes.

---

## 1. Static Hosting (No Server)

- Host on GitHub Pages: no backend, no server-side rendering
- All state stored in `localStorage`
- Use a fake API layer (`api.js`) that intercepts `fetch()` and returns local JSON
- Assets (images, icons) committed directly to repo — no CDN dependency

---

## 2. Phone Frame — Fixed Screen Size

**Target:** iPhone 14 Pro (393 × 852px)

```css
body {
  background: #F0F2F5;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;   /* space around the phone frame */
}

.phone {
  width: 393px;
  height: 852px;        /* MUST be height, NOT min-height */
  background: #fff;
  border-radius: 48px;
  box-shadow:
    0 0 0 10px #1a1a1a, /* dark phone ring inner */
    0 0 0 12px #3a3a3a, /* dark phone ring outer */
    0 32px 64px rgba(0,0,0,0.35); /* deep drop shadow */
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Dynamic Island notch */
.phone::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 126px; height: 34px;
  background: #1a1a1a;
  border-radius: 0 0 20px 20px;
  z-index: 200;
}
```

**Why `height` not `min-height`:**
`min-height` lets the frame grow with content — phone becomes infinitely tall.
`height: 852px` locks the frame; content scrolls *inside* it.

**Common mistake:** copying only `height: 852px; overflow: hidden` and forgetting the `box-shadow` rings and `::before` notch — the page will look flat and frameless compared to other pages.

---

## 3. Scrollable Areas Inside Fixed Frame

**Pattern — flex column with scrollable child:**

```css
/* Parent: flex column */
.phone-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;        /* critical — prevents flex from overflowing parent */
}

/* Scrollable child */
.scroll-area {
  flex: 1;
  min-height: 0;        /* critical — same reason */
  overflow-y: auto;
  scrollbar-width: none;
}
.scroll-area::-webkit-scrollbar { display: none; }
```

**List items inside scroll area:**

```css
.list-item {
  flex-shrink: 0;       /* prevents items from squishing when list overflows */
}
```

**Common mistake:** forgetting `min-height: 0` causes flex children to ignore `overflow` and push outside the frame.

---

## 4. Drag-to-Scroll with Momentum + Axis-Lock

Simulates native mobile scroll for desktop mouse. Apply to any scrollable container.

```javascript
function makeDraggable(el, { vertical = false } = {}) {
  let isDown = false, axis = null, startX, startY, scrollLeft, scrollTop;
  let velX = 0, velY = 0, lastX = 0, lastY = 0, lastT = 0, rafId = null;
  const AXIS_THRESHOLD = 5;

  el.style.cursor = 'grab';
  el.style.userSelect = 'none';

  function cancelMomentum() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function applyMomentum() {
    if (axis === 'x') {
      velX *= 0.92;
      el.scrollLeft += velX;
      if (Math.abs(velX) > 0.5) { rafId = requestAnimationFrame(applyMomentum); return; }
    } else if (axis === 'y') {
      velY *= 0.92;
      el.scrollTop += velY;
      if (Math.abs(velY) > 0.5) { rafId = requestAnimationFrame(applyMomentum); return; }
    }
    rafId = null;
  }

  el.addEventListener('mousedown', e => {
    if (e.target.closest('button, a, input, [role="button"]')) return;
    cancelMomentum();
    isDown = true; axis = null;
    el.style.cursor = 'grabbing';
    startX = e.pageX; startY = e.pageY;
    scrollLeft = el.scrollLeft; scrollTop = el.scrollTop;
    lastX = e.pageX; lastY = e.pageY;
    lastT = performance.now();
    velX = 0; velY = 0;
  });

  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    const dx = e.pageX - startX;
    const dy = e.pageY - startY;
    if (!axis) {
      if (Math.abs(dx) > AXIS_THRESHOLD || Math.abs(dy) > AXIS_THRESHOLD)
        axis = (!vertical || Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
      else return;
    }
    e.preventDefault();
    const now = performance.now(), dt = now - lastT || 1;
    if (axis === 'x') { velX = (lastX - e.pageX) / dt * 12; el.scrollLeft = scrollLeft - dx; }
    else              { velY = (lastY - e.pageY) / dt * 12; el.scrollTop  = scrollTop  - dy; }
    lastX = e.pageX; lastY = e.pageY; lastT = now;
  });

  const release = () => {
    if (!isDown) return;
    isDown = false;
    el.style.cursor = 'grab';
    if (axis !== null) {
      // Suppress click that fires after mouseup when a drag occurred
      el.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true });
    }
    rafId = requestAnimationFrame(applyMomentum);
  };

  el.addEventListener('mouseup',    release);
  el.addEventListener('mouseleave', release);
}

// Usage
makeDraggable(document.querySelector('.scroll-content'), { vertical: true }); // vertical
makeDraggable(document.querySelector('.categories-row'));                      // horizontal
```

**Key rules:**

| Behaviour | How |
|---|---|
| Lock axis after 5px | prevents diagonal drift |
| `vertical: true` | enables Y-axis; without it, only X scrolls |
| Skip buttons/links on mousedown | prevents drag hijacking interactive elements |
| Suppress click after drag | prevents tap targets firing when user was scrolling |
| Decay `vel *= 0.92` per frame | momentum feel — adjust for faster/slower coast |

---

## 5. Overflow Rule — Always Make Overflowing Containers Scrollable

**Rule:** If a container holds a list of items that can exceed the container's size, it **must** be scrollable. Never let content clip silently or push outside the frame.

**How to decide the direction:**

| Layout pattern | Scroll direction | When to use |
|---|---|---|
| Items stacked top-to-bottom (`flex-direction: column`) | `overflow-y: auto` | Stop lists, location lists, settings, feeds |
| Items laid out left-to-right (`flex-direction: row`) | `overflow-x: auto` | Category chips, carousels, tag rows, icon rows |

**Checklist when building any list:**

1. Does the list have a bounded container (fixed height or `flex: 1`)? → add `overflow-y: auto`
2. Does the row have a bounded container (fixed width or `flex: 1`)? → add `overflow-x: auto`
3. Always pair with `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` to hide the scrollbar visually
4. Always call `makeDraggable(el, { vertical: true/false })` on the element so desktop mouse drag works

```css
/* Vertical list */
.list-container {
  overflow-y: auto;
  scrollbar-width: none;
}
.list-container::-webkit-scrollbar { display: none; }

/* Horizontal row */
.chip-row {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}
.chip-row::-webkit-scrollbar { display: none; }
```

```js
makeDraggable(document.querySelector('.list-container'), { vertical: true });
makeDraggable(document.querySelector('.chip-row'));  // horizontal by default
```

**Common mistake:** Adding `overflow-x: auto` to a horizontal row but forgetting `makeDraggable` — the row scrolls on touch/trackpad but not with a desktop mouse drag, which is how prototypes are usually demoed.

---

## 7. Prevent Image Drag-Out

Without this, dragging on images pulls the image file out of the page and breaks scroll.

```css
img {
  -webkit-user-drag: none;
  user-select: none;
}
```

Place in global reset, above all other styles.

---

## 8. Horizontal Carousel — Peek Affordance (No Snap)

Show ~55px of the next card to signal more content exists.

```css
.carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  /* No scroll-snap — let makeDraggable handle momentum naturally */
}
.carousel::-webkit-scrollbar { display: none; }

.card {
  width: 206px;     /* at 393px screen with 16px padding, leaves ~55px peek */
  flex-shrink: 0;
}
```

**Avoid `scroll-snap-type`** on drag-scroll carousels — snap fights momentum and makes dragging feel sticky.

---

## 9. Click vs Drag on Interactive List Items

Browser fires `click` after every `mouseup` — even after a drag. Fix: suppress click in `makeDraggable` release when `axis !== null` (see Section 4).

If the list also uses a sort library (e.g. SortableJS):
- Exclude sort handles from `makeDraggable` mousedown: `e.target.closest('.drag-handle')`
- SortableJS `delay: 80ms` + `makeDraggable` 5px threshold = quick drag scrolls, slow press-hold reorders

---

## 10. CSS vs HTML Attribute Precedence

CSS `width`/`height` on an element **overrides** HTML `width=""` `height=""` attributes.
If an icon appears the wrong size despite correct HTML attributes — check for a CSS rule on the same selector.

```css
/* This wins over <img width="20" height="20"> */
.icon-btn { width: 24px; height: 24px; }
```

Fix: change the CSS rule, not just the HTML attribute.

---

## 11. PWA Setup

```html
<link rel="manifest" href="manifest.json">
<script>
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('service-worker.js');
</script>
```

- Cache all assets in `service-worker.js` for offline/roaming use
- Set `"display": "fullscreen"` in `manifest.json` for full-screen mobile experience
- GitHub Pages requires `"start_url": "/repo-name/"` (include the repo path prefix)

---

## 12. No Hover States on Mobile Prototypes

Mobile devices have no cursor — `:hover` styles never trigger on touch. Remove all hover effects from mobile prototypes to keep the CSS honest.

```css
/* ✗ Remove these — they don't apply on mobile */
.card:hover { box-shadow: ...; }
.btn:hover  { opacity: 0.88; }
```

If you need a press/tap feedback, use `:active` instead:

```css
/* ✓ Use :active for tap feedback */
.card:active { opacity: 0.85; }
```

---

*Generated from muvmi Tourist Planner · May 2026*
