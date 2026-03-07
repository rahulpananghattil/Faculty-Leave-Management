import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Alert,
  Divider,
  CircularProgress,
  Grid,
} from "@mui/material";
import {
  EventNote,
  Info,
  Warning,
  CheckCircle,
  Upload,
} from "@mui/icons-material";
import { useAuth } from "../context/authContext";
import API from "../api/axiosInstance";
import {
  LEAVE_ENTITLEMENTS,
  LEAVE_TYPE_META,
  ADVANCE_NOTICE_EXEMPT,
  ADVANCE_NOTICE_DAYS,
  ML_CERTIFICATE_REQUIRED,
  EL_ACCRUAL_FRACTION,
} from "../constants/leavePolicy";

/* ── helpers ─────────────────────────────────────────────── */
const addWorkingDays = (date, days) => {
  let d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
};

const workingDaysUntil = (targetDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  if (target <= today) return 0;
  let count = 0;
  let d = new Date(today);
  while (d < target) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
};

const calendarDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
};

/* ── component ───────────────────────────────────────────── */
const ApplyLeavePage = () => {
  const { user } = useAuth();
  const role = user?.role || "faculty";
  const entitlements = LEAVE_ENTITLEMENTS[role] || LEAVE_ENTITLEMENTS.faculty;

  const [form, setForm] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    substitute: "",
  });
  const [balance, setBalance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    API.get("/leaves/balance")
      .then(({ data }) => setBalance(data))
      .catch(() => {});
  }, []);

  /* recalculate warnings whenever form changes */
  useEffect(() => {
    const w = [];
    const { leaveType, startDate, endDate } = form;
    if (!leaveType || !startDate) {
      setWarnings([]);
      return;
    }

    const meta = LEAVE_TYPE_META[leaveType];

    // Advance notice check
    if (!ADVANCE_NOTICE_EXEMPT.includes(leaveType)) {
      const daysAhead = workingDaysUntil(startDate);
      if (daysAhead < ADVANCE_NOTICE_DAYS) {
        w.push({
          severity: "error",
          text:
            `${meta?.label} requires at least ${ADVANCE_NOTICE_DAYS} working days advance notice. ` +
            `Your leave starts in ${daysAhead} working day(s). It will be treated as Leave Without Pay (LWP).`,
        });
      }
    }

    // ML certificate reminder
    if (leaveType === "ML" && ML_CERTIFICATE_REQUIRED) {
      w.push({
        severity: "info",
        text: "On return from Medical Leave, a physician's certificate describing the nature and duration of the illness is mandatory.",
      });
    }

    // SP — no salary warning
    if (leaveType === "SP") {
      w.push({
        severity: "warning",
        text: "Special Leave carries no salary or allowances. Apply only when no other leave type is available.",
      });
    }

    // LWP warning
    if (leaveType === "LWP") {
      w.push({
        severity: "warning",
        text: "Leave Without Pay will result in salary deduction for the entire duration.",
      });
    }

    // CO restrictions
    if (leaveType === "CO") {
      w.push({
        severity: "info",
        text: "Compensatory Leave cannot be attached to Casual Leave and should not be taken during active academic sessions.",
      });
    }

    // EL restrictions
    if (leaveType === "EL") {
      w.push({
        severity: "info",
        text: `Earned Leave must be availed during non-active periods only and cannot be carried over to the next academic year. Accrual: ${EL_ACCRUAL_FRACTION === 1 / 3 ? "1 day per 3 days detained" : EL_ACCRUAL_FRACTION}.`,
      });
    }

    // Balance check for CL / ML
    if (balance && (leaveType === "CL" || leaveType === "ML")) {
      const key = leaveType === "CL" ? "casual" : "medical";
      const b = balance[key];
      if (b) {
        const requested = calendarDays(startDate, endDate);
        const remaining = b.total - b.used;
        if (requested > remaining) {
          w.push({
            severity: "error",
            text: `You only have ${remaining} day(s) of ${meta?.label} remaining. Excess days will be treated as Leave Without Pay (LWP).`,
          });
        }
      }
    }

    setWarnings(w);
  }, [form, balance]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      setError("Please fill in all required fields.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date cannot be before start date.");
      return;
    }

    // Block if hard errors
    const hasHardError = warnings.some(
      (w) =>
        w.severity === "error" && w.text.includes("will be treated as LWP"),
    );
    setSubmitting(true);
    try {
      await API.post("/leaves", {
        leaveType: form.leaveType.toLowerCase(),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        substitute: form.substitute,
        totalDays: calendarDays(form.startDate, form.endDate),
        treatAsLWP: hasHardError,
      });
      setSuccess(true);
      setForm({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        substitute: "",
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to submit leave application.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const leaveTypes = Object.entries(entitlements).map(([key, val]) => ({
    value: key,
    ...val,
    ...(LEAVE_TYPE_META[key] || {}),
  }));

  const selectedMeta = form.leaveType ? LEAVE_TYPE_META[form.leaveType] : null;
  const selectedEnt = form.leaveType ? entitlements[form.leaveType] : null;
  const totalDays = calendarDays(form.startDate, form.endDate);

  return (
    <Box sx={{ maxWidth: 780, mx: "auto" }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, color: "text.primary" }}
        >
          Apply for Leave
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          Pillai College of Engineering — Academic Year Aug 1 → Jul 31
        </Typography>
      </Box>

      {/* Leave balance summary */}
      {balance && (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            {
              key: "casual",
              label: "Casual Leave",
              code: "CL",
              color: "#7c3aed",
            },
            {
              key: "medical",
              label: "Medical Leave",
              code: "ML",
              color: "#ef4444",
            },
            {
              key: "earned",
              label: "Earned Leave",
              code: "EL",
              color: "#10b981",
            },
          ].map((item) => {
            const b = balance[item.key];
            if (!b) return null;
            const remaining = b.total - b.used;
            const pct = (remaining / b.total) * 100;
            return (
              <Grid item xs={4} key={item.key}>
                <Card
                  sx={{
                    borderRadius: "8px",
                    border: `1px solid ${item.color}20`,
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          color: "text.secondary",
                          fontWeight: 600,
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Chip
                        label={item.code}
                        size="small"
                        sx={{
                          bgcolor: item.color + "15",
                          color: item.color,
                          fontWeight: 700,
                          fontSize: "0.6rem",
                          height: 16,
                          borderRadius: "6px",
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: "1.4rem",
                        color: "text.primary",
                        mt: 0.3,
                      }}
                    >
                      {remaining}
                      <Typography
                        component="span"
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          ml: 0.3,
                        }}
                      >
                        / {b.total}d
                      </Typography>
                    </Typography>
                    <Box
                      sx={{
                        height: 3,
                        borderRadius: "2px",
                        bgcolor: "#e2e8f0",
                        mt: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: "2px",
                          bgcolor: item.color,
                          transition: "width 0.3s",
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Form */}
      <Card sx={{ borderRadius: "8px" }}>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            {/* Leave type */}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}
            >
              Leave Type
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {leaveTypes.map((lt) => {
                const isSelected = form.leaveType === lt.value;
                return (
                  <Grid item xs={6} sm={4} key={lt.value}>
                    <Box
                      onClick={() =>
                        handleChange({
                          target: { name: "leaveType", value: lt.value },
                        })
                      }
                      sx={{
                        p: 1.5,
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1.5px solid ${isSelected ? lt.color || "#7c3aed" : "#e2e8f0"}`,
                        bgcolor: isSelected
                          ? lt.bg || "#f5f3ff"
                          : "background.paper",
                        transition: "all 0.15s",
                        "&:hover": {
                          borderColor: lt.color || "#7c3aed",
                          bgcolor: lt.bg || "#f5f3ff",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.8,
                          mb: 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: 16 }}>
                          {lt.emoji || "📋"}
                        </Typography>
                        <Chip
                          label={lt.value}
                          size="small"
                          sx={{
                            bgcolor: (lt.color || "#7c3aed") + "15",
                            color: lt.color || "#7c3aed",
                            fontWeight: 700,
                            fontSize: "0.58rem",
                            height: 16,
                            borderRadius: "4px",
                          }}
                        />
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.76rem",
                          color: "text.primary",
                        }}
                      >
                        {lt.label}
                      </Typography>
                      {lt.days > 0 && (
                        <Typography
                          sx={{
                            fontSize: "0.65rem",
                            color: "text.secondary",
                            mt: 0.2,
                          }}
                        >
                          {lt.days} days/year
                        </Typography>
                      )}
                      {lt.payStatus === "none" && (
                        <Typography
                          sx={{
                            fontSize: "0.62rem",
                            color: "#ef4444",
                            mt: 0.2,
                            fontWeight: 600,
                          }}
                        >
                          No pay
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            {/* Selected leave info banner */}
            {selectedEnt && (
              <Box
                sx={{
                  mb: 2.5,
                  p: 1.5,
                  bgcolor: selectedMeta?.bg || "#f5f3ff",
                  borderRadius: "8px",
                  border: `1px solid ${selectedMeta?.color || "#7c3aed"}20`,
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-start",
                }}
              >
                <Info
                  sx={{
                    fontSize: 16,
                    color: selectedMeta?.color || "#7c3aed",
                    mt: 0.2,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: selectedMeta?.color || "#7c3aed",
                    }}
                  >
                    {selectedEnt.label}
                    {selectedEnt.days > 0 &&
                      ` — ${selectedEnt.days} days entitlement`}
                    {selectedEnt.payStatus === "none" &&
                      " — No salary/allowances"}
                  </Typography>
                  {selectedEnt.note && (
                    <Typography
                      sx={{
                        fontSize: "0.71rem",
                        color: "text.secondary",
                        mt: 0.3,
                      }}
                    >
                      {selectedEnt.note}
                    </Typography>
                  )}
                  {!ADVANCE_NOTICE_EXEMPT.includes(form.leaveType) && (
                    <Typography
                      sx={{
                        fontSize: "0.71rem",
                        color: "text.secondary",
                        mt: 0.3,
                      }}
                    >
                      ⏰ Requires {ADVANCE_NOTICE_DAYS} working days advance
                      notice. Otherwise treated as Leave Without Pay.
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Dates */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: new Date().toISOString().split("T")[0] }}
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min:
                      form.startDate || new Date().toISOString().split("T")[0],
                  }}
                  size="small"
                  required
                />
              </Grid>
            </Grid>

            {/* Duration pill */}
            {totalDays > 0 && (
              <Box
                sx={{ mb: 2.5, display: "flex", alignItems: "center", gap: 1 }}
              >
                <EventNote sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography
                  sx={{ fontSize: "0.82rem", color: "text.secondary" }}
                >
                  Duration:
                </Typography>
                <Chip
                  label={`${totalDays} day${totalDays > 1 ? "s" : ""}`}
                  size="small"
                  sx={{
                    bgcolor: "#f5f3ff",
                    color: "#7c3aed",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    borderRadius: "8px",
                  }}
                />
              </Box>
            )}

            {/* Reason */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Leave"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              size="small"
              required
              sx={{ mb: 2.5 }}
              placeholder="Briefly describe the reason for your leave request..."
            />

            {/* Substitute */}
            <TextField
              fullWidth
              label="Proposed Substitute (Name)"
              name="substitute"
              value={form.substitute}
              onChange={handleChange}
              size="small"
              sx={{ mb: 2.5 }}
              placeholder="Leave approval is subject to substitute availability..."
              helperText="Required for teaching periods — leave approvals depend on substitute availability."
            />

            {/* ML certificate upload hint */}
            {form.leaveType === "ML" && (
              <Box
                sx={{
                  mb: 2.5,
                  p: 1.5,
                  bgcolor: "#fff7ed",
                  borderRadius: "8px",
                  border: "1px solid #fed7aa",
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <Upload sx={{ fontSize: 16, color: "#f59e0b" }} />
                <Typography sx={{ fontSize: "0.76rem", color: "#92400e" }}>
                  A <strong>physician's certificate</strong> must be submitted
                  upon return from Medical Leave, describing the nature and
                  duration of the illness.
                </Typography>
              </Box>
            )}

            {/* Warnings & errors */}
            {warnings.map((w, i) => (
              <Alert
                key={i}
                severity={w.severity}
                icon={
                  w.severity === "error" ? (
                    <Warning fontSize="small" />
                  ) : w.severity === "info" ? (
                    <Info fontSize="small" />
                  ) : (
                    <Warning fontSize="small" />
                  )
                }
                sx={{ mb: 1.5, borderRadius: "8px", fontSize: "0.78rem" }}
              >
                {w.text}
              </Alert>
            ))}

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 1.5, borderRadius: "8px", fontSize: "0.78rem" }}
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert
                severity="success"
                icon={<CheckCircle fontSize="small" />}
                sx={{ mb: 1.5, borderRadius: "8px", fontSize: "0.78rem" }}
              >
                Leave application submitted successfully. Your HOD will review
                it first, followed by the Principal.
              </Alert>
            )}

            <Divider sx={{ mb: 2.5 }} />

            {/* Policy reminder */}
            <Box
              sx={{
                mb: 2.5,
                p: 1.5,
                bgcolor: "background.default",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Policy Reminders
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {[
                  "Leaves during teaching periods or examinations are highly discouraged.",
                  "All non-CL/ML leaves require HOD sanction + 4 working days advance notice.",
                  "Leave approval depends on prior leave record, syllabus completion, and substitute availability.",
                  `Academic year runs August 1 → July 31. Unused ${role === "faculty" ? "EL" : "CO/EL"} cannot be carried forward.`,
                ].map((pt, i) => (
                  <Typography
                    key={i}
                    component="li"
                    sx={{
                      fontSize: "0.7rem",
                      color: "text.secondary",
                      mb: 0.3,
                    }}
                  >
                    {pt}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={submitting}
              sx={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                fontWeight: 700,
                fontSize: "0.88rem",
                py: 1.2,
                borderRadius: "8px",
                boxShadow: "none",
                "&:hover": {
                  background: "linear-gradient(135deg, #6d28d9, #4338ca)",
                  boxShadow: "none",
                },
              }}
            >
              {submitting ? (
                <CircularProgress size={20} sx={{ color: "white" }} />
              ) : (
                "Submit Leave Application"
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ApplyLeavePage;
