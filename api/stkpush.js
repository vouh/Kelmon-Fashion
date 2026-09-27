const axios = require('axios');
const admin = require('firebase-admin');

// ── CORS helper (runs before anything else) ──────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Lazy Firebase init (only when needed, NOT at module load) ────────────────
let db = null;
function getDb() {
  if (!db) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FB_SERVICE_ACCOUNT)),
      });
    }
    db = admin.firestore();
  }
  return db;
}

/**
 * Normalise a phone number to 2547XXXXXXXX format.
 */
function normalisePhone(phone) {
  const str = String(phone).replace(/\s+/g, '').replace(/^\+/, '');
  if (/^0[17]/.test(str)) return '254' + str.slice(1);
  if (/^[17]/.test(str) && str.length === 9) return '254' + str;
  return str;
}

module.exports = async (req, res) => {
  // 1. CORS first — always, even if everything else fails
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, phoneNumber, orderId } = req.body;

  if (!amount || !phoneNumber || !orderId) {
    return res.status(400).json({ error: 'Missing required fields: amount, phoneNumber, orderId' });
  }

  // Round amount to nearest whole KES (M-Pesa requires integer)
  const kes = Math.max(1, Math.round(Number(amount)));
  const phone = normalisePhone(phoneNumber);

  // Validate Safaricom number format
  if (!/^2547\d{8}$/.test(phone) && !/^2541\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number. Use format 07XXXXXXXX or 2547XXXXXXXX.' });
  }

  try {
    // ── 1. Get Access Token ────────────────────────────────────────────────────
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return res.status(500).json({
        error: 'M-Pesa credentials not configured.',
        details: `CONSUMER_KEY=${consumerKey ? 'SET' : 'MISSING'}, CONSUMER_SECRET=${consumerSecret ? 'SET' : 'MISSING'}`,
      });
    }

    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    let accessToken;
    try {
      const tokenResponse = await axios.get(
        'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        console.error('Token response body:', JSON.stringify(tokenResponse.data));
        return res.status(500).json({
          error: 'Safaricom returned empty access token.',
          details: tokenResponse.data,
        });
      }
      console.log('Access token obtained successfully.');
    } catch (tokenErr) {
      console.error('Token generation failed:', tokenErr.response?.data || tokenErr.message);
      return res.status(500).json({
        error: 'Failed to generate M-Pesa access token. Check CONSUMER_KEY and CONSUMER_SECRET.',
        details: tokenErr.response?.data || tokenErr.message,
      });
    }

    // ── 2. Build Password & Timestamp ─────────────────────────────────────────
    // For Till Numbers:
    //   BusinessShortCode = HO / store short code (BusinessShortCode env var)
    //   PartyB            = Till Number            (TILL_NUMBER env var)
    //   TransactionType   = CustomerBuyGoodsOnline
    const businessShortCode = process.env.BusinessShortCode;
    const tillNumber = process.env.TILL_NUMBER;
    const passKey = process.env.MPESA_PASSKEY;
    const domain = process.env.DOMAIN || process.env.VERCEL_URL;

    if (!businessShortCode || !tillNumber || !passKey) {
      throw new Error('M-Pesa config incomplete. Check BusinessShortCode, TILL_NUMBER, MPESA_PASSKEY env vars.');
    }

    // Timestamp format: YYYYMMDDHHmmss  (UTC to avoid DST issues on Vercel)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp =
      now.getUTCFullYear() +
      pad(now.getUTCMonth() + 1) +
      pad(now.getUTCDate()) +
      pad(now.getUTCHours()) +
      pad(now.getUTCMinutes()) +
      pad(now.getUTCSeconds());

    const password = Buffer.from(`${businessShortCode}${passKey}${timestamp}`).toString('base64');

    // ── 3. Initiate STK Push ───────────────────────────────────────────────────
    const callbackURL = `https://${domain}/api/callback`;

    const stkResponse = await axios.post(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerBuyGoodsOnline',
        Amount: kes,
        PartyA: phone,
        PartyB: tillNumber,
        PhoneNumber: phone,
        CallBackURL: callbackURL,
        AccountReference: `EzyBite`,
        TransactionDesc: 'EzyBite Food Order',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { CheckoutRequestID, MerchantRequestID } = stkResponse.data;

    // ── 4. Record CheckoutRequestID on the order ───────────────────────────────
    await getDb().collection('orders').doc(orderId).update({
      checkoutRequestID: CheckoutRequestID,
      merchantRequestID: MerchantRequestID,
      paymentStatus: 'initiated',
      paymentPhone: phone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      ...stkResponse.data,
      message: 'STK push sent. Enter M-Pesa PIN on your phone.',
    });
  } catch (error) {
    const mpesaErr = error.response?.data;
    const statusCode = error.response?.status;
    console.error(`M-Pesa STK Push error (HTTP ${statusCode}):`, JSON.stringify(mpesaErr) || error.message);
    return res.status(500).json({
      error: 'M-Pesa STK push failed',
      details: mpesaErr || error.message,
      hint: statusCode === 404 ? 'Invalid Access Token – CONSUMER_KEY/SECRET may be wrong or expired.' : undefined,
    });
  }
};
