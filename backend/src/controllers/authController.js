const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { connectDB, cloudinary } = require('../config/db');
const bcrypt = require("bcrypt"); // added for secure password hashing

require("dotenv").config();

const documentFields = [
  { key: "aadharFront", name: "Aadhar Front" },
  { key: "aadharBack",  name: "Aadhar Back" },
  { key: "license",     name: "License" },
  { key: "panCard",     name: "PAN Card" },
  { key: "rc",          name: "RC" },
];

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "riders" }, (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });

// ==================== User ====================


    exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;

    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing)
      return res.status(400).json({ success: false, message: "Email or mobile already registered" });

    // For users, generate password automatically
    const rawPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = new User({
      fullName,
      email,
      mobile,
      role: "user",
      password: hashedPassword,
      approvalStatus: "approved", // user does not need admin approval
    });

    await user.save(); // ✅ this is crucial

    res.status(201).json({ success: true, message: "User registered", data: { user, password: rawPassword } });
  } catch (err) {
    console.error("User register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile, role: "user" });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, token, user });
  } catch (err) {
    console.error("User login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== Rider ====================
exports.registerRider = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body; // no password at signup
    const files = req.files || {};

    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ success: false, message: "Email or mobile already registered" });

    // Upload documents to Cloudinary
   const documents = [];

for (const field of documentFields) {
  if (files[field.key] && files[field.key][0]) {
    try {
      const url = await uploadBufferToCloudinary(files[field.key][0].buffer);
      console.log(`Uploaded ${field.key}:`, url); // check in console
      documents.push({ name: field.name, url });
    } catch (err) {
      console.error(`Cloudinary upload failed for ${field.key}:`, err);
    }
  }
}


    const rider = new User({
      fullName,
      email,
      mobile,
      role: "rider",
      approvalStatus: "pending",
      documents,
    });

    await rider.save();
    res.status(201).json({ success: true, message: "Rider registered successfully! Please wait for admin approval.", data: rider });
  } catch (err) {
    console.error("Rider register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginRider = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const rider = await User.findOne({ mobile, role: "rider" });

    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });
    if (rider.approvalStatus !== "approved") return res.status(403).json({ success: false, message: "Account not approved yet" });

    const validPassword = await bcrypt.compare(password, rider.password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: rider._id, role: "rider" }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Rider login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== Admin ====================
exports.loginAdmin = async (req, res) => { /* ... unchanged ... */ };

// ==================== Admin approves rider ====================
exports.approveRider = async (req, res) => {
  try {
    const { riderId } = req.params;
    const rider = await User.findById(riderId);
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    // Generate random password & hash
    const rawPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    rider.password = hashedPassword;
    rider.approvalStatus = "approved";
    await rider.save();

    // send rawPassword via email/SMS in real scenario
    res.json({ success: true, message: "Rider approved", password: rawPassword });
  } catch (err) {
    console.error("Approve rider error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
