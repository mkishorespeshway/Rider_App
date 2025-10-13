const mongoose = require("mongoose");

const walletTxnSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["credit", "debit", "withdraw_lock", "withdraw_success", "withdraw_failed"], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

walletTxnSchema.index({ riderId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTxnSchema);