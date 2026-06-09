import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
      // Reset to a known value; if assignment is rejected it stays this.
      colorCtx.fillStyle = "rgba(0,0,0,0)";
      colorCtx.fillStyle = value;
      result = colorCtx.fillStyle as string;
    }
  } catch {
    /* leave value untouched if it cannot be parsed */
  }
  colorCache.set(value, result);
  return result;
};

const MODERN_COLOR_RE = /oklch|oklab|\blab\(|\blch\(|\bcolor\(/i;

// Temporarily pin every modern-color-function CSS custom property defined on
// :root to a plain rgb equivalent. html2canvas clones the whole document into
// an iframe and re-resolves these variables, so they must be rgb on the live
// root for the duration of the capture. Returns a restore function.
const pinRootColorsToRgb = (): (() => void) => {
  const root = document.documentElement;
  const rootStyle = window.getComputedStyle(root);
  const restores: Array<() => void> = [];

  for (let i = 0; i < rootStyle.length; i++) {
    const name = rootStyle[i];
    if (!name.startsWith("--")) continue;
    const value = rootStyle.getPropertyValue(name).trim();
    if (!MODERN_COLOR_RE.test(value)) continue;
    const rgb = toRgb(value);
    if (!rgb || MODERN_COLOR_RE.test(rgb)) continue;
    const prev = root.style.getPropertyValue(name);
    const prevPriority = root.style.getPropertyPriority(name);
    root.style.setProperty(name, rgb, "important");
    restores.push(() => {
      if (prev) root.style.setProperty(name, prev, prevPriority);
      else root.style.removeProperty(name);
    });
  }

  return () => restores.forEach((fn) => fn());
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

  document.body.appendChild(clone);

  // Resolve all oklch/lab CSS variables to rgb on the live document root so the
  // iframe html2canvas builds never encounters an unsupported color function.
  const restoreColors = pinRootColorsToRgb();

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
    restoreColors();
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
