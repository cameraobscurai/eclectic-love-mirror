Here's the revised brief with the Mapbox treatment folded in as Brief 3, and Brief 2 updated to include the full map styling implementation:

---

## Gallery redesign — masthead + bottom-half polish + map treatment

Three scoped passes. Brief 1 replaces the masthead. Brief 2 handles bottom-half wiring. Brief 3 is the Mapbox visual treatment — implement only after Brief 1 and 2 typecheck clean.

### Brief 1 — masthead replacement

*(unchanged from your plan — correct as written)*

### Brief 2 — bottom-half refinements

#### `GalleryMap.tsx` — replace `easeTo` with `flyTo`

Replace the existing `easeTo({ center, duration: 700 })` on activeIndex change with:

ts

```ts
map.current?.flyTo({
  center: project.coords,
  zoom: 5,
  duration: 1200,
  essential: true,
})
```

Same effect hook, different call. No other changes to `GalleryMap.tsx` in this pass — the full visual treatment is Brief 3.

#### Confirmed already correct — verify only, no changes

- `GalleryCardsTrack` calls `onActiveChange(activeIndex)` and `gallery.tsx` pipes it to `GalleryProjectIndex`. If `onJump` wiring is missing add: `onJump={(i) => jumpRef.current?.(i)}`.
- CTA grid uses `items-baseline`.
- Press image has descriptive alt.
- `gallery-projects.ts` has `coords: [number, number]` on every project.

### Brief 3 — Mapbox visual treatment

#### Context

`GalleryMap.tsx` currently renders a default dark Mapbox style. The map should feel like a material — dark topographic texture that belongs on a charcoal page — not a navigation tool. No roads, no POI, no transit. Cream labels for state names only. Amber pulsing dot on the active location. Globe projection. Fog dissolve at edges.

This entire brief lives inside `GalleryMap.tsx`. No other files change.

#### 1. Style — runtime theming via `setStyleImportConfigProperty`

After `map.on('load', ...)` fires, apply these in sequence:

ts

```ts
map.setProjection({ name: 'globe' });

map.setFog({
  range: [0.5, 10],
  color: '#0a0908',
  'high-color': '#0e0d0b',
  'horizon-blend': 0.08,
  'space-color': '#0a0908',
  'star-intensity': 0,
});

// Standard style color overrides
map.setStyleImportConfigProperty('basemap', 'lightPreset', 'night');
map.setStyleImportConfigProperty('basemap', 'showPointOfInterestLabels', false);
map.setStyleImportConfigProperty('basemap', 'showTransitLabels', false);
map.setStyleImportConfigProperty('basemap', 'showPlaceLabels', true); // state/country only
map.setStyleImportConfigProperty('basemap', 'showRoadLabels', false);
```

Then suppress road and minor label layers directly — these are present in Mapbox Standard night and need explicit hiding:

ts

```ts
const layersToHide = [
  'road-simple', 'road-primary', 'road-secondary-tertiary',
  'road-street', 'road-minor', 'road-path',
  'poi-label', 'transit-label', 'airport-label',
];
layersToHide.forEach(id => {
  if (map.getLayer(id)) {
    map.setLayoutProperty(id, 'visibility', 'none');
  }
});
```

Use `map.getLayer(id)` guard on every call — layer IDs vary between Standard versions and a missing layer must not throw.

State and country labels stay visible. Their color should be overridden to `rgba(245, 240, 230, 0.25)` via `setPaintProperty` on `'country-label'` and `'state-label'` text-color.

#### 2. Project markers — GeoJSON circle layers

Replace any existing marker/symbol approach with two GeoJSON circle layers: a base dot layer and a pulse layer for the active location.

Add a GeoJSON source keyed `'projects'` with a Feature per project, each carrying `index` and `active: false` in properties. On `activeIndex` change, update via `map.getSource('projects').setData(...)` with `active: true` on the matching feature.

**Base dot layer** `'project-dots'`**:**

ts

```ts
map.addLayer({
  id: 'project-dots',
  type: 'circle',
  source: 'projects',
  paint: {
    'circle-radius': 4,
    'circle-color': [
      'case', ['get', 'active'],
      'rgba(200,178,145,1)',
      'rgba(200,178,145,0.55)'
    ],
    'circle-stroke-width': 1,
    'circle-stroke-color': [
      'case', ['get', 'active'],
      'rgba(200,178,145,0.4)',
      'rgba(200,178,145,0.15)'
    ],
  }
});
```

**Pulse layer** `'project-pulse'` — animated ring on active dot only:

Add a separate circle layer `'project-pulse'` filtered to `['==', ['get', 'active'], true]`. Drive its `circle-radius` and `circle-opacity` with `requestAnimationFrame` using `setPaintProperty`:

ts

```ts
let pulseFrame: number;
const animatePulse = () => {
  const t = (Date.now() % 2000) / 2000; // 0→1 over 2s
  const radius = 4 + t * 14;            // 4px → 18px
  const opacity = (1 - t) * 0.5;       // 0.5 → 0
  if (map.getLayer('project-pulse')) {
    map.setPaintProperty('project-pulse', 'circle-radius', radius);
    map.setPaintProperty('project-pulse', 'circle-opacity', opacity);
  }
  pulseFrame = requestAnimationFrame(animatePulse);
};
animatePulse();
```

Cancel `pulseFrame` in the map `remove` cleanup and in the component's `useEffect` return.

**Label layer** `'project-labels'` — small text above each dot:

ts

```ts
map.addLayer({
  id: 'project-labels',
  type: 'symbol',
  source: 'projects',
  layout: {
    'text-field': ['get', 'name'],
    'text-size': 9,
    'text-offset': [0, -1.2],
    'text-anchor': 'bottom',
    'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
  },
  paint: {
    'text-color': [
      'case', ['get', 'active'],
      'rgba(200,178,145,0.9)',
      'rgba(245,240,230,0.35)'
    ],
    'text-halo-color': 'rgba(10,9,8,0.8)',
    'text-halo-width': 1,
  }
});
```

#### 3. Click interaction

ts

```ts
map.on('click', 'project-dots', (e) => {
  const idx = e.features?.[0]?.properties?.index;
  if (typeof idx === 'number') onSelect(idx);
});
map.on('mouseenter', 'project-dots', () => {
  map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'project-dots', () => {
  map.getCanvas().style.cursor = '';
});
```

#### 4. Initial camera

ts

```ts
new mapboxgl.Map({
  ...existingOptions,
  projection: 'globe',
  center: [-108, 40],   // center of the project geography
  zoom: 3.8,
  pitch: 0,
  bearing: 0,
  interactive: false,   // decorative — no user pan/zoom
})
```

`interactive: false` is deliberate. The map is an ambient geographic indicator, not a navigation tool. The `onSelect` callback still fires on dot click via the layer event above — that works independently of map interactivity.

#### 5. Cleanup

ts

```ts
return () => {
  cancelAnimationFrame(pulseFrame);
  map.current?.remove();
  map.current = null;
};
```

#### Verification

- Typecheck passes.
- Pulse animation does not cause React re-renders — it operates entirely via `map.setPaintProperty`, never `setState`.
- `map.getLayer(id)` guard used on every `setLayoutProperty` / `setPaintProperty` call that targets a built-in Standard layer.
- `interactive: false` confirmed — no scroll-hijack on the gallery page from the map.
- Bundle: `GalleryMap` remains a lazy chunk — nothing in Brief 3 changes the import graph.

### Out of scope

`GalleryCardsTrack`, `GalleryLightbox`, `GalleryEnvironmentCard`, `gallery-projects.ts` data shape beyond confirming `coords` exists, press bar, footer, any other route.

---

Send Brief 1 first, confirm typecheck, then Brief 2, then Brief 3. Brief 3 is the most isolated — it lives entirely in one file and has no props interface changes — but it depends on the map being wired correctly from Briefs 1 and 2 before the visual treatment is worth applying.