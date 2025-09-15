const twilio = require("twilio");
require("dotenv").config();

const isDev = process.env.OTP_DEV === "true";

module.exports = async function sendOtp(mobile, otp) {
  try {
    if (isDev) {
      console.log(`📌 [DEV MODE] OTP for +91${mobile}: ${otp}`);
      return { ok: true };
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return { ok: false, error: "Twilio not configured" };
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${mobile}`,
    });

    console.log(`📌 OTP sent via Twilio to +91${mobile}`);
    return { ok: true };
  } catch (err) {
    console.error("Twilio error:", err.message || err);
    return { ok: false, error: err.message, code: err.code || null };
  }
};
