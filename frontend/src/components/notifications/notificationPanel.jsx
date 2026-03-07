import React, { useEffect, useState } from "react";
import {
  Box, Typography, List, ListItem, ListItemText,
  Chip, Divider, Button, CircularProgress,
} from "@mui/material";
import { Circle } from "@mui/icons-material";
import API from "../../api/axiosInstance";

const typeColors = {
  leave_applied: "#0288d1", leave_approved: "#2e7d32",
  leave_rejected: "#d32f2f", substitute_assigned: "#ed6c02", ai_alert: "#7b1fa2",
};

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get("/notifications");
      setNotifications(data);
    } finally { setLoading(false); }
  };

  const markAllRead = async () => {
    await API.put("/notifications/read-all");
    fetchNotifications();
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>All Notifications</Typography>
        <Button size="small" onClick={markAllRead}>Mark All Read</Button>
      </Box>
      <List disablePadding>
        {notifications.map((notif, i) => (
          <React.Fragment key={notif._id}>
            <ListItem alignItems="flex-start"
              sx={{ py: 1.5, px: 0, bgcolor: notif.isRead ? "transparent" : "rgba(26,35,126,0.03)", borderRadius: 1 }}>
              <Circle sx={{ fontSize: 10, color: typeColors[notif.type] || "#757575", mt: 1, mr: 2, flexShrink: 0 }} />
              <ListItemText
                primary={<Typography variant="body2" fontWeight={notif.isRead ? 400 : 600}>{notif.message}</Typography>}
                secondary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notif.createdAt).toLocaleString()}
                    </Typography>
                    {!notif.isRead && <Chip label="New" size="small" color="primary" sx={{ height: 16, fontSize: "0.6rem" }} />}
                  </Box>
                }
              />
            </ListItem>
            {i < notifications.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {notifications.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={4}>No notifications</Typography>
        )}
      </List>
    </Box>
  );
};

export default NotificationPanel;