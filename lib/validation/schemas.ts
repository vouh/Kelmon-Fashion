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
  dropPoint: requiredText("Drop point", 160),
  campus: optionalText(120),
  payment: z.enum(["mpesa", "cod"], { message: "Choose M-Pesa or cash on delivery." }),
  notes: optionalText(1000),
  lines: z
    .array(cartLineSchema)
    .min(1, "Your cart is empty.")
    .max(50, "That is too many items for one order."),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Admin road sale. No user, no cart — a single total typed by the admin. */
export const directOrderSchema = z.object({
  customerName: requiredText("Customer name", 120),
  phone: phoneSchema,
  dropPoint: requiredText("Drop point", 160),
  total: money("Total").refine((value) => value > 0, "Total must be greater than zero."),
  notes: optionalText(1000),
});

// ── Products ────────────────────────────────────────────────────────────────

export const productInputSchema = z
  .object({
    id: productSlugSchema,
    name: requiredText("Product name", 160),
    description: optionalText(2000),
    price: money("Price").refine((value) => value > 0, "Price must be greater than zero."),
    originalPrice: money("Original price").nullable().optional(),
    category: requiredText("Category", 60),
    images: z.array(imageUrlSchema).max(12, "At most 12 images per product."),
    sizes: z.array(z.string().trim().min(1).max(40)).max(24),
    colors: z.array(z.string().trim().min(1).max(40)).max(24),
    stock: z
      .number({ message: "Stock must be a number." })
      .int("Stock must be a whole number.")
      .nonnegative("Stock cannot be negative."),
    badge: z.enum(["New", "Hot", "Sale"]).nullable().optional(),
    active: z.boolean(),
  })
  // Mirrors the products_original_price_higher CHECK, so the message is about a
  // "was" price rather than a constraint name.
  .refine(
    (input) => !input.originalPrice || input.originalPrice >= input.price,
    {
      path: ["originalPrice"],
      message: "Original price must be higher than the sale price.",
    }
  );

export type ProductInput = z.infer<typeof productInputSchema>;

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

export const reviewInputSchema = z.object({
  productId: productSlugSchema,
  rating: z
    .number({ message: "Rating is required." })
    .int("Rating must be a whole number.")
    .min(1, "Rating must be between 1 and 5.")
    .max(5, "Rating must be between 1 and 5."),
  body: optionalText(2000),
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
