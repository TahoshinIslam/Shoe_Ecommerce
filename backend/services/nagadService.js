import axios from "axios";
import crypto from "crypto";

/**
 * Nagad Payment Gateway integration (merchant-initiated).
 *
 * NOTE: Nagad uses RSA encryption + signatures with merchant keys.
 * Full production implementation requires:
 *  - Merchant ID (NAGAD_MERCHANT_ID)
 *  - Merchant number
 *  - Nagad PUBLIC key (to encrypt payload to Nagad)
 *  - Your PRIVATE key (to sign requests)
 *
 * This file provides a working skeleton. You MUST obtain keys from Nagad
 * merchant onboarding and plug them into .env.
 */

const BASE = () => process.env.NAGAD_BASE_URL;

// Encrypt payload with Nagad's public key (RSA-OAEP? Nagad uses PKCS1_v1_5 actually)
const encryptWithNagadPublicKey = (plaintext) => {
  const publicKey = process.env.NAGAD_PUBLIC_KEY;
  if (!publicKey) throw new Error("NAGAD_PUBLIC_KEY not configured");
  const pubPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  const encrypted = crypto.publicEncrypt(
    { key: pubPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plaintext),
  );
  return encrypted.toString("base64");
};

// Sign request with our private key
const signWithPrivateKey = (plaintext) => {
  const privKey = process.env.NAGAD_PRIVATE_KEY;
  if (!privKey) throw new Error("NAGAD_PRIVATE_KEY not configured");
  const privPem = `-----BEGIN PRIVATE KEY-----\n${privKey}\n-----END PRIVATE KEY-----`;
  const signer = crypto.createSign("SHA256");
  signer.update(plaintext);
  signer.end();
  return signer.sign(privPem, "base64");
};

// Step 1: Initialize payment
export const nagadInitialize = async ({ orderId, amount }) => {
  const merchantId = process.env.NAGAD_MERCHANT_ID;
  const dateTime = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const randomStr = crypto.randomBytes(20).toString("hex").slice(0, 40);

  const sensitiveData = {
    merchantId,
    datetime: dateTime,
    orderId,
    challenge: randomStr,
  };
  const sensitiveDataStr = JSON.stringify(sensitiveData);

  const { data } = await axios.post(
    `${BASE()}/api/dfs/check-out/initialize/${merchantId}/${orderId}`,
    {
      accountNumber: process.env.NAGAD_MERCHANT_NUMBER,
      dateTime,
      sensitiveData: encryptWithNagadPublicKey(sensitiveDataStr),
      signature: signWithPrivateKey(sensitiveDataStr),
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-KM-Api-Version": "v-0.2.0",
        "X-KM-IP-V4": "0.0.0.0",
        "X-KM-Client-Type": "PC_WEB",
      },
    },
  );

  // data.sensitiveData contains encrypted paymentReferenceId + challenge
  return { raw: data, dateTime, challenge: randomStr };
};

// Step 2: Complete checkout (submits order & returns callBackUrl)
export const nagadCompleteCheckout = async ({
  paymentReferenceId,
  challenge,
  orderId,
  amount,
  callBackUrl,
}) => {
  const merchantId = process.env.NAGAD_MERCHANT_ID;

  const sensitiveData = {
    merchantId,
    orderId,
    amount: String(amount),
    currencyCode: "050", // BDT
    challenge,
  };
  const sensitiveDataStr = JSON.stringify(sensitiveData);

  const { data } = await axios.post(
    `${BASE()}/api/dfs/check-out/complete/${paymentReferenceId}`,
    {
      sensitiveData: encryptWithNagadPublicKey(sensitiveDataStr),
      signature: signWithPrivateKey(sensitiveDataStr),
      merchantCallbackURL: callBackUrl,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-KM-Api-Version": "v-0.2.0",
        "X-KM-IP-V4": "0.0.0.0",
        "X-KM-Client-Type": "PC_WEB",
      },
    },
  );
  return data; // contains callBackUrl (redirect user here)
};

// Step 3: Verify payment by paymentRefId (after callback)
export const nagadVerify = async (paymentRefId) => {
  const { data } = await axios.get(
    `${BASE()}/api/dfs/verify/payment/${paymentRefId}`,
  );
  return data; // contains status, orderId, paymentRefId, amount, issuerPaymentRefNo, etc.
};
