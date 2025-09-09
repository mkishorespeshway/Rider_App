const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp');

exports.sendOtp = async (phone) => {
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await Otp.create({ phone, codeHash, expiresAt, verified: false });
  if (process.env.OTP_DEV === 'true' || process.env.OTP_DEV === '1') {
    console.log(`DEV OTP for ${phone}: ${code}`);
  }
  // integrate SMS provider here in production
  return { phone, expiresAt };
};

exports.verifyOtp = async (phone, code) => {
  const rec = await Otp.findOne({ phone }).sort({ createdAt: -1 });
  if (!rec) return false;
  if (rec.verified) return false;
  if (new Date() > rec.expiresAt) return false;
  const ok = await bcrypt.compare(code, rec.codeHash);
  if (ok) {
    rec.verified = true;
    await rec.save();
    return true;
  }
  return false;
};
