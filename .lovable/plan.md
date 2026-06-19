# v9 — Scene 4 (Brief) excitement + Scene 5 (Sent) camera

## Scene 4 — from static doc to kinetic assembly

Right now Scene 4 is just sections fading in stacked. The screenshot proves it: a long quiet page that reads like a PDF, not a moment. Fix it by treating the brief as a document being *composed in front of you*, with camera and motion.

**Camera (scene-level transform on IndexCard contents):**
- Open ~108% scale, biased high (start near the title) — like the camera is reading the headline.
- Slow continuous drift downward + zoom-out to 100% over the scene length so the full doc resolves at the end. Single ease, no jitter. This alone changes the feel from "slide" to "shot."
- Final 30 frames: settle (no drift) so signature lands clean.

**Title moment (the hero beat):**
- "The *Ridgeline* Dinner." builds word-by-word, not as one block. "The" → "Ridgeline" (italic, slight scale-from-1.04 settle) → "Dinner." with the period landing as its own beat (small spring pop).
- Hairline draws left→right under the title after it lands (stroke-dashoffset style via width interpolation).

**Meta rows — typewriter cadence:**
- Each row's *value* types in (clip-path inset right→0) on a 6-frame stagger. Labels fade in first. Feels like the brief is being filled out live.
- The italic mood line gets a slightly longer reveal + subtle 2px y-settle.

**Palette band — the satisfying click:**
- Swatches drop in left-to-right (3-frame stagger), each a tiny scaleY 0.85→1 + opacity. Hexes type below after the wall completes.
- Counter "08 TONES" ticks 01→08 in sync with the swatches landing (tabular nums).

**Pinned row — pin-drop:**
- 8 thumbs land left-to-right (4-frame stagger), each: scale 0.92→1, opacity 0→1, plus a 1px border-color flash from charcoal back to rule (the "pin" tick).
- Counter "08 / 08" tick-counts in sync.

**Signature — the close:**
- "— Yours, The Hive" handwrites in (clip-path reveal left→right, ~24 frames, italic).
- "READY TO SEND" pill on the right pulses once (opacity 0.4→1→0.7) right before scene end — sets up Scene 5.

**Net effect:** the brief assembles itself under a slow push-in. No new content, same layout shape; just real choreography + camera.

## Scene 5 — fix the "butt cheeks" ending

Current ending: "Sent." sits flat-center at 300px, tagline fades in, scene holds dead still for ~130 frames. That's the dead air.

**New camera + composition:**

1. **Pre-payoff (frames 0–60):** keep the SEND button → "Received" confirmation beat as-is (it works), but the IndexCard contents start at 102% scale, drifting down to 100% (subtle push-out, gives breath).

2. **The "Sent." payoff (frames 56–140):**
   - "Sent." enters big (340px italic), with a soft blur-in (filter blur 12px → 0) + scale 1.06 → 1.00 over ~28 frames. Heavier than current spring.
   - Hairline draws under it (left→right, 24 frames) — same gesture as the title underline in Scene 4, ties the deck together.
   - Behind "Sent.", a very faint ghost of the full palette (8 swatches, opacity 0.08) sits as a 56px band at the bottom of the card — the brief's color DNA carried into the send.

3. **The camera move (frames 140–220) — this is the new ending:**
   - Slow Ken Burns push-in on "Sent." — scale 1.00 → 1.08 over 80 frames, transform-origin centered on the word. Tagline ("A producer will reach out…") rises into frame from y+24 → 0 with a long ease.
   - Faint vignette darkens corners (radial-gradient overlay opacity 0 → 0.12) to focus attention.
   - The chrome (STUDIO · ECLECTIC HIVE · STYLE BRIEF, step counter, progress bar) fades to 0.35 opacity — the document recedes, the word remains.

4. **Final hold (frames 220–240):** locked. "Sent." centered, tagline visible, everything quiet. This is the resting frame — composed, not abandoned.

**Why this works:** The current ending stops moving. The new ending *keeps breathing* via the slow push-in + chrome fade, so the last 3 seconds feel intentional instead of "the video froze."

## Files

- `remotion/src/scenes/SceneBrief.tsx` — add scene camera wrapper, word-by-word title, typewriter values, staggered swatches/pins, counter tickers, signature handwrite, READY pulse.
- `remotion/src/scenes/SceneSend.tsx` — add scene camera, blur-in Sent., underline draw, palette ghost band, Ken Burns push, vignette, chrome fade.
- `remotion/src/components/IndexCard.tsx` — add optional `chromeOpacity` prop (default 1) so SceneSend can fade chrome at the end without forking the component.
- No changes to Scenes 1, 2, 3, or `theme.ts`.

## Verify

- Stills at frames 700 (Scene 4 mid-build), 790 (Scene 4 signature), 900 (Scene 5 Sent. landing), 1000 (Scene 5 Ken Burns mid), 1080 (final frame).
- Full render → `/mnt/documents/stylebrief-site-v9.mp4`.
