/**
 * The columns of a product import spreadsheet. Shared by the import dialog
 * (components/admin/ProductImport.tsx), its CSV template and the PDF guide.
 */

export type ImportField =
  | "name"
  | "price"
  | "quantity"
  | "category"
  | "for"
  | "description"
  | "wasPrice"
  | "sizes"
  | "colors";

export const IMPORT_FIELDS: {
  key: ImportField;
  header: string;
  required: boolean;
  help: string;
  example: string;
  /** Other headings that are read as this column (capitals and spaces don't matter). */
  alsoAccepted: string[];
}[] = [
  { key: "name", header: "name", required: true, help: "Product name as customers see it.", example: "Chanel No.5 Mini", alsoAccepted: ["Product", "Product name", "Item", "Title"] },
  { key: "price", header: "price", required: true, help: "Selling price in KES. \"KES 2,500\" and \"2,500\" also work.", example: "2500", alsoAccepted: ["Price KES", "Selling price", "Amount", "Cost"] },
  { key: "quantity", header: "quantity", required: true, help: "How many are in stock, as a whole number (0 or more).", example: "10", alsoAccepted: ["Qty", "Stock", "Units", "In stock"] },
  { key: "category", header: "category", required: true, help: "Must match one of your categories exactly (capitals don't matter).", example: "Perfumes", alsoAccepted: ["Type", "Categories"] },
  { key: "for", header: "for", required: false, help: "Men, Ladies or Unisex. Blank = Unisex.", example: "Ladies", alsoAccepted: ["Gender", "Who", "Sex", "Audience"] },
  { key: "description", header: "description", required: false, help: "A sentence or two about it.", example: "Classic floral scent, 30ml", alsoAccepted: ["Desc", "Details", "About"] },
  { key: "wasPrice", header: "was price", required: false, help: "Old price, to show it's on sale. Must be higher than price.", example: "3000", alsoAccepted: ["Old price", "Original price", "Was", "Before price"] },
  { key: "sizes", header: "sizes", required: false, help: "Separate with commas, e.g. S, M, L.", example: "", alsoAccepted: ["Size"] },
  { key: "colors", header: "colors", required: false, help: "Separate with commas, e.g. Black, Brown.", example: "", alsoAccepted: ["Colours", "Color", "Colour"] },
];
