// ============================================================
// BestNotes — Netlify Function: verify-payment
//
// Called by: frontend after Razorpay Checkout succeeds
// Does:      Verifies the Razorpay payment signature (HMAC-SHA256)
// Returns:   { verified: true } or { verified: false, error }
//
// SECURITY:
//   - RAZORPAY_KEY_SECRET never leaves this function
//   - Signature verification is done server-side with crypto
//   - If verified, frontend handles its own download (it already
//     knows the pdf path from products-data.js — the backend
//     never needs to know product IDs or file paths)
// ============================================================

const crypto = require("crypto");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  // All three fields are required
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ verified: false, error: "Missing payment fields" }),
    };
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("RAZORPAY_KEY_SECRET not set");
    return { statusCode: 500, body: JSON.stringify({ verified: false, error: "Server config error" }) };
  }

  // Razorpay signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  const sigBuffer      = Buffer.from(razorpay_signature,    "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  let verified = false;
  if (
    sigBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    verified = true;
  }

  if (!verified) {
    console.warn("Signature mismatch — possible tampered payment:", {
      razorpay_order_id,
      razorpay_payment_id,
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: false, error: "Payment signature invalid" }),
    };
  }

  // Verified — return success. Frontend handles what to download.
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verified: true }),
  };
};
