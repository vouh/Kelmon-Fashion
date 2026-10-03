import { z } from "zod";

/**
 * Zod schemas for every untrusted boundary: request bodies and Server Action
 * inputs.
 *
 * What this is for, and what it is not for. Validation here means a malformed
 * request gets one clear 400 naming the offending field, instead of a 500 from
 * somewhere deeper or — worse — a row written with `undefined` in it. It is a
 * correctness and diagnostics tool.
 *
 * It is **not** the authorisation boundary, and it is not what keeps money
 * honest. Row Level Security decides who may touch which row, and the order
 * route re-prices every line against the `products` table regardless of what
 * these schemas accepted. A valid payload from an unauthorised caller still gets
 * rejected by Postgres. Treat a passing schema as "well-formed", never as
 * "allowed".
 *
 * Server Action inputs are validated too, which is easy to skip because the call
 * looks like a function call in your editor. It isn't — a Server Action is a
 * POST endpoint anyone can invoke with any body.
 */

// ── Shared primitives ───────────────────────────────────────────────────────

/** Trimmed, and required to still have content afterwards. */
const requiredText = (field: string, max = 200) =>
  z
    .string({ message: `${field} is required.` })
    .trim()
    .min(1, `${field} is required.`)
    .max(max, `${field} must be ${max} characters or fewer.`);

/** Trimmed; empty string and absent both become undefined. */
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value ? value : undefined));

/**
 * Kenyan mobile number in any of the shapes a customer might type. Normalised to
 * 2547…/2541…, which is the only form Safaricom accepts.
 */
export const phoneSchema = z
  .string({ message: "Phone number is required." })
  .trim()
  .transform((raw) => raw.replace(/[\s()-]/g, ""))
  .refine(
    (value) => /^(?:\+?254|0)?7\d{8}$/.test(value) || /^(?:\+?254|0)?1\d{8}$/.test(value),
    "Enter a Kenyan mobile number, e.g. 0712345678."
  )
  .transform((value) => {
    const digits = value.replace(/^\+/, "");
    if (digits.startsWith("254")) return digits;
    if (digits.startsWith("0")) return `254${digits.slice(1)}`;
    return `254${digits}`;
  });

/** Money as sent by a client. Non-negative, at most two decimal places. */
const money = (field: string) =>
  z
    .number({ message: `${field} must be a number.` })
    .finite(`${field} must be a number.`)
    .nonnegative(`${field} cannot be negative.`)
    .refine((value) => Number.isInteger(Math.round(value * 100)), {
      message: `${field} cannot have more than two decimal places.`,
    });

/**
 * A product slug: lowercase, digits and single hyphens. Also the primary key and
 * the URL segment, so it is constrained rather than free text.
 */
export const productSlugSchema = z
  .string({ message: "Product slug is required." })
  .trim()
  .min(1, "Product slug is required.")
  .max(80, "Product slug must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens, e.g. lv-speedy-bag."
  );

/** Image URLs are stored on rows, and `next/image` will only load allow-listed hosts. */
const imageUrlSchema = z.string().trim().url("Each image must be a valid URL.");

// ── Auth ────────────────────────────────────────────────────────────────────

/**
 * A JWT is three dot-separated base64url segments. Checking the shape here turns
 * a junk body into a 400 rather than making the Admin SDK do the work first.
 * Signature verification is still the only thing that decides trust.
 */
export const sessionRequestSchema = z.object({
  idToken: z
    .string({ message: "idToken is required." })
    .trim()
    .regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, "idToken is not a JWT."),
});

// ── Orders ──────────────────────────────────────────────────────────────────

/**
 * One cart line as submitted.
 *
 * `price`, `name`, `image` and `category` are accepted and then **ignored** —
 * /api/orders re-reads all of them from the `products` table. They are kept in
 * the schema only so an older client still validates. Never trust them.
 */
export const cartLineSchema = z.object({
  productId: productSlugSchema,
  name: requiredText("Product name"),
  price: money("Price"),
  image: z.string().trim().default(""),
  quantity: z
    .number({ message: "Quantity must be a number." })
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(99, "Quantity cannot exceed 99 per line."),
  variant: optionalText(60),
  category: z.string().trim().default(""),
});

export const createOrderSchema = z.object({
  name: requiredText("Name", 120),
  phone: phoneSchema,
  county: optionalText(60),
  dropPoint: requiredText("Location", 160),
  campus: optionalText(120),
  payment: z.enum(["mpesa", "cod"], { message: "Choose M-Pesa or cash on delivery." }),
  notes: optionalText(1000),
  lines: z
    .array(cartLineSchema)
    .min(1, "Your cart is empty.")
    .max(50, "That is too many items for one order."),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Admin road sale. The optional item is a catalogue product (productId set) or
 * a typed-in one (no productId) to be reconciled later. Admins may override the
 * unit price, so it is taken from the input rather than the products table.
 */
/**
 * An admin-entered order: either sent an STK prompt next, or recorded as
 * already paid (cash, or M-Pesa sent straight to the till). The total is
 * worked out on the server from the lines, never taken from the browser.
 */
export const directOrderSchema = z
  .object({
    customerName: requiredText("Customer name", 120),
    // Optional only for a paid order: a cash buyer may not leave a number.
    phone: phoneSchema.optional(),
    dropPoint: requiredText("Drop point", 160),
    notes: optionalText(1000),
    items: z
      .array(
        z.object({
          productId: productSlugSchema.optional(),
          name: requiredText("Item name", 200),
          variant: optionalText(80),
          price: money("Price").refine((value) => value > 0, "Price must be greater than zero."),
          quantity: z.number().int("Quantity must be a whole number.").min(1).max(99),
        })
      )
      .min(1, "Add at least one item.")
      .max(20, "At most 20 items per order."),
    paid: z
      .object({
        method: z.enum(["mpesa", "cash"], { message: "Choose M-Pesa or cash." }),
        reference: z
          .string()
          .trim()
          .toUpperCase()
          .max(20, "The M-Pesa code is too long.")
          .regex(/^[A-Z0-9]*$/, "The M-Pesa code is letters and numbers only.")
          .optional()
          .transform((value) => (value ? value : undefined)),
      })
      .optional(),
  })
  .refine((order) => order.paid || order.phone, {
    message: "Phone number is required to send an M-Pesa prompt.",
    path: ["phone"],
  });

/**
 * Filling in a quick order later: who the client was, and/or which catalogue
 * products replace its typed-in lines. Either part may be left out.
 */
export const linkOrderSchema = z
  .object({
    userId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid account id.")
      .optional(),
    items: z
      .array(
        z.object({
          productId: productSlugSchema,
          variant: optionalText(80),
          price: money("Price").refine((value) => value > 0, "Price must be greater than zero."),
          quantity: z.number().int("Quantity must be a whole number.").min(1).max(99),
        })
      )
      .min(1, "Pick at least one product.")
      .max(20, "At most 20 items per order.")
      .optional(),
  })
  .refine((link) => link.userId || link.items, { message: "Pick a client or a product to link." });

// ── Products ────────────────────────────────────────────────────────────────

export const productInputSchema = z
  .object({
    id: productSlugSchema,
    name: requiredText("Product name", 160),
    description: optionalText(2000),
    price: money("Price").refine((value) => value > 0, "Price must be greater than zero."),
    originalPrice: money("Original price").nullable().optional(),
    /** What one piece cost the shop. Admin only; never shown in the shop. */
    buyPrice: money("Buying price").nullable().optional(),
    gender: z.enum(["men", "women", "unisex"], { message: "Choose Men, Ladies or Unisex." }),
    category: requiredText("Category", 60),
    // Drafts may have no photos yet (e.g. imported from a spreadsheet); a
    // published product needs at least one — checked below.
    images: z.array(imageUrlSchema).max(4, "At most 4 photos per product."),
    sizes: z.array(z.string().trim().min(1).max(40)).max(24),
    colors: z.array(z.string().trim().min(1).max(40)).max(24),
    /** Colour name → photo. Keys must be one of `colors`; checked below. */
    colorImages: z.record(z.string().trim().min(1).max(40), imageUrlSchema).default({}),
    stock: z
      .number({ message: "Stock must be a number." })
      .int("Stock must be a whole number.")
      .nonnegative("Stock cannot be negative."),
    badge: z.enum(["New", "Hot", "Sale"]).nullable().optional(),
    preorder: z.boolean().default(false),
    active: z.boolean(),
  })
  .refine(
    (input) => Object.keys(input.colorImages).every((color) => input.colors.includes(color)),
    { path: ["colorImages"], message: "Each colour photo must belong to one of the product's colours." }
  )
  .refine((input) => input.buyPrice == null || input.price >= input.buyPrice, {
    path: ["price"],
    message: "The selling price is lower than the buying price. Raise the selling price or correct the buying price.",
  })
  .refine((input) => !input.active || input.images.length > 0, {
    path: ["images"],
    message: "Add at least one photo before publishing. You can save it unpublished for now.",
  })
  // A "was" price only means something above the price. Raising the price to
  // or past it ends the sale, so drop it rather than refusing the edit (the
  // products_original_price_higher CHECK would reject it otherwise).
  .transform((input) => ({
    ...input,
    originalPrice: input.originalPrice && input.originalPrice > input.price ? input.originalPrice : null,
  }));

export type ProductInput = z.input<typeof productInputSchema>;

/**
 * One row of a CSV / Excel product import, after the column names have been
 * matched. Everything arrives as text from a spreadsheet, so numbers and
 * lists are parsed here. Photos are added later in the product form.
 */
/** "KES 2,500", "Ksh 2 500" and "2,500.00" all read as 2500. */
const spreadsheetNumber = (value: unknown) =>
  typeof value === "string" ? value.replace(/kes|ksh|sh|[,\s]/gi, "") : value;

export const productImportRowSchema = z.object({
  name: requiredText("Name", 160),
  price: z.preprocess(
    spreadsheetNumber,
    z.coerce
      .number({ message: "Price must be a number." })
      .positive("Price must be greater than zero.")
      .max(10_000_000, "Price is too large.")
  ),
  quantity: z.preprocess(
    spreadsheetNumber,
    z.coerce
      .number({ message: "Quantity must be a number." })
      .int("Quantity must be a whole number.")
      .min(0, "Quantity cannot be negative.")
      .max(1_000_000, "Quantity is too large.")
  ),
  category: requiredText("Category", 60),
  for: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) =>
      ["men", "man", "male", "him", "gents"].includes(v)
        ? "men"
        : ["women", "woman", "ladies", "lady", "female", "her"].includes(v)
          ? "women"
          : ["unisex", "both", "all", "any", ""].includes(v)
            ? "unisex"
            : null
    )
    .refine((v) => v !== null, "“For” must be Men, Ladies or Unisex.")
    .transform((v) => v as "men" | "women" | "unisex")
    .default("unisex"),
  description: optionalText(2000),
  wasPrice: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : spreadsheetNumber(v)),
    z.coerce.number({ message: "Was price must be a number." }).positive().optional()
  ),
  sizes: z.string().trim().max(500).default(""),
  colors: z.string().trim().max(500).default(""),
});

export type ProductImportRow = z.input<typeof productImportRowSchema>;

// ── Content ─────────────────────────────────────────────────────────────────

export const dealInputSchema = z
  .object({
    title: requiredText("Deal title", 160),
    description: optionalText(1000),
    image: z.union([imageUrlSchema, z.literal("")]).optional(),
    code: optionalText(40),
    discountPercent: z
      .number()
      .int("Discount must be a whole number.")
      .min(1, "Discount must be at least 1%.")
      .max(100, "Discount cannot exceed 100%.")
      .nullable()
      .optional(),
    startsAt: z.string().datetime({ message: "Start date is invalid." }).nullable().optional(),
    endsAt: z.string().datetime({ message: "End date is invalid." }).nullable().optional(),
  })
  // Mirrors the deals_window_valid CHECK.
  .refine(
    (input) => !input.startsAt || !input.endsAt || new Date(input.endsAt) > new Date(input.startsAt),
    { path: ["endsAt"], message: "The end date must be after the start date." }
  );

export const updateInputSchema = z.object({
  title: requiredText("Title", 160),
  body: requiredText("Body", 4000),
  tag: optionalText(40),
});

export const homepageDropInputSchema = z.object({
  id: z.string().uuid("Invalid drop id.").optional(),
  name: requiredText("Drop name", 160),
  price: money("Price"),
  category: requiredText("Category", 60),
  image: imageUrlSchema,
  active: z.boolean(),
  /** Link to an existing product (its slug), or null for a custom card. */
  productId: productSlugSchema.nullable().optional(),
});

export const reviewInputSchema = z.object({
  productId: productSlugSchema,
  rating: z
    .number({ message: "Rating is required." })
    .int("Rating must be a whole number.")
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  body: optionalText(2000),
});

// ── Accounts ────────────────────────────────────────────────────────────────

/** A Firebase uid, which is also profiles.id. */
export const accountIdSchema = z
  .string({ message: "Account id is required." })
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid account id.");

export const accountRoleSchema = z.enum(["customer", "admin", "super_admin"], {
  message: "Choose User, Admin or Super admin.",
});

export const emailSchema = z
  .string({ message: "Email is required." })
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email must be 254 characters or fewer.")
  .email("Enter a valid email address.");

export const inviteAccountSchema = z.object({
  email: emailSchema,
  fullName: optionalText(120),
  role: z.enum(["customer", "admin"], { message: "Choose User or Admin." }),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Flattens a ZodError into one readable sentence.
 *
 * Field paths are included because "Phone number is required" alone is ambiguous
 * on a form with two phone fields. Deliberately terse — these strings are shown
 * to customers, so they must not leak schema internals.
 */
export function formatZodError(error: z.ZodError): string {
  const messages = error.issues.map((issue) => {
    const path = issue.path.filter((part) => typeof part === "string").join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  // De-duplicate: one bad line item in an array can raise the same issue twice.
  return [...new Set(messages)].join(" ");
}

/**
 * Parses untrusted input, returning a result rather than throwing, so callers can
 * turn a failure into a 400 or an `{ ok: false }` without a try/catch.
 */
export function parseInput<T extends z.ZodType>(
  schema: T,
  value: unknown
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const result = schema.safeParse(value);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, error: formatZodError(result.error) };
}
