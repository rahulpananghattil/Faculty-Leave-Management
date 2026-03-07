const mongoose = require("mongoose");

/* ─────────────────────────────────────────────────────────────
   Pillai College of Engineering — Leave Balance Model
   Academic Year: August 1 → July 31
   ───────────────────────────────────────────────────────────── */

const leaveTypeSchema = (defaultTotal) => ({
  total: { type: Number, default: defaultTotal },
  used: { type: Number, default: 0 },
});

const leaveBalanceSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /* Academic year this balance belongs to e.g. 2024 = Aug 2024 → Jul 2025 */
    academicYear: {
      type: Number,
      default: () => {
        const now = new Date();
        return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      },
    },

    /* ── Leave types per Pillai handbook ── */
    casual: leaveTypeSchema(8), // CL  — 8 days, faculty & all staff
    medical: leaveTypeSchema(10), // ML  — 10 days full pay
    earned: leaveTypeSchema(0), // EL  — accrued (1/3 of detention days); no carry-forward
    compensatory: leaveTypeSchema(0), // CO  — admin/support only; equal to days worked on holidays
    onDuty: leaveTypeSchema(0), // OD  — assigned by institute/university/state
    special: leaveTypeSchema(0), // SP  — no salary; when no other leave available
    leaveWithoutPay: leaveTypeSchema(0), // LWP — prolonged illness or exceptional reasons

    /* Doctor's certificate submitted for ML return */
    mlCertificateSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/* ── Virtual: total days used across all leave types ── */
leaveBalanceSchema.virtual("totalUsed").get(function () {
  return (
    this.casual.used +
    this.medical.used +
    this.earned.used +
    this.compensatory.used +
    this.onDuty.used +
    this.special.used +
    this.leaveWithoutPay.used
  );
});

/* ── Reset balances at start of new academic year (Aug 1) ── */
leaveBalanceSchema.methods.resetForNewYear = async function (role) {
  this.casual = { total: 8, used: 0 };
  this.medical = { total: 10, used: 0 };
  this.earned = { total: 0, used: 0 }; // re-accrued during year
  this.compensatory = { total: 0, used: 0 };
  this.onDuty = { total: 0, used: 0 };
  this.special = { total: 0, used: 0 };
  this.leaveWithoutPay = { total: 0, used: 0 };
  this.mlCertificateSubmitted = false;
  const now = new Date();
  this.academicYear =
    now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return this.save();
};

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
