const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const walletCtrl = require("../controllers/wallet.controller");

// Get wallet and transactions
router.get("/me", authMiddleware, walletCtrl.getMyWallet);
router.get("/transactions", authMiddleware, walletCtrl.getMyTransactions);

// Bank details
router.put("/bank", authMiddleware, walletCtrl.updateBankDetails);

// Withdraw and credit (credit is for demo/testing)
router.post("/withdraw", authMiddleware, walletCtrl.requestWithdrawal);
router.post("/credit", authMiddleware, walletCtrl.creditEarning);

module.exports = router;