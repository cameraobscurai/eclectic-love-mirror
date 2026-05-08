## Fix the Atelier image swap

I put the paper moodboard in the wrong slot last turn. There are three images in the L'ATELIER section of `/atelier`:

```
[ TOP — full-width 3:1 ]                  ← atelier-hive-triptych.jpeg (currently: B&W exterior + atrium + offices triptych)
[ bottom-left 4:5 ] [ bottom-right 4:5 ]  ← atelier-sketch-drape.png  |  atelier-collage.jpg (currently: paper moodboard — wrong)
```

The paper moodboard (image-76) was supposed to land in the **TOP** slot. The B&W workshop collage you just re-uploaded (image-77) was the original bottom-right and needs to go back there.

### What I'll do

1. **Save the re-uploaded B&W workshop collage** (image-77) to `src/assets/atelier/atelier-collage.jpg`, optimized the same way as before (~175 KB JPEG, 1600px max, mozjpeg quality 86). This restores the bottom-right tile.

2. **Move the paper moodboard into the top slot.** Re-export the current paper file as `src/assets/atelier/atelier-paper-moodboard.jpg`, optimized for the wider rendering (1920px max, ~250 KB), then update `src/routes/atelier.tsx` line 12 + 340 to import and render the paper moodboard in place of `atelierHiveTriptych`. Update the alt text to: *"Paper moodboard — fabric studies and stool sketch for L'Atelier."*

3. **Leave `atelier-hive-triptych.jpeg` on disk** (don't delete) in case you want it back later, but it stops being referenced.

### One thing to flag before I do it

The top frame renders at **3:1 horizontal** (5:3 on mobile). The paper moodboard is **portrait** (~4:5). At 3:1 it will be heavily letterboxed or cropped — losing the top tape strip and the bottom fabric stack. Two options, your call:

- **A. Keep the 3:1 frame** — the moodboard will be cropped to a horizontal band through the middle. Looks editorial but loses the full composition.
- **B. Change the top frame's aspect ratio** to something portrait-friendly like **4:5** or **3:4**, full width, so the whole moodboard breathes. This is how it would actually showcase the paper artwork.

I'd recommend **B** — the moodboard is the kind of detail piece that loses its soul when cropped. Want me to go with B?
