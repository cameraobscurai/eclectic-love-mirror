// Capture each [data-board-page] element to a canvas and stitch a letter-portrait PDF.
import html2canvas from "html2canvas";
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
    // Wait for every <img> inside this page to fully decode so html2canvas
    // doesn't snapshot empty placeholders.
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
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: getComputedStyle(el).backgroundColor || "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const ratio = canvas.height / canvas.width;
    const renderH = pageW * ratio;
    if (i > 0) pdf.addPage();
    // If page is taller than letter, scale down to fit
    if (renderH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, renderH);
    } else {
      const renderW = pageH / ratio;
      const offsetX = (pageW - renderW) / 2;
      pdf.addImage(imgData, "JPEG", offsetX, 0, renderW, pageH);
    }
  }

  pdf.save(filename);
}
