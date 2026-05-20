## A. Reorder gallery list

Anguilla moves from slot 05 → slot 10. New sequence:

```
01 Amangiri              09 Bishop's Lodge
02 Aspen / Private Ranch 10 Anguilla       ← moved
03 Brush Creek Diwan     11 Encore Boston
04 Telluride / Lynden    12 Private Res TX
05 Big Sky / Montana     13 Blackberry Farms
06 Dunton / Brooke K.    14 Four Seasons Vail
07 Brush Creek LTD       15 Dunton / Dos Mas
08 Hotel Jerome (was 15) → keep at end? See note.
```

Question: you also told me earlier to "move Hotel Jerome closer to the end." Two ways to honor both:
- **Option α** — Anguilla=10, Hotel Jerome stays last (=15). Dos Mas slides to 14. *Default.*
- **Option β** — Anguilla=10, Hotel Jerome=11, the rest pushes down.

I'll go with **α** unless you say otherwise.

## B. Re-mirror Amangiri from Drive (the big fix)

Current bucket: 28 files, mostly UUID names.
Source: `FEATURE Amangiri` (128 files, 72 MB, properly labeled subfolders: `Fireside`, `amphitheaterravensnest`, `Add On`, plus 103 more). UUIDs we already have are nested inside this same folder — clean re-mirror absorbs them.

Action:
1. Walk `FEATURE Amangiri` recursively.
2. **Skip any subfolder containing `pool` / `Pool Deck`** per your note.
3. Also pull the companion 17 files from `Easton - Gahan Wedding at Amangiri` (named tablescapes, Raven's Nest at Night, Lounge in Amp).
4. Mirror to `image-galleries/AMANGIRI/`, flatten `subdir__filename`.
5. Wipe old AMANGIRI contents first so we don't keep stale UUID dupes.
6. Rebuild `amangiriGalleryPaths` + hero. New hero candidate: a Chinle long-table night-dinner shot OR Fireside lounge, your call after preview.

## C. Re-mirror Dos Mas (Dunton / Easton, slot 14/15)

Current: 21 files in `dosmasenlamesalittrell`. Drive `FEATURE Easton Events - Dunton Hot Springs` has 71 files (148 MB) including the Littrell series, Welcome Party Fireside, Casino Night, Dinner by the River, Flemish Renaissance Artwork. Mirror the same way, flatten, rebuild manifest.

## D. Rigorous per-album curation pass

Rules applied to every album:
- **Keep**: setup/production shots, tablescapes, lounges, bars, ceremony architecture, florals, lighting, food/service, exterior context (1-3 max per album).
- **Drop**: posed bridal/couple portraits unless they show the design (e.g. bride at a designed tablescape stays). Drop family/guest candids. Drop blurry or near-duplicates (keep best of a burst).
- **Cap**: aim for 25–45 per album (your stated 10–20 low / 50–75 high band, midweight default).
- **Order within album**: arrival → environment → tablescape detail → wide reception → night close, unless the notes specify otherwise (Bishop's Lodge already locked to cocktail→ceremony→tent→friday).
- **Cover image**: keep the explicit cover overrides we already fixed; for albums without an explicit cover, pick the strongest production-detail frame.

For the four albums where filenames are opaque (Amangiri after re-mirror will mostly be labeled, but Encore Boston, Private Res TX, Blackberry have numbered-only files), I'll do one **AI vision pass** (Gemini 2.5 Flash) on the candidate set — single round, label each as setup/portrait/wide/candid — and curate from that. Cheap, deterministic, no loop.

## Edits this will touch

- `scripts-tmp/mirror-galleries.mjs` — extend with AMANGIRI + Dos Mas targets and skip rules.
- `src/content/gallery-manifests.ts` — rewrite `amangiriGalleryPaths`, `dosMasEnLaMesaGalleryPaths`, and trim/reorder the remaining 13 path arrays.
- `src/content/gallery-projects.ts` — reorder the array so Anguilla = #10; bump numbers `06–10`; pick fresh `heroImage` if you want a non-default for Amangiri.

## What I need from you

1. Confirm **Option α** for ordering (Anguilla=10, Hotel Jerome stays last) or pick β.
2. Green-light the **destructive Amangiri wipe-and-replace** (old 28 UUID files go away; they all reappear inside the new mirror anyway).
3. Same green-light for **Dos Mas re-mirror** (21 → 71 files).
4. Cap target: 25–45 per album OK, or want me to push high (closer to 75) for the marquee ones (Amangiri, Vail, Bishop's, Dunton-Brooke)?
