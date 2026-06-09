import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Color-related CSS properties that may carry modern color functions
// (lab/oklch/lch/color()) which html2canvas cannot parse.
const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
  "caret-color",
  "column-rule-color",
] as const;

// A single reusable canvas context normalizes ANY valid CSS color string
// (including lab/oklch/lch/color()) into a plain rgb/rgba string.
let colorCtx: CanvasRenderingContext2D | null = null;
const colorCache = new Map<string, string>();

const toRgb = (value: string): string => {
  if (!value) return value;
  const cached = colorCache.get(value);
  if (cached) return cached;
  if (!colorCtx) {
    colorCtx = document.createElement("canvas").getContext("2d");
  }
  let result = value;
  try {
    if (colorCtx) {
      colorCtx.fillStyle = "#000";
      colorCtx.fillStyle = value;
      result = colorCtx.fillStyle as string;
    }
  } catch {
    /* leave value untouched if it cannot be parsed */
  }
  colorCache.set(value, result);
  return result;
};

// Walk the original tree (with live computed styles) and the cloned tree in
// parallel, copying resolved rgb color values onto the clone as inline styles.
const inlineResolvedColors = (source: Element, target: Element) => {
  const sourceEls = [source, ...Array.from(source.querySelectorAll("*"))];
  const targetEls = [target, ...Array.from(target.querySelectorAll("*"))];

  for (let i = 0; i < sourceEls.length; i++) {
    const srcEl = sourceEls[i];
    const tgtEl = targetEls[i] as HTMLElement | undefined;
    if (!tgtEl) continue;
    const computed = window.getComputedStyle(srcEl);
    for (const prop of COLOR_PROPS) {
      const raw = computed.getPropertyValue(prop);
      if (!raw) continue;
      const rgb = toRgb(raw.trim());
      if (rgb) tgtEl.style.setProperty(prop, rgb);
    }
  }
};

const createCanvasFromElement = async (
  elementId: string,
): Promise<HTMLCanvasElement | null> => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return null;

  // Clone to handle capture without UI interference
  const clone = originalElement.cloneNode(true) as HTMLElement;

  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.zIndex = "-1000";
  clone.style.transform = "none";
  clone.style.width = "210mm";
  clone.style.margin = "0";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";

  // Resolve all root CSS custom properties (e.g. --border, --background defined
  // in oklch by Tailwind v4) to rgb and pin them on the clone so any cascading
  // var(--x) — including ::before/::after pseudo-elements — renders as rgb.
  const rootStyle = window.getComputedStyle(document.documentElement);
  for (let i = 0; i < rootStyle.length; i++) {
    const name = rootStyle[i];
    if (!name.startsWith("--")) continue;
    const value = rootStyle.getPropertyValue(name).trim();
    if (/oklch|oklab|\blab\(|\blch\(|color\(/i.test(value)) {
      clone.style.setProperty(name, toRgb(value));
    }
  }

  document.body.appendChild(clone);

  // Resolve all element colors to rgb so html2canvas never sees lab()/oklch().
  inlineResolvedColors(originalElement, clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 3, // High scale for crisp output
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: null,
    });
    return canvas;
  } catch (error) {
    console.error("Error creating canvas:", error);
    return null;
  } finally {
    document.body.removeChild(clone);
  }
};

export const generatePDF = async (elementId: string, fileName: string) => {
  const canvas = await createCanvasFromElement(elementId);
  if (!canvas) {
    alert("Failed to generate PDF. Please try again.");
    return;
  }

  try {
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;

    // Use PNG for lossless color fidelity
    const imgData = canvas.toDataURL("image/png", 1.0);

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add subsequent pages only if content significantly overflows A4 height
    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Check if the document is too large.");
  }
};

export const generatePNG = async (elementId: string, fileName: string) => {
  const canvas = await createCanvasFromElement(elementId);
  if (!canvas) {
    alert("Failed to generate PNG. Please try again.");
    return;
  }

  try {
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error generating PNG:", error);
  }
};
