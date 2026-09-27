const admin = require('firebase-admin');

// ── CORS helper (runs before anything else) ──────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Lazy Firebase init ───────────────────────────────────────────────────────────
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

// Helper: safely pull a value from the Item array returned in CallbackMetadata
function metaValue(items, name) {
  const found = items.find((i) => i.Name === name);
  return found ? found.Value : null;
}

module.exports = async (req, res) => {
  setCors(res);
  // M-Pesa always expects an HTTP 200 as ACK – return it quickly even on errors
  // so Safaricom doesn't keep retrying.

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Ignored' });
  }

  const body = req.body || {};
  const stkCallback = body?.Body?.stkCallback;

  if (!stkCallback) {
    console.error('[callback] Missing stkCallback in body:', JSON.stringify(body));
    // Still ACK so Safaricom doesn't keep retrying
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Received' });
  }

  const {
    CheckoutRequestID,
    MerchantRequestID,
    ResultCode,
    ResultDesc,
    CallbackMetadata,
  } = stkCallback;

  console.log(`[callback] CheckoutRequestID=${CheckoutRequestID} ResultCode=${ResultCode} Desc=${ResultDesc}`);

  try {
    // Look up the order by CheckoutRequestID stored during STK initiation
    const snapshot = await getDb()
      .collection('orders')
      .where('checkoutRequestID', '==', CheckoutRequestID)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn('[callback] No order found for CheckoutRequestID:', CheckoutRequestID);
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK – order not found' });
    }

    const orderDoc = snapshot.docs[0];

    if (ResultCode === 0) {
      // ── Payment SUCCESS ──────────────────────────────────────────────────────
      const items = CallbackMetadata?.Item ?? [];

      await orderDoc.ref.update({
        status: 'paid',
        paymentStatus: 'paid',
        paymentDetails: {
          mpesaReceiptNumber: metaValue(items, 'MpesaReceiptNumber'),
          amount: metaValue(items, 'Amount'),
          transactionDate: String(metaValue(items, 'TransactionDate')),
          phoneNumber: String(metaValue(items, 'PhoneNumber')),
          checkoutRequestID: CheckoutRequestID,
          merchantRequestID: MerchantRequestID,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[callback] Order ${orderDoc.id} → PAID. Receipt: ${metaValue(items, 'MpesaReceiptNumber')}`);
    } else {
      // ── Payment FAILED / CANCELLED → reset to unpaid so user can retry ────────
      await orderDoc.ref.update({
        status: 'pending',
        paymentStatus: 'failed',
        paymentError: ResultDesc,
        paymentResultCode: ResultCode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[callback] Order ${orderDoc.id} → FAILED (${ResultCode}): ${ResultDesc}`);
    }

    // Always ACK to Safaricom
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('[callback] Processing error:', error.message);
    // Still ACK so Safaricom does not endlessly retry
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'ACK' });
  }
};
