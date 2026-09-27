const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE = "https://api.safaricom.co.ke";

function getBaseUrl(): string {
  return process.env.MPESA_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

function getCredentials() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackUrl) {
    return null;
  }

  return { consumerKey, consumerSecret, shortcode, passkey, callbackUrl };
}

export function isMpesaConfigured(): boolean {
  return getCredentials() !== null;
}

export function normalizeKenyanPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return null;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function password(shortcode: string, passkey: string, ts: string): string {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

export async function getMpesaAccessToken(): Promise<string> {
  const creds = getCredentials();
  if (!creds) throw new Error("M-Pesa is not configured");

  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64");
  const res = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`M-Pesa OAuth failed: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
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
  if (!creds) throw new Error("M-Pesa is not configured");

  const normalized = normalizeKenyanPhone(params.phone);
  if (!normalized) throw new Error("Invalid phone number");

  const ts = timestamp();
  const token = await getMpesaAccessToken();

  const body = {
    BusinessShortCode: creds.shortcode,
    Password: password(creds.shortcode, creds.passkey, ts),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(params.amount),
    PartyA: normalized,
    PartyB: creds.shortcode,
    PhoneNumber: normalized,
    CallBackURL: creds.callbackUrl,
    AccountReference: params.accountReference ?? params.orderId.slice(0, 12),
    TransactionDesc: `Kelmon order ${params.orderId}`,
  };

  const res = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.errorMessage ?? data.error ?? JSON.stringify(data));
  }

  return data as StkPushResult;
}
