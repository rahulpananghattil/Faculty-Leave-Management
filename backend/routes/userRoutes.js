const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const User = require("../models/userModel");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

/* ── GET /api/users — all users ── */
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── GET /api/users/available ── */
router.get("/available", protect, async (req, res) => {
  try {
    const users = await User.find({ isAvailable: true, role: "faculty" })
      .select("-password")
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── PUT /api/users/profile — update profile text fields ── */
router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { name, phone, designation, subjects } = req.body;
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.designation = designation || user.designation;
    user.subjects = subjects || user.subjects;
    const updated = await user.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      department: updated.department,
      designation: updated.designation,
      phone: updated.phone,
      subjects: updated.subjects,
      avatar: updated.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── POST /api/users/avatar — upload / replace profile image ── */
router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    /* Delete old avatar file from disk */
    if (user.avatar) {
      const oldPath = path.join(__dirname, "../", user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({
      message: "Avatar updated successfully",
      avatar: user.avatar,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── DELETE /api/users/avatar — remove profile image ── */
router.delete("/avatar", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar) {
      const filePath = path.join(__dirname, "../", user.avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      user.avatar = null;
      await user.save();
    }

    res.json({ message: "Avatar removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── PUT /api/users/:id/availability ── */
router.put("/:id/availability", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isAvailable = req.body.isAvailable;
    await user.save();
    res.json({ message: "Availability updated", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
