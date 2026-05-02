Got it. Here's the hardened version. Paste this instead.

---

Do not write a plan. Execute these three things only, in this order. Show me screenshots of both states when done.

**One — Change the cream token at the source. One line.**

Open the global CSS variables file — `src/styles.css` or `src/index.css`, wherever `--cream: #f5f2ed` is defined. Change it to:

css

```css
--cream: #ffffff;
```

Do not do file-by-file replacements. Do not grep for individual usages. Change the token at the source and every component using `var(--cream)` updates automatically. After saving, open DevTools on `/collection` and confirm the computed background of `body`, the route wrapper, the rail, the utility bar, and the heading block are all `rgb(255, 255, 255)`. If any surface is still tan or off-white, find what is hardcoding `#f5f2ed` directly instead of using the token and replace those too.

**Two — Fix the ResizeObserver so the utility bar sticky offset is correct on first load.**

The current ResizeObserver only fires on resize, so `--collection-heading-h` is unset on initial paint and the utility bar renders at the wrong position. Replace the entire effect with this exact implementation:

tsx

```tsx
useEffect(() => {
  const el = headingRef.current;
  if (!el) return;
  const update = () => {
    document.documentElement.style.setProperty(
      '--collection-heading-h',
      el.offsetHeight + 'px'
    );
  };
  update(); // fire immediately on mount
  const ro = new ResizeObserver(update);
  ro.observe(el);
  return () => ro.disconnect();
}, []);
```

After this change the utility bar must be flush against the bottom of the heading block on first load, with no gap and no overlap, at every viewport width.

**Three — Remove every count from every surface. No plan, just delete.**

Grep `src/components/collection/` and `src/routes/collection.tsx` for these strings and delete every render-side hit:

```
{count}
counts.get
PIECES
pieces
· N
N pieces
N results  ← keep this one only if inside the search feedback string
```

After deletion the following must be true:

- Rail rows: thumbnail + name only. No number.
- Overview cards: category name only in the glass label. No number.
- Category hero: no count line. The `44 PIECES` paragraph is gone entirely.
- Utility bar left label: category name only when a category is active. Nothing when on the overview. `N results matching "query"` only when search is active.

If removing the `count` render also means removing an unused `count` prop or `counts` variable, remove that too. Do not leave dead props in component signatures.