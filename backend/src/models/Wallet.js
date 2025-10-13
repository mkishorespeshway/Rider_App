const mongoose = require("mongoose");


const bankDetailsSchema = new mongoose.Schema(
  {
    holderName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" }, // store masked on read
    ifsc: { type: String, default: "" },
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    balance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 }, // held for pending withdrawals
    bankDetails: { type: bankDetailsSchema, default: {} },
  },
  { timestamps: true }
);

walletSchema.index({ riderId: 1 }, { unique: true });

module.exports = mongoose.model("Wallet", walletSchema);