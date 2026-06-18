// Capture each [data-board-page] element to a JPEG via html-to-image
// (handles modern CSS color functions like lab()/oklch() that html2canvas
// chokes on), then stitch into a letter-portrait PDF.
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

export async function downloadDeckPDF(
  root: HTMLElement,
  filename = "style-board.pdf",
): Promise<void> {
  const descendants = Array.from(root.querySelectorAll<HTMLElement>("[data-board-page]"));
  const pages = root.matches?.("[data-board-page]") ? [root, ...descendants] : descendants;
  if (pages.length === 0) return;

  // Letter portrait, 8.5 x 11 in @ 72dpi = 612 x 792 pt
  const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];

    // Wait for every <img> inside this page to fully decode so the snapshot
    // doesn't capture empty placeholders.
    const imgs = Array.from(el.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(
      imgs.map((img) =>
        img.decode
          ? img.decode().catch(() => undefined)
          : img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              }),
      ),
    );

    const bg = getComputedStyle(el).backgroundColor || "#ffffff";
    // html-to-image renders the element via foreignObject SVG, which the
    // browser itself rasterizes — modern color spaces just work.
    const dataUrl = await toJpeg(el, {
      quality: 0.92,
      pixelRatio: 2,
      backgroundColor: /^(rgb|#)/i.test(bg) ? bg : "#ffffff",
      cacheBust: true,
      // Skip cross-origin font sheets (Google Fonts) — they throw a
      // SecurityError on cssRules access. The PDF falls back to the system
      // font for that family, which renders cleanly.
      skipFonts: true,
    });

    // Probe dimensions
    const probe = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => reject(new Error("PDF image decode failed"));
      im.src = dataUrl;
    });

    const ratio = probe.h / probe.w;
    const renderH = pageW * ratio;
    if (i > 0) pdf.addPage();
    if (renderH <= pageH) {
      pdf.addImage(dataUrl, "JPEG", 0, 0, pageW, renderH);
    } else {
      const renderW = pageH / ratio;
      const offsetX = (pageW - renderW) / 2;
      pdf.addImage(dataUrl, "JPEG", offsetX, 0, renderW, pageH);
    }
  }

  pdf.save(filename);
}
