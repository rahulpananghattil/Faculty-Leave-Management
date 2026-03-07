import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  IconButton,
} from "@mui/material";
import {
  AutoAwesome,
  TrendingUp,
  Warning,
  Info,
  CheckCircle,
  MoreHoriz,
} from "@mui/icons-material";
import API from "../../api/axiosInstance";

const AiInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/leaves/ai-insights")
      .then(({ data }) => setInsights(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <LinearProgress
            sx={{
              borderRadius: 2,
              bgcolor: "#eef2ff",
              "& .MuiLinearProgress-bar": { bgcolor: "#6366f1" },
            }}
          />
        </CardContent>
      </Card>
    );
  if (!insights) return null;

  const { riskScore, recommendations, anomalies, workloadImpact } = insights;

  const riskColor =
    riskScore >= 70 ? "#ef4444" : riskScore >= 40 ? "#f59e0b" : "#10b981";
  const riskBg =
    riskScore >= 70 ? "#fee2e2" : riskScore >= 40 ? "#fef3c7" : "#d1fae5";
  const riskLabel =
    riskScore >= 70 ? "High Risk" : riskScore >= 40 ? "Medium" : "Low Risk";

  const iconMap = {
    warning: <Warning sx={{ color: "#f59e0b", fontSize: 16 }} />,
    info: <Info sx={{ color: "#6366f1", fontSize: 16 }} />,
    alert: <Warning sx={{ color: "#ef4444", fontSize: 16 }} />,
    success: <CheckCircle sx={{ color: "#10b981", fontSize: 16 }} />,
  };

  const impactColor =
    {
      high: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
      medium: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
      low: { bg: "#d1fae5", border: "#6ee7b7", text: "#065f46" },
    }[workloadImpact.level] || {};

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AutoAwesome sx={{ color: "white", fontSize: 15 }} />
            </Box>
            <Typography variant="h6">AI Insights</Typography>
          </Box>
          <IconButton size="small" sx={{ color: "#94a3b8" }}>
            <MoreHoriz fontSize="small" />
          </IconButton>
        </Box>

        {/* Risk score */}
        <Box
          sx={{
            p: 2,
            bgcolor: riskBg,
            borderRadius: 2.5,
            mb: 2,
            border: `1px solid ${riskColor}30`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.2,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "#334155" }}
            >
              Leave Risk Score
            </Typography>
            <Chip
              label={riskLabel}
              size="small"
              sx={{
                bgcolor: riskColor,
                color: "white",
                fontWeight: 700,
                fontSize: "0.68rem",
                height: 20,
              }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, mb: 1 }}>
            <Typography
              sx={{
                fontSize: "2rem",
                fontWeight: 800,
                color: riskColor,
                lineHeight: 1,
              }}
            >
              {riskScore}
            </Typography>
            <Typography variant="caption" color="text.secondary" mb={0.3}>
              /100
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={riskScore}
            sx={{
              height: 5,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.6)",
              "& .MuiLinearProgress-bar": {
                bgcolor: riskColor,
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Workload impact */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            mb: 2,
            bgcolor: impactColor.bg,
            border: `1px solid ${impactColor.border}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <TrendingUp sx={{ fontSize: 15, color: impactColor.text }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: impactColor.text }}
            >
              Workload: {workloadImpact.level.toUpperCase()}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: impactColor.text, opacity: 0.85 }}
          >
            {workloadImpact.suggestion}
          </Typography>
        </Box>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.05em",
              }}
            >
              RECOMMENDATIONS
            </Typography>
            <List dense disablePadding sx={{ mt: 0.5, mb: 1 }}>
              {recommendations.map((rec, i) => (
                <ListItem
                  key={i}
                  disablePadding
                  sx={{ mb: 0.5, alignItems: "flex-start" }}
                >
                  <ListItemIcon sx={{ minWidth: 26, mt: 0.2 }}>
                    {iconMap[rec.type]}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="caption"
                        sx={{ color: "#334155", lineHeight: 1.5 }}
                      >
                        {rec.message}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.05em",
              }}
            >
              PATTERN ALERTS
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {anomalies.map((alert, i) => (
                <Alert
                  key={i}
                  severity="warning"
                  icon={<Warning sx={{ fontSize: 14 }} />}
                  sx={{
                    mb: 0.8,
                    py: 0.3,
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    "& .MuiAlert-message": { fontSize: "0.75rem" },
                  }}
                >
                  {alert}
                </Alert>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AiInsights;
