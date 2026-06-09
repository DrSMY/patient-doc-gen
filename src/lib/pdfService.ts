import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// Render a DOM element to a high-resolution PNG data URL.
//
// We use html-to-image (SVG <foreignObject> + the browser's native renderer)
// instead of html2canvas because it does NOT parse CSS colors itself. This
// means modern color functions emitted by Tailwind v4 (oklch/lab/lch/color())
// render correctly across Chrome, Safari, Firefox and mobile browsers without
// any color-conversion workarounds.
const renderElementToPng = async (
  elementId: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  const element = document.getElementById(elementId);
  if (!element) return null;

  // Capture the element at its natural (unscaled) size. The preview is wrapped
  // in a CSS transform: scale(...) for layout, which html-to-image would
  // otherwise bake in — so we measure the untransformed box.
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 3, // High-DPI output for crisp text
      width,
      height,
      cacheBust: true,
      // Neutralize the layout scale transform during capture.
      style: {
        transform: "none",
        transformOrigin: "top left",
        margin: "0",
        borderRadius: "0",
        boxShadow: "none",
      },
    });
    return { dataUrl, width, height };
  } catch (error) {
    console.error("Error rendering element to image:", error);
    return null;
  }
};

export const generatePDF = async (elementId: string, fileName: string) => {
  const rendered = await renderElementToPng(elementId);
  if (!rendered) {
    alert("Failed to generate PDF. Please try again.");
    return;
  }

  try {
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (rendered.height * imgWidth) / rendered.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;

    // Add first page
    pdf.addImage(rendered.dataUrl, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add subsequent pages only if content overflows A4 height
    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(rendered.dataUrl, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Check if the document is too large.");
  }
};

export const generatePNG = async (elementId: string, fileName: string) => {
  const rendered = await renderElementToPng(elementId);
  if (!rendered) {
    alert("Failed to generate PNG. Please try again.");
    return;
  }

  try {
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = rendered.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error generating PNG:", error);
  }
};
