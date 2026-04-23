import axios from "axios";

/**
 * bKash Tokenized Checkout integration.
 * Flow:
 *  1. Get grant token (id_token) using app credentials
 *  2. Create payment → returns paymentID + bkashURL (redirect customer)
 *  3. Customer completes on bKash → they redirect back with paymentID + status
 *  4. Execute payment → confirms and gets trxID
 *
 * Credentials come from .env — you need a bKash merchant account.
 * Sandbox: https://tokenized.sandbox.bka.sh/v1.2.0-beta
 * Live:    https://tokenized.pay.bka.sh/v1.2.0-beta
 */

const BASE = () => process.env.BKASH_BASE_URL;

let cachedToken = null;
let tokenExpiry = 0;

// Step 1: Get grant token (valid ~1hr)
const getToken = async () => {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const { data } = await axios.post(
    `${BASE()}/tokenized/checkout/token/grant`,
    {
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    },
    {
      headers: {
        "Content-Type": "application/json",
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
      },
    },
  );

  if (!data.id_token) {
    throw new Error(`bKash token failed: ${data.statusMessage || JSON.stringify(data)}`);
  }

  cachedToken = data.id_token;
  // Refresh 5 min before expiry
  tokenExpiry = Date.now() + (Number(data.expires_in) - 300) * 1000;
  return cachedToken;
};

// Step 2: Create payment
export const bkashCreatePayment = async ({ amount, orderId, callbackURL }) => {
  const token = await getToken();
  const { data } = await axios.post(
    `${BASE()}/tokenized/checkout/create`,
    {
      mode: "0011", // checkout URL mode
      payerReference: orderId,
      callbackURL,
      amount: String(amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: orderId,
    },
    {
      headers: {
        "Content-Type": "application/json",
        authorization: token,
        "x-app-key": process.env.BKASH_APP_KEY,
      },
    },
  );
  return data; // contains paymentID, bkashURL, etc.
};

// Step 3: Execute payment (after customer returns from bKash)
export const bkashExecutePayment = async (paymentID) => {
  const token = await getToken();
  const { data } = await axios.post(
    `${BASE()}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        "Content-Type": "application/json",
        authorization: token,
        "x-app-key": process.env.BKASH_APP_KEY,
      },
    },
  );
  return data; // contains statusCode, transactionStatus, trxID
};

// Query payment status (fallback if execute times out)
export const bkashQueryPayment = async (paymentID) => {
  const token = await getToken();
  const { data } = await axios.post(
    `${BASE()}/tokenized/checkout/payment/status`,
    { paymentID },
    {
      headers: {
        "Content-Type": "application/json",
        authorization: token,
        "x-app-key": process.env.BKASH_APP_KEY,
      },
    },
  );
  return data;
};
