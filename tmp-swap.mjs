import { framedCoverSrc600, framedCoverSrcSet } from './src/lib/cover-framed.ts';
const a='https://x/framed-covers/1770/abc123-1200.webp';
const b='https://x/incoming-photos/BROOKLYN%20Sofa%201.png';
console.log(framedCoverSrc600(a), '|', framedCoverSrcSet(a));
console.log(framedCoverSrc600(b) === b, framedCoverSrcSet(b));
