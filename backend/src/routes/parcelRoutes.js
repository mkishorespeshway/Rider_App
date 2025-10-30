const express = require("express");
const router = express.Router();
const Parcel = require("../models/Parcel");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const authMiddleware = require("../middleware/authMiddleware");
const axios = require("axios");

// Multer memory storage for parcel documents
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only PNG, JPEG, PDF allowed"));
    cb(null, true);
  },
});

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, folder, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// 📦 Create a parcel request (now supports file uploads)
router.post("/", upload.array("documents", 10), async (req, res) => {
  try {
    console.log("📥 Parcel API received:", req.body);
    console.log("📂 Using DB:", mongoose.connection.name);

    const body = req.body || {};

    // Parse pickup/drop JSON strings if provided
    let pickup = null;
    let drop = null;
    try {
      if (typeof body.pickup === "string") pickup = JSON.parse(body.pickup);
      else if (body.pickup) pickup = body.pickup;
    } catch (_) {}
    try {
      if (typeof body.drop === "string") drop = JSON.parse(body.drop);
      else if (body.drop) drop = body.drop;
    } catch (_) {}

    // Upload received documents to Cloudinary OR save locally if Cloudinary not configured
    const files = req.files || [];
    const documents = [];
    const cloudEnabled = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
    );

    for (const f of files) {
      try {
        if (cloudEnabled) {
          const result = await uploadToCloudinary(f.buffer, "parcel_docs", f.mimetype);
          documents.push({
            url: result.secure_url,
            mimetype: f.mimetype,
            public_id: result.public_id,
            originalName: f.originalname,
            size: f.size,
          });
        } else {
          const uploadsDir = path.resolve(process.cwd(), "uploads", "parcels");
          try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
          const filename = `${Date.now()}-${f.originalname}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, f.buffer);
          const publicUrl = `/uploads/parcels/${filename}`; // served by server.js static handler
          documents.push({
            url: publicUrl,
            mimetype: f.mimetype,
            public_id: null,
            originalName: f.originalname,
            size: f.size,
          });
        }
      } catch (err) {
        console.error("Document upload/save failed:", err.message);
      }
    }

    const parcelPayload = {
      senderName: body.senderName,
      senderMobile: body.senderMobile,
      receiverName: body.receiverName,
      receiverMobile: body.receiverMobile,
      parcelCategory: body.parcelCategory,
      parcelDetails: body.parcelDetails,
      pickupAddress: body.pickupAddress,
      dropAddress: body.dropAddress,
      pickup,
      drop,
      documents,
      // Ensure new parcels start in pending status
      status: "pending",
      // By default, rider can view documents until they mark copied
      documentsVisibleToRider: false,
    };

    // Xerox category should be assigned to bike riders only
    {
      const cat = String(parcelPayload.parcelCategory || "").trim().toLowerCase();
      if (cat === "xerox") {
        parcelPayload.requiredVehicleType = "bike";
      }
    }

    // Validate minimal required fields
    const required = ["senderName", "senderMobile", "receiverName", "receiverMobile", "parcelCategory"];
    for (const k of required) {
      if (!parcelPayload[k]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${k}` });
      }
    }

    const parcel = new Parcel(parcelPayload);
    await parcel.save();
    console.log("✅ Parcel saved with _id:", parcel._id);

    // 🚨 Broadcast parcel request to bike riders only (parcels are bike-only)
    const io = req.app.get("io");
    if (io) {
      io.to("vehicle:bike").emit("parcelRequest", parcel);
      console.log("📦 Parcel request broadcasted to bike riders");
    }

    res.status(201).json({
      success: true,
      message: "Parcel created",
      parcel,
    });
  } catch (err) {
    console.error("❌ Parcel save error:", err.message);
    res.status(500).json({ success: false, error: err.message || "Failed to create parcel" });
  }
});

// 📝 Set per-parcel OTP (from Activity/booking UI)
router.post("/:id/set-otp", async (req, res) => {
  try {
    const parcelId = req.params.id;
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }
    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ success: false, message: "Parcel not found" });
    }
    // Require rider acceptance before OTP is set; keep status unchanged here
    if (parcel.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Parcel not accepted by rider yet" });
    }
    parcel.parcelOtp = String(otp);
    await parcel.save();
    res.json({ success: true, parcel });
  } catch (err) {
    console.error("❌ Set parcel OTP error:", err);
    res.status(500).json({ success: false, error: "Failed to set parcel OTP" });
  }
});

// 🔐 Verify parcel OTP (rider-side) and start parcel
router.post("/:id/verify-otp", authMiddleware, async (req, res) => {
  try {
    const parcelId = req.params.id;
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }
    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ success: false, message: "Parcel not found" });
    }
    if (!parcel.parcelOtp) {
      // allow setting on verify if not set yet
      parcel.parcelOtp = String(otp);
      await parcel.save();
    }
    if (String(parcel.parcelOtp) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    parcel.status = "in_progress";
    parcel.assignedRider = {
      id: req.user._id,
      fullName: req.user.fullName || req.user.name || `${(req.user.firstName || "").trim()} ${(req.user.lastName || "").trim()}`.trim(),
      mobile: req.user.mobile,
      vehicleType: req.user.vehicleType || (req.user.vehicle && req.user.vehicle.type) || null,
      vehicleNumber: req.user.vehicleNumber || (req.user.vehicle && req.user.vehicle.number) || null,
    };
    // Reveal documents to rider only after successful OTP verification
    parcel.documentsVisibleToRider = true;
    await parcel.save();
    // Could emit a socket event here similar to rides
    res.json({ success: true, parcel });
  } catch (err) {
    console.error("❌ Verify parcel OTP error:", err);
    res.status(500).json({ success: false, error: "Failed to verify parcel OTP" });
  }
});

// 📦 Get all parcels (for testing/admin)
router.get("/", async (req, res) => {
  try {
    const parcels = await Parcel.find().sort({ createdAt: -1 });
    const vt = String(req.query?.vehicleType || "").trim().toLowerCase();
    const filtered = vt
      ? parcels.filter((p) => {
          const reqType = String(p?.requiredVehicleType || "").trim().toLowerCase();
          const cat = String(p?.parcelCategory || "").trim().toLowerCase();
          if (reqType) return reqType === vt;
          if (cat === "xerox") return vt === "bike";
          return true;
        })
      : parcels;
    res.json({ success: true, parcels: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch parcels" });
  }
});

// 🔍 Fetch single parcel by ID
router.get("/:id", async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ success: false, message: "Parcel not found" });
    res.json({ success: true, parcel });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch parcel" });
  }
});

// 🚦 Accept parcel (rider-side)
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcel not found' });
    if (parcel.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Parcel is not pending' });
    }

    // Enforce vehicle type restrictions (Xerox → bike-only, or explicit requiredVehicleType)
    const riderVehicleType = String(
      req.user?.vehicleType || (req.user?.vehicle && req.user.vehicle.type) || ''
    ).trim().toLowerCase();
    const parcelCategory = String(parcel.parcelCategory || '').trim().toLowerCase();
    const requiredType = String(parcel.requiredVehicleType || '').trim().toLowerCase();

    const effectiveRequired = requiredType || (parcelCategory === 'xerox' ? 'bike' : '');
    if (effectiveRequired && riderVehicleType !== effectiveRequired) {
      return res.status(403).json({
        success: false,
        message: `This parcel requires a ${effectiveRequired} rider`,
      });
    }

    // Mark accepted; OTP will be set by user Activity page
    parcel.status = 'accepted';
    await parcel.save();

    // 🚨 Broadcast parcelLocked to remove from other bike riders' lists
    const io = req.app.get("io");
    if (io) {
      io.to("vehicle:bike").emit("parcelLocked", { parcelId: parcel._id });
      console.log("🔒 Parcel locked, broadcasted to bike riders");
    }

    res.json({ success: true, parcel });
  } catch (err) {
    console.error('Accept parcel error:', err);
    res.status(500).json({ success: false, message: 'Failed to accept parcel' });
  }
});

// ❌ Reject parcel (rider-side)
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcel not found' });
    if (parcel.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Parcel is not pending' });
    }
    parcel.status = 'rejected';
    await parcel.save();
    res.json({ success: true, parcel });
  } catch (err) {
    console.error('Reject parcel error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject parcel' });
  }
});

// 📄 Mark parcel documents as copied/hidden (rider-side)
router.post('/:id/mark-docs-copied', authMiddleware, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcel not found' });

    // Allow marking copied only after OTP verification (in_progress)
    if (parcel.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Documents can only be hidden after OTP verification' });
    }

    const isXerox = String(parcel.parcelCategory || '').trim().toLowerCase() === 'xerox';

    if (isXerox && Array.isArray(parcel.documents) && parcel.documents.length > 0) {
      for (const doc of parcel.documents) {
        try {
          const publicId = doc.public_id;
          const mimetype = String(doc.mimetype || '');
          if (publicId) {
            const resourceType = mimetype === 'application/pdf' ? 'raw' : (mimetype.startsWith('image/') ? 'image' : 'auto');
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
          } else if (doc.url && doc.url.startsWith('/uploads/parcels/')) {
            const filename = path.basename(doc.url);
            const filePath = path.resolve(process.cwd(), 'uploads', 'parcels', filename);
            try { fs.unlinkSync(filePath); } catch (e) { console.warn('Local delete failed:', e.message); }
          }
        } catch (delErr) {
          console.warn('Doc deletion warning:', delErr?.message || delErr);
        }
      }
      // Clear documents after deletion for Xerox category
      parcel.documents = [];
    }

    parcel.documentsVisibleToRider = false;
    parcel.docsCopiedAt = new Date();
    parcel.docsCopiedBy = req.user._id;
    await parcel.save();

    res.json({ success: true, parcel });
  } catch (err) {
    console.error('Mark docs copied error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark documents copied' });
  }
});

// 📄 Secure document download (Cloudinary/private + local)
router.get('/:id/documents/:idx/download', authMiddleware, async (req, res) => {
  try {
    const { id, idx } = req.params;
    const index = parseInt(idx, 10);
    const parcel = await Parcel.findById(id);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcel not found' });

    // Basic visibility checks (allow accepted and in_progress when visible)
    const riderCanView = parcel.status === 'in_progress';
    if (!riderCanView) return res.status(403).json({ success: false, message: 'Documents are not available' });

    if (!Array.isArray(parcel.documents) || isNaN(index) || index < 0 || index >= parcel.documents.length) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const doc = parcel.documents[index];
    const filename = (doc.originalName || 'document').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const mimetype = String(doc.mimetype || 'application/octet-stream');

    // If Cloudinary asset
    if (doc.public_id) {
      // Infer resource type from stored URL first; fallback to mimetype
      let resourceType = 'raw';
      try {
        if (doc.url && doc.url.includes('/image/upload/')) resourceType = 'image';
        else if (doc.url && doc.url.includes('/raw/upload/')) resourceType = 'raw';
        else if (mimetype.startsWith('image/')) resourceType = 'image';
        else if (mimetype === 'application/pdf') resourceType = 'raw';
      } catch (_) {}
      // Extension from URL or mimetype
      let ext = 'pdf';
      try {
        const u = new URL(doc.url);
        const name = u.pathname.split('/').pop() || '';
        const maybe = name.includes('.') ? name.split('.').pop() : null;
        ext = maybe || (mimetype.split('/')[1] || (mimetype === 'application/pdf' ? 'pdf' : '')) || 'pdf';
      } catch (_) {
        ext = mimetype.split('/')[1] || 'pdf';
      }
      const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      // Try authenticated signed download first
      let dlUrl;
      try {
        dlUrl = cloudinary.utils.private_download_url(doc.public_id, ext || null, {
          resource_type: resourceType,
          type: 'authenticated',
          attachment: filename,
          expires_at: expiresAt,
        });
      } catch (_) {}

      // Fallback to normal upload type signed URL if needed
      if (!dlUrl) {
        try {
          dlUrl = cloudinary.utils.private_download_url(doc.public_id, ext || null, {
            resource_type: resourceType,
            type: 'upload',
            attachment: filename,
            expires_at: expiresAt,
          });
        } catch (_) {}
      }

      // Last resort: stream original URL
      const finalUrl = dlUrl || doc.url;
      const response = await axios.get(finalUrl, { responseType: 'stream' });
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      response.data.pipe(res);
      return;
    }

    // If Cloudinary URL without public_id, stream directly
    if (doc.url && doc.url.includes('res.cloudinary.com')) {
      const response = await axios.get(doc.url, { responseType: 'stream' });
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      response.data.pipe(res);
      return;
    }

    // If local file under /uploads
    if (doc.url && doc.url.startsWith('/uploads/parcels/')) {
      const filePath = path.resolve(process.cwd(), doc.url.replace(/^\//, ''));
      try {
        if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File missing' });
      } catch (_) {}
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    return res.status(400).json({ success: false, message: 'Unsupported document source' });
  } catch (err) {
    console.error('Doc download error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Failed to download document' });
  }
});

// 💵 Mark parcel cash payment (sets finalPrice and payment status)
router.post('/:id/pay/cash', authMiddleware, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcel not found' });

    const amount = Number(req.body?.amount);
    if (!isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    parcel.finalPrice = amount;
    parcel.paymentMethod = 'cash';
    parcel.paymentStatus = 'paid';
    await parcel.save();

    res.json({ success: true, parcel });
  } catch (err) {
    console.error('Parcel cash payment error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to mark parcel cash payment' });
  }
});
module.exports = router;
