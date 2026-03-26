import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { TrendingUp, People } from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const SubscriberAnalytics = () => {
  const [timeRange, setTimeRange] = useState("weekly");

  // Sample data - replace with real data from your API
  const weeklyData = [
    { day: "Sun", subscribers: 1200 },
    { day: "Mon", subscribers: 1600 },
    { day: "Tue", subscribers: 3874, highlight: true },
    { day: "Wed", subscribers: 1400 },
    { day: "Thu", subscribers: 2100 },
    { day: "Fri", subscribers: 1800 },
    { day: "Sat", subscribers: 2600 },
  ];

  const totalSubscribers = 24473;
  const percentageIncrease = 8.3;
  const absoluteIncrease = 749;
  const maxSubscribers = Math.max(...weeklyData.map((d) => d.subscribers));

  return (
    <Card
      sx={{
        borderRadius: "16px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        bgcolor: "#ffffff",
        mb: 2.5,
      }}
    >
      <CardContent sx={{ p: 3.5 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: "#f0f4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <People sx={{ color: "#7c3aed", fontSize: 24 }} />
            </Box>
            <Typography
              sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}
            >
              Total Subscriber
            </Typography>
          </Box>
          <FormControl variant="outlined" size="small">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              sx={{
                bgcolor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#6b7280",
                border: "1px solid #e5e7eb",
              }}
            >
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Main Statistics */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: "2.5rem",
              fontWeight: 900,
              color: "#0f172a",
              mb: 0.5,
            }}
          >
            {totalSubscribers.toLocaleString()}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "#d1fae5",
                px: 1.5,
                py: 0.5,
                borderRadius: "6px",
              }}
            >
              <TrendingUp sx={{ fontSize: 16, color: "#10b981" }} />
              <Typography
                sx={{ fontWeight: 700, color: "#10b981", fontSize: "0.9rem" }}
              >
                {percentageIncrease}%
              </Typography>
            </Box>
            <Typography sx={{ color: "#9ca3af", fontSize: "0.9rem" }}>
              +{absoluteIncrease.toLocaleString()} increased
            </Typography>
          </Box>
        </Box>

        {/* Chart */}
        <Box sx={{ height: 250, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value) => value.toLocaleString()}
                labelStyle={{ color: "#0f172a", fontWeight: 600 }}
              />
              <Bar dataKey="subscribers" fill="#7c3aed" radius={[8, 8, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.highlight ? "#7c3aed" : "#e0e7ff"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Peak Value Label */}
        <Box
          sx={{ textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}
        >
          Peak:{" "}
          {weeklyData.find((d) => d.highlight)?.subscribers.toLocaleString()} on
          Tuesday
        </Box>
      </CardContent>
    </Card>
  );
};

export default SubscriberAnalytics;
