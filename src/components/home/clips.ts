// Hero filmstrip clip manifest.
// Drop encoded videos into /public/media/home/ and fill in `src.mp4` (+ optional webm).
// Posters should live in /public/media/home/ as well (jpg, 1080×1440, 3:4).
// Until real assets arrive, leaving src empty renders the poster only.

export type FilmstripClip = {
  id: string;
  poster: string; // path under /public, e.g. "/media/home/01-poster.jpg"
  src?: { mp4?: string; webm?: string };
  label?: string; // sr-only caption
};

export const HERO_CLIPS: FilmstripClip[] = [
  { id: "01", poster: "/media/home/01-poster.jpg", label: "Tablescape detail" },
  { id: "02", poster: "/media/home/02-poster.jpg", label: "Floral install" },
  { id: "03", poster: "/media/home/03-poster.jpg", label: "Lounge vignette" },
  { id: "04", poster: "/media/home/04-poster.jpg", label: "Lighting moment" },
  { id: "05", poster: "/media/home/05-poster.jpg", label: "Reveal" },
];
