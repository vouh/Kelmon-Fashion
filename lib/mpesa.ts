/**
 * M-Pesa STK Push.
 *
 * Merge of the two implementations that existed in this repo:
 *  - structure, typing and env handling from Kelmon's lib/mpesa.ts
 *  - production hardening from EzyBite's api/stkpush.js, which ran live against
 *    Safaricom: till-number support, UTC timestamps, wider phone validation,
 *    integer amounts, and error responses that say what actually went wrong.
 */

const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE = "https://api.safaricom.co.ke";

/** Safaricom rejects an over-long TransactionDesc, so keep it short. */
const TRANSACTION_DESC_MAX = 60;

function getBaseUrl(): string {
  return process.env.MPESA_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

interface MpesaCredentials {
  consumerKey: string;
  consumerSecret: string;
  /** Head-office / store short code used for the password. */
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  /**
   * Till number, when collecting via Buy Goods rather than Paybill.
   * EzyBite ran on a till: PartyB is the till and the transaction type becomes
   * CustomerBuyGoodsOnline, while the password still uses the short code.
   */
  tillNumber?: string;
  accountReference: string;
}

function getCredentials(): MpesaCredentials | null {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    return null;
  }

  return {
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
    tillNumber: process.env.MPESA_TILL_NUMBER || undefined,
    accountReference: process.env.MPESA_ACCOUNT_REFERENCE || "Kelmon",
  };
}

export function isMpesaConfigured(): boolean {
  return getCredentials() !== null;
}

/** Lists which required env vars are missing, for a useful 503 body. */
export function missingMpesaConfig(): string[] {
  return (
    [
      ["MPESA_CONSUMER_KEY", process.env.MPESA_CONSUMER_KEY],
      ["MPESA_CONSUMER_SECRET", process.env.MPESA_CONSUMER_SECRET],
      ["MPESA_SHORTCODE", process.env.MPESA_SHORTCODE],
      ["MPESA_PASSKEY", process.env.MPESA_PASSKEY],
      ["MPESA_CALLBACK_URL", process.env.MPESA_CALLBACK_URL],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

/**
 * Normalises to 2547XXXXXXXX / 2541XXXXXXXX.
 * Accepts 07…, 01…, +254…, 254…, and bare 9-digit 7…/1… forms.
 */
export function normalizeKenyanPhone(phone: string): string | null {
  const digits = String(phone).replace(/\D/g, "");

  let candidate: string | null = null;
  if (digits.startsWith("254") && digits.length === 12) candidate = digits;
  else if (digits.startsWith("0") && digits.length === 10) candidate = `254${digits.slice(1)}`;
  else if (digits.length === 9 && /^[71]/.test(digits)) candidate = `254${digits}`;

  // Safaricom (2547…) and Airtel (2541…) only.
  if (!candidate || !/^254[71]\d{8}$/.test(candidate)) return null;
  return candidate;
}

/**
 * YYYYMMDDHHmmss in UTC.
 *
 * Deliberately UTC, carried over from api/stkpush.js: the password is derived
 * from this same string, so what matters is that it is deterministic on every
 * host. Using local getters made the value depend on the server's timezone, so
 * a developer machine and a Vercel box produced different passwords.
 */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

function password(shortcode: string, passkey: string, ts: string): string {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

export class MpesaError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
    readonly hint?: string
  ) {
    super(message);
    this.name = "MpesaError";
  }
}

export async function getMpesaAccessToken(): Promise<string> {
  const creds = getCredentials();
  if (!creds) throw new MpesaError("M-Pesa is not configured");

  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64");

  const res = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new MpesaError(
      "Failed to generate M-Pesa access token.",
      text,
      "Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET, and that MPESA_ENV matches the credentials."
    );
  }

  let data: { access_token?: string };
  try {
    data = JSON.parse(text) as { access_token?: string };
  } catch {
    throw new MpesaError("M-Pesa returned a non-JSON token response.", text);
  }

  // Safaricom can answer 200 with an empty token; treat that as a failure.
  if (!data.access_token) {
    throw new MpesaError("Safaricom returned an empty access token.", data);
  }
  return data.access_token;
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateStkPush(params: {
  phone: string;
  amount: number;
  orderId: string;
  accountReference?: string;
}): Promise<StkPushResult> {
  const creds = getCredentials();
  if (!creds) throw new MpesaError("M-Pesa is not configured");

  const normalized = normalizeKenyanPhone(params.phone);
  if (!normalized) {
    throw new MpesaError("Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX.");
  }

  // M-Pesa only accepts whole shillings, and never zero.
  const amount = Math.max(1, Math.round(Number(params.amount)));
  if (!Number.isFinite(amount)) {
    throw new MpesaError("Invalid amount.");
  }

  const ts = timestamp();
  const token = await getMpesaAccessToken();

  // Till => Buy Goods (PartyB is the till); otherwise Paybill (PartyB is the shortcode).
  const usingTill = Boolean(creds.tillNumber);

  const body = {
    BusinessShortCode: creds.shortcode,
    Password: password(creds.shortcode, creds.passkey, ts),
    Timestamp: ts,
    TransactionType: usingTill ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    Amount: amount,
    PartyA: normalized,
    PartyB: usingTill ? creds.tillNumber : creds.shortcode,
    PhoneNumber: normalized,
    CallBackURL: creds.callbackUrl,
    // Safaricom truncates AccountReference at 12 characters.
    AccountReference: (params.accountReference ?? creds.accountReference).slice(0, 12),
    TransactionDesc: `Kelmon order ${params.orderId}`.slice(0, TRANSACTION_DESC_MAX),
  };

  const res = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new MpesaError("M-Pesa returned a non-JSON response.", text);
  }

  if (!res.ok) {
    throw new MpesaError(
      String(data.errorMessage ?? data.error ?? "M-Pesa STK push failed"),
      data,
      res.status === 404
        ? "Invalid access token — MPESA_CONSUMER_KEY/SECRET may be wrong or for the wrong environment."
        : undefined
    );
  }

  return data as unknown as StkPushResult;
}
