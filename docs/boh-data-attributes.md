# The `data-boh` contract

The zoom's pencil overlay is deterministic, not heuristic. It never guesses
what's editable by inspecting the DOM — public page components declare their
editable surfaces, and the overlay reads those declarations from the
same-origin iframe.

## The rule

A public component that has an admin editing surface emits one attribute on
its outermost editable element:

```tsx
<section data-boh="home.hero">…</section>
```

Dynamic entities append their id after a colon:

```tsx
<article data-boh={`product:${item.rms_id}`}>…</article>
<img data-boh={`photo:${item.rms_id}`} … />
```

That's the whole contract. Labels and destinations live in `EDIT_POINTS`
(`src/lib/boh/boh.config.ts`) — the public site never carries admin routes,
and the overlay never carries page knowledge. Adding an edit point is two
lines: one attribute on the public component, one registry entry.

## Current keys

| key | surface | destination |
|---|---|---|
| `home.hero` | seasonal hero | `/admin/home-hero` |
| `home.strip` | seasonal filmstrip | `/admin/home-hero#strip` |
| `collection.title` | page headline | `/admin/pages/collection` |
| `atelier.copy` | headline + evolution text | `/admin/pages/atelier` |
| `atelier.images` | fabrication photography | `/admin/photos?page=atelier` |
| `gallery.sets` | event set grid | `/admin/gallery` |
| `stylebrief.form` | intake form | `/admin/stylebrief` |
| `contact.form` | inquiry form | `/admin/insights` |
| `product:{id}` | any product card | `/admin/products?id={id}` |
| `photo:{id}` | any product image | `/admin/photos?product={id}` |

## Constraints

- **Same-origin only.** The overlay reads `iframe.contentDocument`. If the
  public site and `/admin` ever split across subdomains, this layer dies and
  needs a postMessage bridge instead. The dependency is deliberate — don't
  split them casually.
- **`frame-ancestors 'self'`.** Public routes must not send
  `X-Frame-Options: DENY` or `frame-ancestors 'none'`, or the zoom renders
  an empty frame. `'self'` still blocks every third-party embed.
- The attribute is inert on the public site — no styling, no behavior, no
  measurable weight. That's the correct cost.
- The overlay skips nodes measuring under 4×4px (collapsed/hidden states),
  and re-measures on iframe scroll and resize.
