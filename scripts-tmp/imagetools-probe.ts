// Build-verification probe for vite-imagetools.
// Imported by a temporary route so the bundler actually exercises the
// `?preset=hero` pipeline. Deleted after verification.
import hero from "@/assets/hero-desert.jpg?preset=hero";

export const probe = hero;
export default hero;
