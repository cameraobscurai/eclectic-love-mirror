# Crisp product zoom for The Edit

## What changes

- Clicking the product itself opens a second, immersive magnified state inside Quick View.
- That state loads the original full-resolution photo, never stretches the lighter browsing copy.
- Desktop supports cursor-centered wheel zoom and drag-to-pan. Touch supports pinch-to-zoom and one-finger pan once enlarged.
- Clicking or tapping the empty stage around the product closes Quick View. Clicking the product zooms instead; controls remain unaffected.
- Escape first leaves magnification, then closes Quick View on the next press.
- Previous/next and angle changes reset magnification and keep the existing instant thumbnail-to-sharp transition.

## Technical details

- Add a dedicated zoom surface around `#focus-image` with transform origin at the image coordinate origin.
- Use delta-normalized exponential wheel scaling, clamped zoom, and cursor-anchor math so trackpads do not jump to maximum zoom.
- Use native non-passive wheel handling plus Pointer Events for drag and two-pointer pinch.
- Switch the zoom source to the item's original `image` URL before magnifying; preserve the optimized `--view.webp` path for normal Quick View.
- Detect dead space from the rendered image bounds rather than treating the entire stage as one click target.
- Add only lightweight CSS states and respect reduced-motion settings.

## Verification

- Test desktop click, wheel, pan, dead-space close, Escape, previous/next, and controls.
- Test phone tap, pinch/pan, swipe navigation while unzoomed, and dead-space close.
- Confirm the magnified image URL is the original and no console, failed-photo, or layout errors appear.
