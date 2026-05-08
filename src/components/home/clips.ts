// Hero filmstrip clip manifest.
// Videos live in the `videos` Lovable Cloud storage bucket (public read).
// Posters: drop JPGs into /public/media/home/ as 01-poster.jpg … 05-poster.jpg
// (1080×1440, 3:4). Until they exist the frame shows a neutral skeleton.

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/videos`;

export type FilmstripClip = {
  id: string;       // "01" … "05"
  season: string;   // "Spring", "Summer", …
  poster: string;
  src?: { mp4?: string; webm?: string };
  label?: string;   // sr-only caption
  /** Width / height of the source clip. Used to seed the lightbox figure
   *  before video metadata loads, so the zoom-in target matches the real
   *  aspect from frame zero (no letterbox flash). Defaults to 3/4. */
  aspect?: number;
};

// Source clips are portrait phone footage (9:16).
const PORTRAIT = 9 / 16;

export const HERO_CLIPS: FilmstripClip[] = [
  { id: "01", season: "Spring",      poster: "/media/home/01-poster.jpg", label: "Spring",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/01SPRING` } },
  { id: "02", season: "Summer",      poster: "/media/home/02-poster.jpg", label: "Summer",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/02SUMMER` } },
  { id: "03", season: "Late Summer", poster: "/media/home/03-poster.jpg", label: "Late Summer", aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/03LATESUMER` } },
  { id: "04", season: "Autumn",      poster: "/media/home/04-poster.jpg", label: "Autumn",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/04AUTUMN` } },
  { id: "05", season: "Winter",      poster: "/media/home/05-poster.jpg", label: "Winter",      aspect: PORTRAIT, src: { mp4: `${STORAGE_BASE}/05WINTER` } },
];
