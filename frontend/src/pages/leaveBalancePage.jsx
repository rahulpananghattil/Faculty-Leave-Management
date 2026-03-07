import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import {
  BeachAccess,
  LocalHospital,
  Star,
  Repeat,
  AccountBalance,
  PauseCircle,
  WorkOff,
  Info,
} from "@mui/icons-material";
import { useAuth } from "../context/authContext";
import API from "../api/axiosInstance";
import {
  LEAVE_ENTITLEMENTS,
  LEAVE_TYPE_META,
  PUBLIC_HOLIDAYS,
  HOLIDAY_ENTITLEMENTS,
  ACADEMIC_YEAR_START_MONTH,
} from "../constants/leavePolicy";

const TYPE_ICON = {
  CL: <BeachAccess sx={{ fontSize: 18 }} />,
  ML: <LocalHospital sx={{ fontSize: 18 }} />,
  EL: <Star sx={{ fontSize: 18 }} />,
  CO: <Repeat sx={{ fontSize: 18 }} />,
  OD: <AccountBalance sx={{ fontSize: 18 }} />,
  SP: <PauseCircle sx={{ fontSize: 18 }} />,
  LWP: <WorkOff sx={{ fontSize: 18 }} />,
};

/* Academic year label */
const academicYearLabel = () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const startYear = m >= ACADEMIC_YEAR_START_MONTH ? y : y - 1;
  return `${startYear}–${(startYear + 1).toString().slice(2)}`;
};

const LeaveBalancePage = () => {
  const { user } = useAuth();
  const role = user?.role || "faculty";
  const entitlements = LEAVE_ENTITLEMENTS[role] || LEAVE_ENTITLEMENTS.faculty;
  const holidayEnt = HOLIDAY_ENTITLEMENTS[role] || HOLIDAY_ENTITLEMENTS.faculty;

  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get("/leaves/balance"), API.get("/leaves")])
      .then(([b, l]) => {
        setBalance(b.data);
        setHistory(l.data.filter((lv) => lv.status === "approved"));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress sx={{ color: "#7c3aed" }} />
      </Box>
    );

  /* Build display rows from entitlements + API balance */
  const leaveRows = Object.entries(entitlements).map(([code, ent]) => {
    const apiKey = {
      CL: "casual",
      ML: "medical",
      EL: "earned",
      CO: "compensatory",
    }[code];
    const apiData = apiKey && balance?.[apiKey];
    const meta = LEAVE_TYPE_META[code] || {};
    return {
      code,
      label: ent.label,
      total: apiData?.total ?? ent.days,
      used: apiData?.used ?? 0,
      remaining: apiData ? apiData.total - apiData.used : ent.days,
      color: meta.color || "#7c3aed",
      bg: meta.bg || "#f5f3ff",
      emoji: meta.emoji || "📋",
      payStatus: ent.payStatus,
      note: ent.note,
    };
  });

  const totalUsed = leaveRows.reduce((s, r) => s + r.used, 0);

  return (
    <Box sx={{ maxWidth: 860, mx: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, color: "text.primary" }}
          >
            Leave Balance
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.4 }}>
            Academic Year {academicYearLabel()} &nbsp;·&nbsp; Aug 1 → Jul 31
          </Typography>
        </Box>
        <Chip
          label={`${totalUsed} days used`}
          sx={{
            bgcolor: "#f5f3ff",
            color: "#7c3aed",
            fontWeight: 700,
            fontSize: "0.75rem",
            borderRadius: "8px",
          }}
        />
      </Box>

      {/* Balance cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {leaveRows.map((row) => {
          const pct = row.total > 0 ? (row.used / row.total) * 100 : 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={row.code}>
              <Card
                sx={{
                  borderRadius: "8px",
                  border: `1px solid ${row.color}20`,
                  height: "100%",
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1.2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "8px",
                          bgcolor: row.bg,
                          color: row.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {TYPE_ICON[row.code] || (
                          <span style={{ fontSize: 16 }}>{row.emoji}</span>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            color: "text.primary",
                          }}
                        >
                          {row.label}
                        </Typography>
                        <Chip
                          label={row.code}
                          size="small"
                          sx={{
                            bgcolor: row.color + "15",
                            color: row.color,
                            fontWeight: 700,
                            fontSize: "0.58rem",
                            height: 15,
                            borderRadius: "4px",
                            mt: 0.2,
                          }}
                        />
                      </Box>
                    </Box>
                    {row.payStatus === "none" && (
                      <Chip
                        label="No Pay"
                        size="small"
                        sx={{
                          bgcolor: "#fee2e2",
                          color: "#991b1b",
                          fontWeight: 700,
                          fontSize: "0.58rem",
                          height: 16,
                          borderRadius: "4px",
                        }}
                      />
                    )}
                  </Box>

                  {row.total > 0 ? (
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                        >
                          Used: <strong>{row.used}</strong>
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                        >
                          Remaining:{" "}
                          <strong style={{ color: row.color }}>
                            {row.remaining}
                          </strong>
                          /{row.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 5,
                          borderRadius: "2px",
                          bgcolor: row.color + "20",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: "2px",
                            bgcolor: pct > 80 ? "#ef4444" : row.color,
                          },
                        }}
                      />
                    </>
                  ) : (
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "text.secondary",
                        mt: 0.5,
                      }}
                    >
                      As assigned / on request
                    </Typography>
                  )}

                  {row.note && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 1,
                        alignItems: "flex-start",
                      }}
                    >
                      <Info
                        sx={{
                          fontSize: 12,
                          color: "text.disabled",
                          mt: 0.15,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.63rem",
                          color: "text.disabled",
                          lineHeight: 1.4,
                        }}
                      >
                        {row.note}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Holiday entitlement */}
      <Card sx={{ borderRadius: "8px", mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Holiday Entitlement
          </Typography>
          {role === "faculty" ? (
            <>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "8px",
                    bgcolor: "#f5f3ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  🏖️
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "1.4rem",
                      color: "#7c3aed",
                    }}
                  >
                    {holidayEnt.totalHolidayDays}
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.8rem",
                        color: "text.secondary",
                        fontWeight: 500,
                        ml: 0.5,
                      }}
                    >
                      days
                    </Typography>
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.72rem", color: "text.secondary" }}
                  >
                    Annual faculty holiday entitlement
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={1} sx={{ mb: 1.2 }}>
                {holidayEnt.periods.map((p) => (
                  <Grid item xs={6} key={p.name}>
                    <Box
                      sx={{
                        p: 1.2,
                        bgcolor: "background.default",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "text.primary",
                        }}
                      >
                        {p.name}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                      >
                        ~{p.approxDays} days
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Typography
                sx={{ fontSize: "0.68rem", color: "#f59e0b", fontWeight: 600 }}
              >
                ⚠ {holidayEnt.note}
              </Typography>
            </>
          ) : (
            <Grid container spacing={1}>
              {holidayEnt.specificHolidays?.map((h) => (
                <Grid item xs={6} key={h.name}>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: "background.default",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                    >
                      {h.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "#7c3aed",
                        fontWeight: 600,
                      }}
                    >
                      {h.days} days
                    </Typography>
                  </Box>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Typography
                  sx={{ fontSize: "0.68rem", color: "text.secondary", mt: 0.5 }}
                >
                  {holidayEnt.note}
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Public holidays */}
      <Card sx={{ borderRadius: "8px", mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Public Holidays Observed
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {PUBLIC_HOLIDAYS.map((h) => (
              <Chip
                key={h}
                label={h}
                size="small"
                sx={{
                  bgcolor: "background.default",
                  color: "text.secondary",
                  fontWeight: 500,
                  fontSize: "0.72rem",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "8px",
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Approved leave history */}
      <Card sx={{ borderRadius: "8px" }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              Approved Leaves This Academic Year
            </Typography>
          </Box>
          <Divider />
          {history.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography sx={{ color: "text.disabled", fontSize: "0.85rem" }}>
                No approved leaves recorded yet
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "background.default" }}>
                  {["Type", "From", "To", "Days", "Status"].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        color: "text.disabled",
                        letterSpacing: "0.04em",
                        py: 1.2,
                      }}
                    >
                      {h.toUpperCase()}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((lv) => {
                  const code = lv.leaveType?.toUpperCase();
                  const meta = LEAVE_TYPE_META[code] || {};
                  return (
                    <TableRow key={lv._id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: "6px",
                              bgcolor: meta.bg || "#f5f3ff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                            }}
                          >
                            {meta.emoji || "📋"}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: meta.color || "#7c3aed",
                              textTransform: "uppercase",
                            }}
                          >
                            {code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                        >
                          {new Date(lv.startDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                        >
                          {new Date(lv.endDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            color: "text.primary",
                          }}
                        >
                          {lv.totalDays}d
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Approved"
                          size="small"
                          sx={{
                            bgcolor: "#dcfce7",
                            color: "#166534",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            borderRadius: "6px",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default LeaveBalancePage;
