import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Properties whose computed value may be authored in oklch/lab, which
// html2canvas cannot parse. We resolve them to rgb(...) by reading the
// computed style from the live DOM (browsers serialize these as rgb).
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
] as const;

const inlineResolvedColors = (source: Element, target: Element) => {
  const computed = window.getComputedStyle(source);
  const targetEl = target as HTMLElement;
  for (const prop of COLOR_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (value) {
      targetEl.style.setProperty(prop, value);
    }
  }

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length; i++) {
    if (targetChildren[i]) {
      inlineResolvedColors(sourceChildren[i], targetChildren[i]);
    }
  }
};

const createCanvasFromElement = async (
  elementId: string,
): Promise<HTMLCanvasElement | null> => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) return null;

  const clone = originalElement.cloneNode(true) as HTMLElement;

  // Copy resolved (rgb) colors so html2canvas never sees oklch/lab.
  inlineResolvedColors(originalElement, clone);

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

  try {
    const canvas = await html2canvas(clone, {
      scale: 3,
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
  if (!canvas) return;

  try {
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;

    const imgData = canvas.toDataURL("image/png", 1.0);

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

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
  if (!canvas) return;

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
