// Hero filmstrip clip manifest.
// Drop encoded videos into /public/media/home/ and fill in `src.mp4` (+ optional webm).
// Posters should live in /public/media/home/ as well (jpg, 1080×1440, 3:4).
// Until real assets arrive, leaving src empty renders the poster only.

export type FilmstripClip = {
  id: string;       // "01" … "05"
  season: string;   // "Spring", "Summer", …
  poster: string;
  src?: { mp4?: string; webm?: string };
  label?: string;   // sr-only caption
};

export const HERO_CLIPS: FilmstripClip[] = [
  { id: "01", season: "Spring",      poster: "/media/home/01-poster.jpg", label: "Spring" },
  { id: "02", season: "Summer",      poster: "/media/home/02-poster.jpg", label: "Summer" },
  { id: "03", season: "Late Summer", poster: "/media/home/03-poster.jpg", label: "Late Summer" },
  { id: "04", season: "Autumn",      poster: "/media/home/04-poster.jpg", label: "Autumn" },
  { id: "05", season: "Winter",      poster: "/media/home/05-poster.jpg", label: "Winter" },
];
