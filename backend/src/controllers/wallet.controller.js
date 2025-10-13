const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");

// Ensure wallet exists for rider
async function ensureWallet(riderId) {
  let w = await Wallet.findOne({ riderId });
  if (!w) {
    w = await Wallet.create({ riderId, balance: 0, lockedBalance: 0, bankDetails: {} });
  }
  return w;
}

exports.getMyWallet = async (req, res) => {
  try {
    const riderId = req.user._id;
    // If DB is offline, return a safe mock wallet
    if (mongoose.connection.readyState !== 1) {
      const mock = {
        _id: new mongoose.Types.ObjectId(),
        riderId,
        balance: 0,
        lockedBalance: 0,
        bankDetails: {},
      };
      return res.json({ success: true, wallet: mock, mock: true });
    }
    const wallet = await ensureWallet(riderId);
    return res.json({ success: true, wallet });
  } catch (err) {
    console.error("getMyWallet error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMyTransactions = async (req, res) => {
  try {
    const riderId = req.user._id;
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, transactions: [], mock: true });
    }
    const txns = await WalletTransaction.find({ riderId }).sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, transactions: txns });
  } catch (err) {
    console.error("getMyTransactions error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateBankDetails = async (req, res) => {
  try {
    const riderId = req.user._id;
    const { holderName, bankName, accountNumber, ifsc } = req.body;
    if (mongoose.connection.readyState !== 1) {
      const bankDetails = { holderName, bankName, accountNumber, ifsc };
      return res.json({ success: true, bankDetails, mock: true });
    }
    const wallet = await ensureWallet(riderId);
    wallet.bankDetails = { holderName, bankName, accountNumber, ifsc };
    await wallet.save();
    return res.json({ success: true, bankDetails: wallet.bankDetails });
  } catch (err) {
    console.error("updateBankDetails error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.requestWithdrawal = async (req, res) => {
  try {
    const riderId = req.user._id;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    if (mongoose.connection.readyState !== 1) {
      // In offline dev mode, simulate success without persistence
      const mockWallet = {
        _id: new mongoose.Types.ObjectId(),
        riderId,
        balance: 0,
        lockedBalance: 0,
        bankDetails: {},
      };
      return res.json({ success: true, message: "Withdrawal requested (mock)", wallet: mockWallet, mock: true });
    }
    const wallet = await ensureWallet(riderId);
    if (!wallet.bankDetails || !wallet.bankDetails.accountNumber || !wallet.bankDetails.ifsc) {
      return res.status(400).json({ success: false, message: "Add bank details before withdrawal" });
    }
    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Move funds to lockedBalance
    wallet.balance -= amount;
    wallet.lockedBalance += amount;
    await wallet.save();

    await WalletTransaction.create({
      riderId,
      type: "withdraw_lock",
      amount,
      description: "Withdrawal initiated; amount locked",
    });

    return res.json({ success: true, message: "Withdrawal requested", wallet });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Utility endpoint to simulate crediting earnings (for demo/testing)
exports.creditEarning = async (req, res) => {
  try {
    const riderId = req.user._id;
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    if (mongoose.connection.readyState !== 1) {
      const mockWallet = {
        _id: new mongoose.Types.ObjectId(),
        riderId,
        balance: amount,
        lockedBalance: 0,
        bankDetails: {},
      };
      return res.json({ success: true, wallet: mockWallet, mock: true });
    }
    const wallet = await ensureWallet(riderId);
    wallet.balance += amount;
    await wallet.save();
    await WalletTransaction.create({ riderId, type: "credit", amount, description: description || "Ride earning" });
    return res.json({ success: true, wallet });
  } catch (err) {
    console.error("creditEarning error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};