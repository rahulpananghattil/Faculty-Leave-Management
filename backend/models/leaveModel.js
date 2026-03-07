const mongoose = require("mongoose");

/* ─────────────────────────────────────────────────────────────
   Pillai College of Engineering — Leave Model
   ───────────────────────────────────────────────────────────── */

const LEAVE_TYPES = [
  "casual",
  "medical",
  "earned",
  "compensatory",
  "onDuty",
  "special",
  "leaveWithoutPay",
];

/* Map leaveType → leaveBalanceModel field name */
const BALANCE_KEY_MAP = {
  casual: "casual",
  medical: "medical",
  earned: "earned",
  compensatory: "compensatory",
  onDuty: "onDuty",
  special: "special",
  leaveWithoutPay: "leaveWithoutPay",
};

const leaveSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    leaveType: {
      type: String,
      enum: LEAVE_TYPES,
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },

    /* Working days (Mon–Sat, excluding Sundays) */
    workingDays: { type: Number, default: 0 },

    reason: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "hod_approved", "approved", "rejected", "cancelled"],
      default: "pending",
    },

    /* ── Pillai two-step approval: HOD → Principal ── */
    hodApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvalDate: { type: Date },
      remarks: { type: String },
    },
    principalApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvalDate: { type: Date },
      remarks: { type: String },
    },

    rejectionReason: { type: String },

    /* ── Advance notice validation ── */
    advanceNoticeDays: { type: Number, default: 0 }, // working days before leave start
    treatAsLWP: { type: Boolean, default: false }, // true if notice < 4 days for non-CL/ML

    /* ── Substitute ── */
    substituteRequested: { type: String }, // name entered by applicant
    substituteAssigned: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    substituteConfirmed: { type: Boolean, default: false },

    /* ── ML specifics ── */
    mlCertificateRequired: { type: Boolean, default: false },
    mlCertificateReceived: { type: Boolean, default: false },

    /* ── EL specifics ── */
    elDetentionDays: { type: Number, default: 0 }, // days detained; EL = floor(detentionDays / 3)

    /* ── CO specifics ── */
    coHolidaysWorked: { type: Number, default: 0 }, // days worked on holidays; CO = equal days

    /* ── Academic context ── */
    affectedClasses: [{ type: String }],
    isDuringExamPeriod: { type: Boolean, default: false },
    isDuringTeaching: { type: Boolean, default: false },

    /* ── AI ── */
    aiPredictionScore: { type: Number },
    isUrgent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/* ── Static helpers ── */
leaveSchema.statics.LEAVE_TYPES = LEAVE_TYPES;
leaveSchema.statics.BALANCE_KEY_MAP = BALANCE_KEY_MAP;

/* ── Instance: working days between start and end (excl. Sunday) ── */
leaveSchema.methods.calcWorkingDays = function () {
  let count = 0;
  const cur = new Date(this.startDate);
  while (cur <= new Date(this.endDate)) {
    if (cur.getDay() !== 0) count++; // 0 = Sunday
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

module.exports = mongoose.model("Leave", leaveSchema);
