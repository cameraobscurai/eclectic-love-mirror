// Hero filmstrip clip manifest.
// Videos live in the `videos` Lovable Cloud storage bucket (public read).
// Posters: drop JPGs into /public/media/home/ as 01-poster.jpg … 05-poster.jpg
// (1080×1440, 3:4). Until they exist the frame shows a neutral skeleton.

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/videos`;

export type FilmstripClip = {
  id: string;       // "01" … "05"
  season: string;   // "Spring", "Summer", …
  /** Legacy single-format poster (JPG). Kept for `<video poster>` attribute
   *  which only accepts a single URL. */
  poster: string;
  /** Modern format siblings for `<picture>` source order (AVIF → WebP → JPG). */
  posterAvif?: string;
  posterWebp?: string;
  src?: { mp4?: string; webm?: string };
  label?: string;   // sr-only caption
  /** Width / height of the source clip. Defaults to 3/4. */
  aspect?: number;
};

const posterSet = (id: string) => ({
  poster: `/media/home/${id}-poster.jpg`,
  posterWebp: `/media/home/${id}-poster.webp`,
  posterAvif: `/media/home/${id}-poster.avif`,
});

// Source clips are portrait phone footage (9:16).
const PORTRAIT = 9 / 16;

export const HERO_CLIPS: FilmstripClip[] = [
  { id: "01", season: "Spring",      ...posterSet("01"), label: "Spring",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/01SPRING` } },
  { id: "02", season: "Summer",      ...posterSet("02"), label: "Summer",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/02SUMMER` } },
  { id: "03", season: "Late Summer", ...posterSet("03"), label: "Late Summer", aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/03LATESUMER` } },
  { id: "04", season: "Autumn",      ...posterSet("04"), label: "Autumn",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/04AUTUMN` } },
  { id: "05", season: "Winter",      ...posterSet("05"), label: "Winter",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/05WINTER` } },
];
