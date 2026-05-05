// Type declarations for vite-imagetools imports.
// One module per preset query — keeps call-sites type-safe and refuses
// preset names that aren't wired in vite.config.ts.

declare module "*?preset=hero" {
  /**
   * `as=picture` shape: a `sources` map keyed by MIME type, plus a fallback
   * `img` object. Each source string is a comma-separated `srcset` of
   * generated widths (e.g. "/...-768.avif 768w, /...-1280.avif 1280w, ...").
   */
  const value: {
    sources: Record<string, string>;
    img: { src: string; w: number; h: number };
  };
  export default value;
}

declare module "*?preset=editorial" {
  /** `as=picture` shape — same as hero, smaller width set. */
  const value: {
    sources: Record<string, string>;
    img: { src: string; w: number; h: number };
  };
  export default value;
}

declare module "*?preset=hero-lqip" {
  /**
   * `as=metadata` shape: tiny blurred placeholder. We use `src` as an inline
   * data URL substitute by reading width/height for the wrapper.
   */
  const value: { src: string; width: number; height: number };
  export default value;
}
