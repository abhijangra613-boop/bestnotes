// ============================================================
// BestNotes — Netlify Function: create-order
//
// Called by: frontend (app.js) when user clicks Buy Now
// Does:      Creates a Razorpay order server-side
// Returns:   { orderId, amount, currency, keyId }
//
// NEVER touches product IDs, PDF paths, or drive links.
// It only knows the amount (sent by the frontend).
// ============================================================

const https = require("https");

console.log("=== CREATE ORDER V3 ===");

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { amount, currency = "INR", receipt } = body;

  // Validate amount
  if (!amount || typeof amount !== "number" || amount <= 0 || amount > 100000) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid amount" }) };
  }

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("Razorpay credentials not set in environment variables");
    return { statusCode: 500, body: JSON.stringify({ error: "Payment service not configured" }) };
  }

  // Build Basic Auth header for Razorpay API
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // Razorpay expects amount in paise (₹1 = 100 paise)
  const orderPayload = JSON.stringify({
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  });

  // Call Razorpay Orders API
  const razorpayResponse = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.razorpay.com",
        path: "/v1/orders",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
          "Content-Length": Buffer.byteLength(orderPayload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            reject(new Error("Failed to parse Razorpay response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(orderPayload);
    req.end();
  });

  if (razorpayResponse.status !== 200) {
    console.error("Razorpay order creation failed:", razorpayResponse.body);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Failed to create payment order. Please try again." }),
    };
  }

  const order = razorpayResponse.body;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId:  order.id,
      amount:   order.amount,       // paise
      currency: order.currency,
      keyId,                        // safe to expose — it's the public key
    }),
  };
};
