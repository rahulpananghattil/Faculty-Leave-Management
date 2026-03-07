const express = require("express");
const router = express.Router();
const Leave = require("../models/leaveModel");
const LeaveBalance = require("../models/leaveBalanceModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { protect } = require("../middleware/auth");
const {
  suggestSubstitutes,
  analyzeWorkloadImpact,
  predictLeaveRisk,
  generateRecommendations,
  detectAnomalies,
} = require("../utils/aiEngine");

/* ─── constants ──────────────────────────────────────────────── */
const ADVANCE_NOTICE_EXEMPT = ["casual", "medical"];
const ADVANCE_NOTICE_DAYS = 4; // working days
const EL_ACCRUAL_FRACTION = 1 / 3; // 1 EL day per 3 detention days
const ML_CERTIFICATE_REQUIRED = true;

/* ─── helpers ────────────────────────────────────────────────── */
const calcCalendarDays = (start, end) =>
  Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

const calcWorkingDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  while (cur <= new Date(end)) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const workingDaysUntil = (targetDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  if (target <= today) return 0;
  let count = 0;
  const d = new Date(today);
  while (d < target) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
};

/* Leaves whose balance is tracked (has a capped total) */
const TRACKED_LEAVE_TYPES = ["casual", "medical"];

/* ─────────────────────────────────────────────────────────────
   GET /api/leaves
   Faculty: own leaves | HOD/Admin: all leaves
   ───────────────────────────────────────────────────────────── */
router.get("/", protect, async (req, res) => {
  try {
    const query = req.user.role === "faculty" ? { faculty: req.user._id } : {};
    const leaves = await Leave.find(query)
      .populate("faculty", "name email department designation role")
      .populate("hodApproval.approvedBy", "name email")
      .populate("principalApproval.approvedBy", "name email")
      .populate("substituteAssigned", "name email department")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/leaves/balance
   ───────────────────────────────────────────────────────────── */
router.get("/balance", protect, async (req, res) => {
  try {
    let balance = await LeaveBalance.findOne({ faculty: req.user._id });
    if (!balance)
      balance = await LeaveBalance.create({ faculty: req.user._id });
    res.json(balance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/leaves/ai-insights
   ───────────────────────────────────────────────────────────── */
router.get("/ai-insights", protect, async (req, res) => {
  try {
    const leaveHistory = await Leave.find({
      faculty: req.user._id,
      status: { $in: ["approved", "rejected"] },
    });
    const currentLeaves = await Leave.find({ status: "pending" });
    const allLeaves = await Leave.find({ status: "approved" });
    res.json({
      riskScore: predictLeaveRisk(leaveHistory),
      recommendations: generateRecommendations(
        req.user,
        leaveHistory,
        currentLeaves,
      ),
      anomalies: detectAnomalies(leaveHistory),
      workloadImpact: analyzeWorkloadImpact(allLeaves, req.user.department),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/leaves/substitutes
   ───────────────────────────────────────────────────────────── */
router.get("/substitutes", protect, async (req, res) => {
  try {
    const available = await User.find({ isAvailable: true, role: "faculty" });
    res.json(suggestSubstitutes(available, req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/leaves  — Apply for leave
   ───────────────────────────────────────────────────────────── */
router.post("/", protect, async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      substituteRequested,
      affectedClasses,
      isUrgent,
      elDetentionDays,
      coHolidaysWorked,
      isDuringExamPeriod,
      isDuringTeaching,
    } = req.body;

    /* ── Validate leave type exists for role ── */
    const userRole = req.user.role;
    const adminOnly = ["compensatory"];
    if (adminOnly.includes(leaveType) && userRole === "faculty") {
      return res
        .status(400)
        .json({
          message:
            "Compensatory Leave is only applicable to administrative and supporting staff.",
        });
    }

    /* ── Advance notice check ── */
    const advanceDays = workingDaysUntil(startDate);
    const treatAsLWP =
      !ADVANCE_NOTICE_EXEMPT.includes(leaveType) &&
      advanceDays < ADVANCE_NOTICE_DAYS;

    /* ── Calculate days ── */
    const totalDays = calcCalendarDays(startDate, endDate);
    const wDays = calcWorkingDays(startDate, endDate);

    /* ── EL accrual: total = floor(detentionDays / 3) ── */
    if (leaveType === "earned" && elDetentionDays) {
      const earnedDays = Math.floor(elDetentionDays * EL_ACCRUAL_FRACTION);
      const balance = await LeaveBalance.findOne({ faculty: req.user._id });
      if (balance) {
        balance.earned.total += earnedDays;
        await balance.save();
      }
    }

    /* ── CO: accrue equal days worked on holidays ── */
    if (leaveType === "compensatory" && coHolidaysWorked) {
      const balance = await LeaveBalance.findOne({ faculty: req.user._id });
      if (balance) {
        balance.compensatory.total += coHolidaysWorked;
        await balance.save();
      }
    }

    /* ── Balance check for tracked leave types ── */
    if (TRACKED_LEAVE_TYPES.includes(leaveType)) {
      const balance = await LeaveBalance.findOne({ faculty: req.user._id });
      const balKey = Leave.BALANCE_KEY_MAP[leaveType];
      if (balance?.[balKey]) {
        const remaining = balance[balKey].total - balance[balKey].used;
        if (wDays > remaining) {
          return res.status(400).json({
            message:
              `Insufficient ${leaveType} leave. Available: ${remaining} day(s). ` +
              `Excess days will be treated as Leave Without Pay.`,
            remaining,
          });
        }
      }
    }

    /* ── SP: no salary — just flag it ── */
    /* ── LWP: deduct salary — just flag it ── */

    /* ── Substitute auto-suggest ── */
    const availableFaculty = await User.find({
      isAvailable: true,
      role: "faculty",
    });
    const autoSub =
      suggestSubstitutes(availableFaculty, req.user)[0]?._id || null;
    const history = await Leave.find({ faculty: req.user._id });

    const leave = await Leave.create({
      faculty: req.user._id,
      leaveType,
      startDate,
      endDate,
      totalDays,
      workingDays: wDays,
      reason,
      treatAsLWP,
      advanceNoticeDays: advanceDays,
      substituteRequested: substituteRequested || "",
      substituteAssigned: autoSub,
      affectedClasses: affectedClasses || [],
      isUrgent: isUrgent || false,
      isDuringExamPeriod: isDuringExamPeriod || false,
      isDuringTeaching: isDuringTeaching || false,
      elDetentionDays: elDetentionDays || 0,
      coHolidaysWorked: coHolidaysWorked || 0,
      mlCertificateRequired: leaveType === "medical" && ML_CERTIFICATE_REQUIRED,
      aiPredictionScore: predictLeaveRisk(history),
    });

    /* ── Notify HOD and Admin ── */
    const admins = await User.find({ role: { $in: ["admin", "hod"] } });
    const lwpNote = treatAsLWP
      ? " ⚠ Insufficient advance notice — may be treated as LWP."
      : "";
    await Notification.insertMany(
      admins.map((admin) => ({
        recipient: admin._id,
        sender: req.user._id,
        type: "leave_applied",
        message:
          `${req.user.name} applied for ${leaveType} leave ` +
          `(${new Date(startDate).toDateString()} → ${new Date(endDate).toDateString()}, ` +
          `${totalDays} day(s)).${lwpNote}`,
        relatedLeave: leave._id,
      })),
    );

    const populated = await Leave.findById(leave._id)
      .populate("faculty", "name email department designation")
      .populate("substituteAssigned", "name email department");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   PUT /api/leaves/:id/hod-approve   — Step 1: HOD approval
   ─────────────────────────────────────���─────────────────────── */
router.put("/:id/hod-approve", protect, async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "admin")
      return res.status(403).json({ message: "HOD access required" });

    const leave = await Leave.findById(req.params.id).populate("faculty");
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    if (leave.status !== "pending")
      return res.status(400).json({ message: "Leave is not in pending state" });

    leave.status = "hod_approved";
    leave.hodApproval = {
      approvedBy: req.user._id,
      approvalDate: new Date(),
      remarks: req.body.remarks || "",
    };
    await leave.save();

    /* Notify Principal/Admin for final approval */
    const principals = await User.find({ role: "admin" });
    await Notification.insertMany(
      principals.map((p) => ({
        recipient: p._id,
        sender: req.user._id,
        type: "leave_applied",
        message: `HOD ${req.user.name} approved ${leave.faculty.name}'s ${leave.leaveType} leave. Awaiting principal approval.`,
        relatedLeave: leave._id,
      })),
    );

    /* Notify applicant */
    await Notification.create({
      recipient: leave.faculty._id,
      sender: req.user._id,
      type: "leave_approved",
      message: `Your ${leave.leaveType} leave has been approved by HOD ${req.user.name}. Awaiting principal/management approval.`,
      relatedLeave: leave._id,
    });

    res.json({ message: "HOD approval granted", leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   PUT /api/leaves/:id/approve   — Step 2: Principal/Admin final approval
   ───────────────────────────────────────────────────────────── */
router.put("/:id/approve", protect, async (req, res) => {
  try {
    if (req.user.role === "faculty")
      return res.status(403).json({ message: "Not authorized" });

    const leave = await Leave.findById(req.params.id).populate("faculty");
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    /* Must be HOD-approved first (unless admin fast-tracks) */
    if (leave.status !== "hod_approved" && leave.status !== "pending")
      return res
        .status(400)
        .json({
          message: "Leave must be HOD-approved before principal approval",
        });

    leave.status = "approved";
    leave.principalApproval = {
      approvedBy: req.user._id,
      approvalDate: new Date(),
      remarks: req.body.remarks || "",
    };
    await leave.save();

    /* Deduct from balance for tracked leave types */
    const balKey = Leave.BALANCE_KEY_MAP[leave.leaveType];
    if (balKey) {
      const balance = await LeaveBalance.findOne({
        faculty: leave.faculty._id,
      });
      if (balance?.[balKey]) {
        balance[balKey].used += leave.workingDays || leave.totalDays;
        await balance.save();
      }
    }

    /* Notify applicant */
    const lwpNote = leave.treatAsLWP
      ? " Note: Insufficient advance notice — this may be processed as Leave Without Pay."
      : "";
    await Notification.create({
      recipient: leave.faculty._id,
      sender: req.user._id,
      type: "leave_approved",
      message: `Your ${leave.leaveType} leave (${leave.totalDays} day(s)) has been fully approved by ${req.user.name}.${lwpNote}`,
      relatedLeave: leave._id,
    });

    res.json({ message: "Leave approved", leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   PUT /api/leaves/:id/reject
   ───────────────────────────────────────────────────────────── */
router.put("/:id/reject", protect, async (req, res) => {
  try {
    if (req.user.role === "faculty")
      return res.status(403).json({ message: "Not authorized" });

    const leave = await Leave.findById(req.params.id).populate("faculty");
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    leave.status = "rejected";
    leave.rejectionReason = req.body.rejectionReason || "Not specified";
    await leave.save();

    await Notification.create({
      recipient: leave.faculty._id,
      sender: req.user._id,
      type: "leave_rejected",
      message: `Your ${leave.leaveType} leave was rejected by ${req.user.name}. Reason: ${leave.rejectionReason}`,
      relatedLeave: leave._id,
    });

    res.json({ message: "Leave rejected", leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   PUT /api/leaves/:id/cancel
   ───────────────────────────────────────────────────────────── */
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    if (leave.faculty.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });
    if (!["pending", "hod_approved"].includes(leave.status))
      return res
        .status(400)
        .json({
          message: "Only pending or HOD-approved leaves can be cancelled",
        });

    leave.status = "cancelled";
    await leave.save();
    res.json({ message: "Leave cancelled", leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ──────────────────────────────────────────────────────���──────
   PUT /api/leaves/:id/ml-certificate
   Mark ML certificate as received on return
   ───────────────────────────────────────────────────────────── */
router.put("/:id/ml-certificate", protect, async (req, res) => {
  try {
    if (req.user.role === "faculty")
      return res.status(403).json({ message: "Not authorized" });

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });
    if (leave.leaveType !== "medical")
      return res
        .status(400)
        .json({ message: "Only applicable to medical leave" });

    leave.mlCertificateReceived = true;
    await leave.save();

    /* Update balance record too */
    const balance = await LeaveBalance.findOne({ faculty: leave.faculty });
    if (balance) {
      balance.mlCertificateSubmitted = true;
      await balance.save();
    }

    res.json({ message: "ML certificate marked as received", leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
