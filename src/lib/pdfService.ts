import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  // Remove forced white background to allow the component's background to persist

  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 3, // Increased scale for better color accuracy and detail
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: null, // Transparent background to keep element's color
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
