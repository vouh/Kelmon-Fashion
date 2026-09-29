import { IMPORT_FIELDS } from "@/lib/product-import";

/**
 * Builds the product import guide as a branded PDF and downloads it. Loaded
 * on demand from the import dialog, so jsPDF only ships when it's used.
 * Uses plain ASCII punctuation: the built-in PDF fonts can't draw every
 * Unicode character.
 */

const PURPLE: [number, number, number] = [142, 68, 173];
const DEEP: [number, number, number] = [43, 19, 64];
const GOLD: [number, number, number] = [197, 160, 89];
const INK: [number, number, number] = [40, 20, 54];
const MUTED: [number, number, number] = [110, 96, 122];

const TIPS = [
  "Save the file as CSV (.csv) or Excel Workbook (.xlsx). Old .xls files aren't supported - in Excel use File > Save As > Excel Workbook.",
  "Up to 500 products per file.",
  "Columns can be in any order. Capitals, spaces and punctuation in the headings don't matter.",
  "Columns the importer doesn't recognise are ignored, and so are empty rows.",
  "Before anything is saved you see a preview. Rows with a problem (for example an unknown category or a missing price) are skipped; the rest are imported.",
  "Photos can't go in a spreadsheet. After importing, open each product, add its photos and press Publish to show it in the shop.",
];

async function loadLogo(): Promise<{ data: string; ratio: number } | null> {
  try {
    const blob = await (await fetch("/email/kelmon-logo-light.png")).blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const ratio = await new Promise<number>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
      img.onerror = reject;
      img.src = data;
    });
    return { data, ratio };
  } catch {
    return null;
  }
}

export async function downloadImportGuide(categories: string[]) {
  const [{ jsPDF }, { autoTable }, logo] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadLogo(),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Header band: white logo on deep plum, with a gold rule.
  doc.setFillColor(...DEEP);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 34, pageWidth, 1.2, "F");
  if (logo) {
    const height = 17;
    doc.addImage(logo.data, "PNG", margin, 8.5, height * logo.ratio, height);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("Kelmon", margin, 21);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("Product import guide", pageWidth - margin, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(234, 210, 161);
  doc.text("How to fill in the products spreadsheet", pageWidth - margin, 23, { align: "right" });

  let y = 47;
  doc.setTextColor(...INK);
  doc.setFontSize(10.5);
  const intro = doc.splitTextToSize(
    "Put one product per row, with these column headings in the first row. Imported products are saved unpublished and without photos - then open each one to add photos and publish it. Each product gets its product code (e.g. P002) straight away.",
    contentWidth
  );
  doc.text(intro, margin, y);
  y += intro.length * 5 + 3;

  const heading = (text: string) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...PURPLE);
    doc.text(text, margin, y);
    y += 3;
  };

  const tableStyles = {
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.6, textColor: INK, lineColor: [230, 220, 238] as [number, number, number], lineWidth: 0.2 },
    headStyles: { fillColor: PURPLE, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: [248, 244, 251] as [number, number, number] },
    margin: { left: margin, right: margin },
  };

  heading("The columns");
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Column", "Required?", "What to put", "Example"]],
    body: IMPORT_FIELDS.map((f) => [
      f.header,
      f.required ? "Required" : "Optional",
      f.key === "category" && categories.length
        ? `${f.help}\nYour categories: ${categories.join(", ")}`
        : f.help,
      f.example || "-",
    ]),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 26 }, 1: { cellWidth: 21 }, 3: { cellWidth: 36 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const required = data.cell.raw === "Required";
        data.cell.styles.textColor = required ? [192, 57, 43] : MUTED;
        data.cell.styles.fontStyle = required ? "bold" : "normal";
      }
    },
  });
  y = lastY() + 10;

  heading("Other headings that work");
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [["Column", "Also accepted"]],
    body: IMPORT_FIELDS.map((f) => [f.header, f.alsoAccepted.join(", ")]),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 26 } },
  });
  y = lastY() + 10;

  heading("Example");
  autoTable(doc, {
    ...tableStyles,
    startY: y,
    head: [IMPORT_FIELDS.map((f) => f.header)],
    body: [
      IMPORT_FIELDS.map((f) => f.example),
      ["Leather tote", "4200", "3", categories.find((c) => /bag/i.test(c)) ?? "Bags", "Ladies", "Roomy everyday tote", "", "", "Black, Brown"],
    ],
    styles: { ...tableStyles.styles, fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { ...tableStyles.headStyles, fontSize: 7.5 },
  });
  y = lastY() + 10;

  heading("Good to know");
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  for (const tip of TIPS) {
    const lines = doc.splitTextToSize(tip, contentWidth - 6);
    if (y + lines.length * 4.6 > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(...PURPLE);
    doc.circle(margin + 1.2, y - 1.2, 0.9, "F");
    doc.text(lines, margin + 5, y);
    y += lines.length * 4.6 + 2;
  }

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(230, 220, 238);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Kelmon - Beauty, Fashion, Glamour  |  Updated ${generated}`, margin, pageHeight - 7);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  doc.save("kelmon-product-import-guide.pdf");
}
