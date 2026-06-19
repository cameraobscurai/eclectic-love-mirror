// V11 — ECLECTIC HIVE SITE REEL
// 1620f · 30fps · 1920x1080 · one easing · zero gradients · zero infographic
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Img,
  staticFile,
  spring,
} from "remotion";
import { DISPLAY, BODY } from "./fonts";
import manifest from "./v11-manifest.json";

const CHARCOAL = "#1a1a1a";
const WHITE = "#ffffff";
const SAND = "#d4cdc4";
const EASE = Easing.bezier(0.7, 0, 0.3, 1);
const ease = (t: number) => EASE(t);

const easeRange = (frame: number, [a, b]: [number, number], [from, to]: [number, number]) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

// ─────────────────────────────────────────────────────────────────────────
// TIMING (frame ranges, all relative to full composition)
// ─────────────────────────────────────────────────────────────────────────
const T = {
  S01_INVITE:    [0,    100] as [number, number],
  S02_HOME:      [90,   240] as [number, number],
  S03_GRID:      [230,  370] as [number, number],
  S04_ARCHIVE:   [360,  540] as [number, number],
  S05_TONAL:     [530,  680] as [number, number],
  S06_MACRO:     [670,  820] as [number, number],
  S07_SWATCH:    [810,  900] as [number, number],
  S08_ATELIER:   [890,  1060] as [number, number],
  S09_SKETCH:    [1050, 1150] as [number, number],
  S10_GALLERY:   [1140, 1310] as [number, number],
  S11_BRIEF:     [1300, 1500] as [number, number],
  S12_SUBMIT:    [1490, 1560] as [number, number],
  S13_COVERS:    [1550, 1600] as [number, number],
  S14_LOCKUP:    [1590, 1620] as [number, number],
};

// ─────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY HELPERS
// ─────────────────────────────────────────────────────────────────────────
const monoStack = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const labelStyle = (size = 11, color = CHARCOAL): React.CSSProperties => ({
  fontFamily: monoStack,
  fontSize: size,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color,
  fontVariantNumeric: "tabular-nums",
});
const displayStyle = (size = 48, color = CHARCOAL): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontWeight: 400,
  fontSize: size,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color,
});

// ─────────────────────────────────────────────────────────────────────────
// GHOST-BAND BOOKEND — appears f60-72 and f1545-1557 (entrance + exit)
// ─────────────────────────────────────────────────────────────────────────
const GhostBand: React.FC<{ at: number; rising?: boolean }> = ({ at, rising = true }) => {
  const frame = useCurrentFrame();
  const p = easeRange(frame, [at, at + 12], [0, 1]);
  if (p === 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 4,
        background: CHARCOAL,
        transformOrigin: rising ? "left center" : "right center",
        transform: `scaleX(${p})`,
        zIndex: 50,
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S01 — INVITATION (material macro, no UI)
// ─────────────────────────────────────────────────────────────────────────
const S01Invitation: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 90], [1.0, 1.012], { easing: ease });
  const opacity = easeRange(frame, [0, 14], [0, 1]);
  const exit = easeRange(frame, [80, 100], [1, 0.4]);
  return (
    <AbsoluteFill style={{ background: CHARCOAL, opacity: opacity * exit }}>
      <Img
        src={staticFile(manifest.home.poster05)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: "brightness(0.78) contrast(1.05)",
        }}
      />
      <AbsoluteFill style={{ background: CHARCOAL, opacity: 0.25 }} />
      <div style={{ position: "absolute", left: 96, bottom: 64, ...labelStyle(11, "rgba(255,255,255,0.7)") }}>
        WINTER · ASPEN · 2026
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S02 — HOME REEL (cropped autumn poster as filmstrip cell)
// ─────────────────────────────────────────────────────────────────────────
const S02Home: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const scale = interpolate(frame, [0, 150], [1.06, 1.0], { easing: ease });
  const exitScale = easeRange(frame, [120, 150], [1.0, 0.9]);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity }}>
      {/* Wordmark + nav */}
      <div style={{ position: "absolute", top: 48, left: 96, ...displayStyle(22) }}>
        ECLECTIC HIVE
      </div>
      <div style={{ position: "absolute", top: 56, right: 96, display: "flex", gap: 40, ...labelStyle(10) }}>
        <span>HOME</span><span>COLLECTION</span><span>ATELIER</span><span>GALLERY</span><span>CONTACT</span>
      </div>
      <div style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", ...labelStyle(10, "rgba(26,26,26,0.45)") }}>
        04 / 05
      </div>
      {/* Reel filmstrip — autumn dominant, winter peek */}
      <div style={{
        position: "absolute",
        top: 140,
        left: "8%",
        right: "8%",
        bottom: 140,
        display: "flex",
        gap: 14,
        transform: `scale(${scale * exitScale})`,
        transformOrigin: "left center",
        overflow: "hidden",
      }}>
        <div style={{ flex: "0 0 68%", overflow: "hidden", position: "relative" }}>
          <Img src={staticFile(manifest.home.poster04)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: 16, left: 16, ...labelStyle(9, "rgba(255,255,255,0.85)") }}>04 · AUTUMN</div>
        </div>
        <div style={{ flex: "0 0 28%", overflow: "hidden", position: "relative", opacity: 0.55 }}>
          <Img src={staticFile(manifest.home.poster05)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 64, left: 96, ...displayStyle(38) }}>
        Furniture &amp; styling for the moments that matter.
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S03 — GRID CONSTRUCT (rule-of-thirds + 6-col skeleton draws itself)
// ─────────────────────────────────────────────────────────────────────────
const S03GridConstruct: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const exit = easeRange(frame, [120, 140], [1, 0]);
  // 12-col guide + 6-row guide, all draw L→R / T→B
  const colDraw = easeRange(frame, [6, 28], [0, 1]);
  const rowDraw = easeRange(frame, [18, 42], [0, 1]);
  const labelOp = easeRange(frame, [44, 60], [0, 1]);
  const tileSnap = easeRange(frame, [50, 90], [0, 1]);
  const cols = 6, rows = 4;
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      <div style={{ position: "absolute", top: 40, left: 96, ...labelStyle(10, "rgba(26,26,26,0.45)") }}>
        /COLLECTION — 625 PRODUCTS · 14 CATEGORIES
      </div>
      {/* Vertical guides */}
      <div style={{ position: "absolute", inset: "120px 96px 120px 96px" }}>
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${(i / cols) * 100}%`,
            width: 1,
            background: "rgba(26,26,26,0.18)",
            transformOrigin: "top",
            transform: `scaleY(${colDraw})`,
          }} />
        ))}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${(i / rows) * 100}%`,
            height: 1,
            background: "rgba(26,26,26,0.18)",
            transformOrigin: "left",
            transform: `scaleX(${rowDraw})`,
          }} />
        ))}
        {/* Tile snap-in previews — square cells, normalized silhouette */}
        {Array.from({ length: cols * rows }).map((_, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          const delay = (r * cols + c) * 0.8;
          const tp = easeRange(frame, [50 + delay, 70 + delay], [0, 1]);
          const tile = manifest.tiles[i];
          if (!tile) return null;
          return (
            <div key={i} style={{
              position: "absolute",
              top: `${(r / rows) * 100}%`,
              left: `${(c / cols) * 100}%`,
              width: `${100 / cols}%`,
              height: `${100 / rows}%`,
              padding: 10,
              opacity: tp,
              transform: `translateY(${(1 - tp) * 6}px)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <div style={{ width: "78%", height: "78%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Img src={staticFile(tile.file)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", bottom: 56, left: 96, opacity: labelOp, ...labelStyle(10, "rgba(26,26,26,0.55)") }}>
        06 × 04 GRID · DESIGNED, NOT GENERATED
      </div>
      <div style={{ position: "absolute", bottom: 56, right: 96, opacity: labelOp, ...labelStyle(10, "rgba(26,26,26,0.55)") }}>
        SORT BY · TYPE / TONAL / FAMILY
      </div>
      {/* Use tileSnap to silence unused var */}
      <div style={{ display: "none" }}>{tileSnap}</div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S04 — ARCHIVE WIDE (12 × 7 = 84 tiles, perfectly square normalized cards)
// ─────────────────────────────────────────────────────────────────────────
const GRID_COLS = 12;
const GRID_ROWS = 7;
const GRID_TILES = manifest.tiles.slice(0, GRID_COLS * GRID_ROWS);
// Match-cut target for S06: first seating product
const MATCH_TILE_IDX = Math.max(0, GRID_TILES.findIndex((t) => t.category === "seating"));
const MATCH_TILE = GRID_TILES[MATCH_TILE_IDX];

const ArchiveGrid: React.FC<{ progress: number; tonalProgress: number }> = ({ progress, tonalProgress }) => {
  // Tonal sort target: textiles ordered light → dark
  const textiles = GRID_TILES
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.category === "pillows-throws" && t.colorHex)
    .sort((a, b) => (b.t.colorLightness ?? 0) - (a.t.colorLightness ?? 0));
  const textilePosMap = new Map<number, number>(textiles.map(({ i }, idx) => [i, idx]));
  // Sort scene lays textiles across a middle row in tonal order
  const sortedRow = Math.floor(GRID_ROWS / 2);
  return (
    <div style={{
      position: "absolute",
      inset: "56px 80px 56px 80px",
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
      gap: 4,
    }}>
      {GRID_TILES.map((tile, i) => {
        const r = Math.floor(i / GRID_COLS), c = i % GRID_COLS;
        const delay = (r + c) * 0.5;
        const enter = Math.max(0, Math.min(1, (progress * 90 - delay) / 22));
        let translateX = 0, translateY = 0;
        if (textilePosMap.has(i)) {
          const targetIdx = textilePosMap.get(i)!;
          const targetCol = textiles.length <= 1 ? c : (targetIdx / (textiles.length - 1)) * (GRID_COLS - 1);
          const dx = (targetCol - c) * (100 / 1);   // % of OWN width × cells
          const dy = (sortedRow - r) * (100 / 1);
          translateX = dx * tonalProgress;
          translateY = dy * tonalProgress;
        }
        const dim = textilePosMap.has(i) ? 1 : 1 - 0.55 * tonalProgress;
        const isMatch = i === MATCH_TILE_IDX;
        return (
          <div
            key={tile.slug}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              opacity: enter * dim,
              transform: `translate(${translateX}%, ${translateY}%) translateY(${(1 - enter) * 10}px)`,
              background: "#f7f5f1",
              outline: isMatch ? `1px solid rgba(26,26,26,${0.15 + 0.55 * tonalProgress})` : "1px solid rgba(26,26,26,0.04)",
              outlineOffset: isMatch ? 1 : 0,
              zIndex: textilePosMap.has(i) ? 5 : isMatch ? 4 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Normalized silhouette box: every product occupies the same visual area */}
            <div style={{
              width: "78%",
              height: "78%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Img
                src={staticFile(tile.file)}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};


const S04Archive: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const exit = easeRange(frame, [150, 180], [1, 0]);
  const enterX = easeRange(frame, [0, 30], [220, 0]);
  const drift = easeRange(frame, [80, 180], [0, -14]);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      <div style={{ transform: `translate(${enterX}px, ${drift}px)`, height: "100%", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, left: 80, ...labelStyle(10, "rgba(26,26,26,0.45)") }}>
          /COLLECTION
        </div>
        <div style={{ position: "absolute", top: 24, right: 80, ...labelStyle(10, "rgba(26,26,26,0.65)") }}>
          625 / 625
        </div>
        <ArchiveGrid progress={1} tonalProgress={0} />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S05 — TONAL SORT (textile band re-orders to bone→charcoal)
// ─────────────────────────────────────────────────────────────────────────
const S05Tonal: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const exit = easeRange(frame, [125, 150], [1, 0]);
  const sortP = easeRange(frame, [10, 70], [0, 1]);
  const labelOp = easeRange(frame, [60, 90], [0, 1]);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      <div style={{ position: "absolute", top: 24, left: 80, ...labelStyle(10, "rgba(26,26,26,0.45)") }}>
        /COLLECTION — SORT · TONAL
      </div>
      <div style={{ position: "absolute", top: 24, right: 80, opacity: labelOp, ...labelStyle(10, "rgba(26,26,26,0.65)") }}>
        153 INDEXED · BONE → CHARCOAL
      </div>
      <ArchiveGrid progress={1} tonalProgress={sortP} />
      <div style={{ position: "absolute", bottom: 36, left: 80, right: 80, display: "flex", justifyContent: "space-between", opacity: labelOp, ...labelStyle(9, "rgba(26,26,26,0.55)") }}>
        <span>#F2F1E9</span><span>#C7B6A1</span><span>#7A6352</span><span>#2E4D85</span><span>#121212</span>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S06 — MACRO MATCH-CUT (one tile fills frame)
// ─────────────────────────────────────────────────────────────────────────
const S06Macro: React.FC = () => {
  const frame = useCurrentFrame();
  // Continuous scale from grid-tile-size to full frame
  const scale = easeRange(frame, [0, 50], [0.18, 1.0]);
  const opacity = easeRange(frame, [0, 12], [0, 1]);
  const exitBlur = easeRange(frame, [110, 145], [0, 8]);
  const labelOp = easeRange(frame, [55, 80], [0, 1]);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity }}>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
        filter: `blur(${exitBlur}px)`,
      }}>
        {/* Normalized box so the silhouette truly fills frame */}
        <div style={{
          width: "62%",
          height: "78%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Img
            src={staticFile(MATCH_TILE.file)}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
      <div style={{ position: "absolute", top: 56, left: 96, opacity: labelOp, ...labelStyle(10, "rgba(26,26,26,0.55)") }}>
        {MATCH_TILE.category.replace(/-/g, " ").toUpperCase()} · {String(MATCH_TILE_IDX + 1).padStart(3, "0")} / 625
      </div>
      <div style={{ position: "absolute", bottom: 96, left: 96, opacity: labelOp, maxWidth: 720, ...displayStyle(44) }}>
        {MATCH_TILE.title}
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S07 — SWATCH BLOOM (rack focus to color tag)
// ─────────────────────────────────────────────────────────────────────────
const S07Swatch: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 12], [0, 1]);
  const exit = easeRange(frame, [70, 90], [1, 0]);
  const bloom = easeRange(frame, [0, 30], [0.04, 1.0]);
  const pulse = 1 + 0.012 * Math.sin((frame / 30) * Math.PI * 2);
  return (
    <AbsoluteFill style={{ background: "#C7B6A1", opacity: opacity * exit, transform: `scale(${bloom * pulse})`, transformOrigin: "center" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ ...labelStyle(13, CHARCOAL), opacity: easeRange(frame, [20, 40], [0, 1]) }}>
          CHAMPAGNE · WARM · L 76.7
        </div>
        <div style={{ ...displayStyle(96, CHARCOAL), opacity: easeRange(frame, [25, 50], [0, 1]) }}>
          #C7B6A1
        </div>
        <div style={{ ...labelStyle(10, "rgba(26,26,26,0.55)"), opacity: easeRange(frame, [35, 60], [0, 1]) }}>
          ONE OF 153 TAGGED COLORS
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S08 — ATELIER TRIPTYCH
// ─────────────────────────────────────────────────────────────────────────
const S08Atelier: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const exit = easeRange(frame, [145, 170], [1, 0]);
  const panels = [
    { src: manifest.atelier["imagined-tent"], verb: "IMAGINED", delay: 0 },
    { src: manifest.atelier["studio-collage"], verb: "DESIGNED", delay: 14 },
    { src: manifest.atelier["realized-aspen"], verb: "REALIZED", delay: 28 },
  ];
  return (
    <AbsoluteFill style={{ background: CHARCOAL, opacity: opacity * exit }}>
      <div style={{ position: "absolute", top: 56, left: 96, ...labelStyle(10, "rgba(255,255,255,0.55)") }}>
        /ATELIER
      </div>
      <div style={{ position: "absolute", top: 56, right: 96, ...labelStyle(10, "rgba(255,255,255,0.55)") }}>
        IMAGINED · DESIGNED · REALIZED
      </div>
      <div style={{ position: "absolute", inset: "120px 96px 140px 96px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {panels.map((p, i) => {
          const ty = easeRange(frame, [p.delay, p.delay + 24], [60, 0]);
          const op = easeRange(frame, [p.delay, p.delay + 24], [0, 1]);
          return (
            <div key={i} style={{ position: "relative", transform: `translateY(${ty}px)`, opacity: op, overflow: "hidden" }}>
              <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 16, left: 16, ...displayStyle(20, WHITE) }}>
                {p.verb}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", bottom: 56, left: 96, ...displayStyle(28, WHITE) }}>
        Three rooms, one studio.
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S09 — SKETCH MACRO (push into sketch detail)
// ─────────────────────────────────────────────────────────────────────────
const S09Sketch: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 14], [0, 1]);
  const exit = easeRange(frame, [80, 100], [1, 0]);
  const scale = interpolate(frame, [0, 100], [1.0, 1.18], { easing: ease });
  const ox = interpolate(frame, [0, 100], [0, -8], { easing: ease });
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      <Img
        src={staticFile(manifest.atelier["sketch-drape"])}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${scale}) translateX(${ox}%)`,
          filter: "contrast(1.08)",
        }}
      />
      <div style={{ position: "absolute", bottom: 56, left: 96, ...labelStyle(10, "rgba(26,26,26,0.65)") }}>
        SKETCH · GRAPHITE · 2024
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S10 — GALLERY KEN BURNS (Amangiri Chinle)
// ─────────────────────────────────────────────────────────────────────────
const S10Gallery: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const exit = easeRange(frame, [145, 170], [1, 0]);
  const scale = interpolate(frame, [0, 170], [1.0, 1.12], { easing: ease });
  const tx = interpolate(frame, [0, 170], [0, -3], { easing: ease });
  const ty = interpolate(frame, [0, 170], [0, -2], { easing: ease });
  return (
    <AbsoluteFill style={{ background: CHARCOAL, opacity: opacity * exit }}>
      <Img
        src={staticFile(manifest.gallery["amangiri-chinle"])}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", top: 56, left: 96, ...labelStyle(10, "rgba(255,255,255,0.7)") }}>
        /GALLERY — AMANGIRI · CHINLE
      </div>
      <div style={{ position: "absolute", bottom: 96, left: 96, ...displayStyle(48, WHITE), maxWidth: 900 }}>
        A long table under a desert sky.
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S11 — STYLEBRIEF FORM (4 inspo tiles drop in, swatches bloom, send)
// ─────────────────────────────────────────────────────────────────────────
const S11Brief: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 18], [0, 1]);
  const exit = easeRange(frame, [175, 200], [1, 0]);
  const inspoSrcs = [
    manifest.gallery["amangiri-fireside"],
    manifest.gallery["aspen-tablescape"],
    manifest.gallery["anguilla-sofa"],
    manifest.gallery["birch-lounge"],
  ];
  const swatchColors = ["#E8DFD0", "#C7B6A1", "#8C7A66", "#3F4751", "#1A1A1A"];
  // cursor path (dot)
  const cursorPath = [
    { f: 10, x: 200, y: 200 },
    { f: 40, x: 760, y: 320 }, // drop zone
    { f: 95, x: 760, y: 600 }, // palette
    { f: 140, x: 1280, y: 880 }, // send button
  ];
  const cursorAt = (f: number) => {
    for (let i = 0; i < cursorPath.length - 1; i++) {
      const a = cursorPath[i], b = cursorPath[i + 1];
      if (f >= a.f && f <= b.f) {
        const p = (f - a.f) / (b.f - a.f);
        const e = ease(p);
        return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
      }
    }
    if (f < cursorPath[0].f) return cursorPath[0];
    return cursorPath[cursorPath.length - 1];
  };
  const cursor = cursorAt(frame);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      {/* Browser chrome bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40, background: "#f5f5f3", borderBottom: "1px solid rgba(26,26,26,0.08)", display: "flex", alignItems: "center", paddingLeft: 96, ...labelStyle(9, "rgba(26,26,26,0.55)") }}>
        ECLECTICHIVE.COM/STYLEBRIEF
      </div>
      {/* Header */}
      <div style={{ position: "absolute", top: 80, left: 96, ...displayStyle(42) }}>
        Build a style brief.
      </div>
      <div style={{ position: "absolute", top: 148, left: 96, ...labelStyle(10, "rgba(26,26,26,0.55)") }}>
        DROP IMAGES · PICK A PALETTE · PIN PRODUCTS · SEND
      </div>
      {/* Drop zone */}
      <div style={{ position: "absolute", top: 200, left: 96, right: 96, height: 280, border: "1px dashed rgba(26,26,26,0.35)", padding: 24, display: "flex", gap: 16 }}>
        {inspoSrcs.map((src, i) => {
          const dropAt = 40 + i * 8;
          const op = easeRange(frame, [dropAt, dropAt + 14], [0, 1]);
          const ty = easeRange(frame, [dropAt, dropAt + 14], [40, 0]);
          return (
            <div key={i} style={{ flex: 1, overflow: "hidden", opacity: op, transform: `translateY(${ty}px)` }}>
              <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 178, left: 96, zIndex: 5, background: WHITE, padding: "0 8px", ...labelStyle(9, "rgba(26,26,26,0.5)") }}>
        01 INSPO
      </div>
      {/* Palette */}
      <div style={{ position: "absolute", top: 520, left: 96, ...labelStyle(9, "rgba(26,26,26,0.45)") }}>
        02 PALETTE — DETECTED
      </div>
      <div style={{ position: "absolute", top: 552, left: 96, right: 96, display: "flex", gap: 20 }}>
        {swatchColors.map((c, i) => {
          const at = 95 + i * 6;
          const sc = easeRange(frame, [at, at + 18], [0, 1]);
          return (
            <div key={i} style={{ flex: 1, height: 96, background: c, transform: `scaleY(${sc})`, transformOrigin: "top", display: "flex", alignItems: "flex-end", padding: 8 }}>
              <span style={{ ...labelStyle(8, i > 2 ? "rgba(255,255,255,0.7)" : "rgba(26,26,26,0.7)") }}>{c.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
      {/* Send button */}
      <div style={{
        position: "absolute",
        bottom: 80,
        left: 96,
        right: 96,
        height: 72,
        background: CHARCOAL,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${1 + (frame > 140 && frame < 156 ? 0.012 * Math.sin(((frame - 140) / 16) * Math.PI) : 0)})`,
        ...labelStyle(12, WHITE),
      }}>
        SEND BRIEF →
      </div>
      {/* Cursor dot */}
      <div style={{
        position: "absolute",
        left: cursor.x - 6,
        top: cursor.y - 6,
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: CHARCOAL,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        zIndex: 60,
      }} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S12 — SUBMIT BURST
// ─────────────────────────────────────────────────────────────────────────
const S12Submit: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 8], [0, 1]);
  const exit = easeRange(frame, [55, 70], [1, 0]);
  const flashOp = easeRange(frame, [0, 6], [1, 0]);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      <AbsoluteFill style={{ background: WHITE, opacity: flashOp }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ ...labelStyle(11, "rgba(26,26,26,0.55)"), opacity: easeRange(frame, [10, 25], [0, 1]) }}>
          ✓ BRIEF RECEIVED
        </div>
        <div style={{ ...displayStyle(56), opacity: easeRange(frame, [15, 35], [0, 1]) }}>
          Within 24 hours.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S13 — CATEGORY MOSAIC (15 covers, all categories)
// ─────────────────────────────────────────────────────────────────────────
const S13Covers: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 12], [0, 1]);
  const exit = easeRange(frame, [40, 50], [1, 0]);
  return (
    <AbsoluteFill style={{ background: WHITE, opacity: opacity * exit }}>
      <div style={{ position: "absolute", inset: "60px 80px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridAutoRows: "1fr", gap: 6 }}>
        {manifest.covers.slice(0, 15).map((c, i) => {
          const delay = i * 1.2;
          const op = easeRange(frame, [delay, delay + 12], [0, 1]);
          const ty = easeRange(frame, [delay, delay + 12], [16, 0]);
          return (
            <div key={c.name} style={{ position: "relative", opacity: op, transform: `translateY(${ty}px)`, overflow: "hidden", background: "#f5f5f3" }}>
              <Img src={staticFile(c.file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(26,26,26,0.18)" }} />
              <div style={{ position: "absolute", bottom: 10, left: 12, ...labelStyle(9, WHITE) }}>
                {c.name.replace(/-/g, " ").toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// S14 — LOCKUP
// ─────────────────────────────────────────────────────────────────────────
const S14Lockup: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = easeRange(frame, [0, 8], [0, 1]);
  const fadeOut = easeRange(frame, [26, 30], [1, 0]);
  const wordY = easeRange(frame, [0, 14], [20, 0]);
  return (
    <AbsoluteFill style={{ background: CHARCOAL, opacity: opacity * fadeOut }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ ...displayStyle(96, WHITE), transform: `translateY(${wordY}px)`, letterSpacing: "0.18em" }}>
          ECLECTIC HIVE
        </div>
        <div style={{ width: 240, height: 1, background: SAND, opacity: easeRange(frame, [8, 18], [0, 1]) }} />
        <div style={{ ...labelStyle(13, SAND), opacity: easeRange(frame, [10, 22], [0, 1]) }}>
          RENTAL · STAGING · DESIGN
        </div>
        <div style={{ ...labelStyle(10, "rgba(212,205,196,0.6)"), opacity: easeRange(frame, [14, 24], [0, 1]), marginTop: 24 }}>
          ECLECTICHIVE.COM
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// OPENING HAIRLINE + CLOSING HAIRLINE (signature bookend)
// ─────────────────────────────────────────────────────────────────────────
const Hairline: React.FC<{ at: number; reverse?: boolean; dark?: boolean }> = ({ at, reverse, dark }) => {
  const frame = useCurrentFrame();
  const p = easeRange(frame, [at, at + 18], [0, 1]);
  if (p === 0) return null;
  return (
    <div style={{
      position: "absolute",
      top: "50%",
      left: "12%",
      right: "12%",
      height: 1,
      background: dark ? "rgba(255,255,255,0.55)" : CHARCOAL,
      transformOrigin: reverse ? "right center" : "left center",
      transform: `scaleX(${p})`,
      zIndex: 40,
    }} />
  );
};

// ─────────────────────────────────────────────────────────────────────────
// FILM GRAIN OVERLAY (subtle, persistent)
// ─────────────────────────────────────────────────────────────────────────
const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  // Cycle through 3 grain phases for movement
  const phase = frame % 3;
  return (
    <AbsoluteFill style={{
      pointerEvents: "none",
      opacity: 0.06,
      mixBlendMode: "overlay",
      zIndex: 200,
      backgroundImage: `radial-gradient(circle at ${20 + phase * 7}% ${30 + phase * 11}%, rgba(255,255,255,0.4) 1px, transparent 1.5px), radial-gradient(circle at ${70 - phase * 5}% ${60 + phase * 4}%, rgba(0,0,0,0.4) 1px, transparent 1.5px)`,
      backgroundSize: "3px 3px, 4px 4px",
    }} />
  );
};

// ─────────────────────────────────────────────────────────────────────────
// CHAPTER COUNTER (bottom-right tabular nums)
// ─────────────────────────────────────────────────────────────────────────
const Chapter: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const sec = (frame / fps).toFixed(2);
  const total = (durationInFrames / fps).toFixed(2);
  return (
    <div style={{
      position: "absolute",
      bottom: 24,
      right: 32,
      ...labelStyle(9, "rgba(0,0,0,0.4)"),
      zIndex: 100,
      mixBlendMode: "difference",
      color: "rgba(255,255,255,0.5)",
    }}>
      {sec} / {total}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// COMPOSITION ROOT
// ─────────────────────────────────────────────────────────────────────────
export const SiteReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: WHITE, fontFamily: BODY }}>
      <Sequence from={T.S01_INVITE[0]} durationInFrames={T.S01_INVITE[1] - T.S01_INVITE[0]}><S01Invitation /></Sequence>
      <Sequence from={T.S02_HOME[0]}   durationInFrames={T.S02_HOME[1]   - T.S02_HOME[0]}><S02Home /></Sequence>
      <Sequence from={T.S03_GRID[0]}   durationInFrames={T.S03_GRID[1]   - T.S03_GRID[0]}><S03GridConstruct /></Sequence>
      <Sequence from={T.S04_ARCHIVE[0]}durationInFrames={T.S04_ARCHIVE[1]- T.S04_ARCHIVE[0]}><S04Archive /></Sequence>
      <Sequence from={T.S05_TONAL[0]}  durationInFrames={T.S05_TONAL[1]  - T.S05_TONAL[0]}><S05Tonal /></Sequence>
      <Sequence from={T.S06_MACRO[0]}  durationInFrames={T.S06_MACRO[1]  - T.S06_MACRO[0]}><S06Macro /></Sequence>
      <Sequence from={T.S07_SWATCH[0]} durationInFrames={T.S07_SWATCH[1] - T.S07_SWATCH[0]}><S07Swatch /></Sequence>
      <Sequence from={T.S08_ATELIER[0]}durationInFrames={T.S08_ATELIER[1]- T.S08_ATELIER[0]}><S08Atelier /></Sequence>
      <Sequence from={T.S09_SKETCH[0]} durationInFrames={T.S09_SKETCH[1] - T.S09_SKETCH[0]}><S09Sketch /></Sequence>
      <Sequence from={T.S10_GALLERY[0]}durationInFrames={T.S10_GALLERY[1]- T.S10_GALLERY[0]}><S10Gallery /></Sequence>
      <Sequence from={T.S11_BRIEF[0]}  durationInFrames={T.S11_BRIEF[1]  - T.S11_BRIEF[0]}><S11Brief /></Sequence>
      <Sequence from={T.S12_SUBMIT[0]} durationInFrames={T.S12_SUBMIT[1] - T.S12_SUBMIT[0]}><S12Submit /></Sequence>
      <Sequence from={T.S13_COVERS[0]} durationInFrames={T.S13_COVERS[1] - T.S13_COVERS[0]}><S13Covers /></Sequence>
      <Sequence from={T.S14_LOCKUP[0]} durationInFrames={T.S14_LOCKUP[1] - T.S14_LOCKUP[0]}><S14Lockup /></Sequence>

      {/* Persistent overlays */}
      <Hairline at={60} dark />          {/* opening hairline over invitation */}
      <Hairline at={1572} reverse dark />{/* closing hairline over lockup */}
      <FilmGrain />
      <Chapter />
    </AbsoluteFill>
  );
};
