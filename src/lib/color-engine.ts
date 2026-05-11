// Client-side color extraction engine using canvas pixel sampling + k-means clustering

export interface ColorInfo {
  r: number;
  g: number;
  b: number;
  hex: string;
  count: number;
  hsl: { h: number; s: number; l: number };
}

export interface ToneAnalysis {
  warm: number;
  cool: number;
  neutral: number;
  light: number;
  dark: number;
  saturated: number;
  muted: number;
}

export interface DesignInsight {
  icon: string;
  title: string;
  text: string;
}

export interface PerImageColors {
  id: string;
  name: string;
  colors: ColorInfo[];
}

export interface AnalysisResult {
  palette: ColorInfo[];
  tones: ToneAnalysis;
  insights: DesignInsight[];
  perImage: PerImageColors[];
}

// --- Color conversion ---

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// --- Pixel sampling ---

function colorDist(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export function samplePixels(img: HTMLImageElement, canvas: HTMLCanvasElement, n = 1500): number[][] {
  const ctx = canvas.getContext('2d')!;
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels: number[][] = [];
  const step = Math.max(4, Math.floor(data.length / (4 * n)));
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 128) continue;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  return pixels;
}

// --- K-Means clustering ---

function kMeans(pixels: number[][], k = 8, iters = 12): ColorInfo[] {
  if (pixels.length < k) {
    return pixels.map(p => {
      const hex = rgbToHex(p[0], p[1], p[2]);
      return { r: p[0], g: p[1], b: p[2], hex, count: 1, hsl: rgbToHsl(p[0], p[1], p[2]) };
    });
  }

  // K-means++ init
  const centers: number[][] = [];
  centers.push(pixels[Math.floor(Math.random() * pixels.length)]);
  while (centers.length < k) {
    let best: number[] | null = null, bestD = 0;
    for (let t = 0; t < 40; t++) {
      const c = pixels[Math.floor(Math.random() * pixels.length)];
      const d = Math.min(...centers.map(x => colorDist(c, x)));
      if (d > bestD) { bestD = d; best = c; }
    }
    centers.push(best || pixels[Math.floor(Math.random() * pixels.length)]);
  }

  const assigns = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < iters; iter++) {
    const clusters: number[][][] = Array.from({ length: k }, () => []);
    pixels.forEach((p, i) => {
      let best = 0, bd = Infinity;
      centers.forEach((c, j) => { const d = colorDist(p, c); if (d < bd) { bd = d; best = j; } });
      assigns[i] = best;
      clusters[best].push(p);
    });
    clusters.forEach((cl, i) => {
      if (!cl.length) return;
      centers[i] = [
        Math.round(cl.reduce((s, p) => s + p[0], 0) / cl.length),
        Math.round(cl.reduce((s, p) => s + p[1], 0) / cl.length),
        Math.round(cl.reduce((s, p) => s + p[2], 0) / cl.length),
      ];
    });
  }

  const counts = new Array(k).fill(0);
  assigns.forEach(a => counts[a]++);

  return centers
    .map((c, i) => ({
      r: c[0], g: c[1], b: c[2],
      hex: rgbToHex(c[0], c[1], c[2]),
      count: counts[i],
      hsl: rgbToHsl(c[0], c[1], c[2]),
    }))
    .sort((a, b) => b.count - a.count);
}

function mergeColors(colors: ColorInfo[], threshold = 35): ColorInfo[] {
  const merged: ColorInfo[] = [];
  colors.forEach(c => {
    const found = merged.find(m => colorDist([c.r, c.g, c.b], [m.r, m.g, m.b]) < threshold);
    if (found) { found.count += c.count; } else merged.push({ ...c });
  });
  return merged.sort((a, b) => b.count - a.count);
}

// --- Tone computation ---

export function computeTones(colors: ColorInfo[]): ToneAnalysis {
  const tones = { warm: 0, cool: 0, neutral: 0, light: 0, dark: 0, saturated: 0, muted: 0 };
  let total = 0;
  colors.forEach(c => {
    const { h, s, l } = c.hsl;
    const w = c.count;
    total += w;
    if (s < 15) tones.neutral += w;
    else if (h < 30 || h > 330) tones.warm += w;
    else if (h >= 170 && h <= 260) tones.cool += w;
    else if ((h >= 30 && h < 60) || (h >= 300 && h < 330)) { tones.warm += w * 0.5; tones.neutral += w * 0.5; }
    else { tones.cool += w * 0.3; tones.warm += w * 0.7; }
    if (l > 62) tones.light += w; else if (l < 35) tones.dark += w;
    if (s > 45) tones.saturated += w; else tones.muted += w;
  });
  const norm = (k: keyof typeof tones) => total ? Math.round(tones[k] / total * 100) : 0;
  return { warm: norm('warm'), cool: norm('cool'), neutral: norm('neutral'), light: norm('light'), dark: norm('dark'), saturated: norm('saturated'), muted: norm('muted') };
}

// --- Insights ---

function styleHint(t: ToneAnalysis): string {
  if (t.warm > 50 && t.muted > 50) return 'Japandi, wabi-sabi, or organic modern';
  if (t.cool > 50 && t.light > 50) return 'Scandinavian, minimalist, or coastal';
  if (t.dark > 45) return 'moody maximalist, Art Deco, or industrial';
  if (t.warm > 50 && t.saturated > 50) return 'Mediterranean, Moroccan, or eclectic';
  if (t.neutral > 40) return 'transitional, contemporary, or classic neutral';
  return 'contemporary mixed';
}

export function generateInsights(palette: ColorInfo[], tones: ToneAnalysis): DesignInsight[] {
  const ins: DesignInsight[] = [];
  const top = palette.slice(0, 5);
  const hues = top.map(c => c.hsl.h);
  const hueSpread = Math.max(...hues) - Math.min(...hues);

  if (hueSpread < 30) ins.push({ icon: '🎨', title: 'Monochromatic', text: 'The palette stays in a tight hue range, creating a cohesive, harmonious feel.' });
  else if (hueSpread < 80) ins.push({ icon: '🎨', title: 'Analogous harmony', text: 'Hues are closely related, suggesting a calm and unified aesthetic.' });
  else ins.push({ icon: '🎨', title: 'Contrast palette', text: 'A wide hue range creates visual tension and energy.' });

  if (tones.warm > 55) ins.push({ icon: '🌅', title: `Warm-dominant (${tones.warm}%)`, text: 'Oranges, reds and yellows suggest comfort, earthiness, or energy.' });
  else if (tones.cool > 55) ins.push({ icon: '🧊', title: `Cool-dominant (${tones.cool}%)`, text: 'Blues and greens evoke calm, freshness, or sophistication.' });
  else ins.push({ icon: '⚖️', title: 'Balanced temperature', text: 'Warm and cool tones balance well, giving versatility.' });

  if (tones.light > 65) ins.push({ icon: '☀️', title: 'Light & airy', text: 'High luminosity suggests a bright, open, Scandinavian or minimalist direction.' });
  else if (tones.dark > 55) ins.push({ icon: '🌑', title: 'Moody & dramatic', text: 'Deep tones suggest a luxurious, editorial, or industrial aesthetic.' });
  else ins.push({ icon: '🌗', title: 'Balanced luminosity', text: 'A mix of lights and darks creates depth and layering.' });

  if (tones.saturated > 60) ins.push({ icon: '💎', title: 'High saturation', text: 'Vivid hues create boldness. Use accent walls, art, or upholstery sparingly.' });
  else if (tones.muted > 70) ins.push({ icon: '🪵', title: 'Muted & desaturated', text: 'Dusty, earthy tones align with organic, artisan, or biophilic interiors.' });

  const hex0 = top[0]?.hex || '#888';
  const hex1 = top[1]?.hex || '#888';
  ins.push({ icon: '🛋', title: 'Suggested pairing', text: `Use ${hex0} as the base wall or floor, and ${hex1} as the dominant furniture or trim tone.` });

  const names = top.map(c => {
    const { h, s, l } = c.hsl;
    if (s < 12) return l > 70 ? 'white/light gray' : 'dark gray/charcoal';
    if (h < 15 || h > 340) return 'red/burgundy';
    if (h < 40) return 'orange/terracotta';
    if (h < 65) return 'yellow/ochre';
    if (h < 140) return 'green/sage';
    if (h < 185) return 'teal/aqua';
    if (h < 260) return 'blue/navy';
    if (h < 290) return 'purple/violet';
    return 'pink/mauve';
  });
  const unique = [...new Set(names)];
  ins.push({ icon: '🏠', title: 'Style direction', text: `${unique.join(', ')} tones commonly appear in ${styleHint(tones)} interiors.` });

  return ins;
}

// --- Main analysis function ---

export async function analyzeMoodboard(
  images: { url: string; name: string; id: string }[],
  canvas: HTMLCanvasElement,
): Promise<AnalysisResult> {
  const allPixels: number[][] = [];
  const perImage: PerImageColors[] = [];

  for (const imgData of images) {
    await new Promise<void>(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const px = samplePixels(img, canvas, 1500);
        allPixels.push(...px);
        const colors = mergeColors(kMeans(px, 6, 10), 40).slice(0, 5);
        perImage.push({ id: imgData.id, name: imgData.name, colors });
        res();
      };
      img.onerror = () => res();
      img.src = imgData.url;
    });
  }

  const combined = mergeColors(kMeans(allPixels, 10, 15), 30).slice(0, 8);
  const tones = computeTones(combined);
  const insights = generateInsights(combined, tones);

  return { palette: combined, tones, insights, perImage };
}
