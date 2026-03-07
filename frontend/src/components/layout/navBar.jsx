import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  Typography,
  InputBase,
  Button,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications,
  Logout,
  Person,
  Search,
  Circle,
} from "@mui/icons-material";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import API, { getAvatarUrl } from "../../api/axiosInstance";

const DRAWER_WIDTH = 210;

const NavBar = ({ setMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get("/notifications");
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch {}
  };

  const handleMarkRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };
  const handleMarkAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      fetchNotifications();
    } catch {}
  };

  const typeColor = (type) =>
    ({
      leave_approved: "#10b981",
      leave_rejected: "#ef4444",
      leave_applied: "#7c3aed",
      substitute_assigned: "#f59e0b",
      ai_alert: "#8b5cf6",
    })[type] || "#94a3b8";

  const avatarUrl = getAvatarUrl(user?.avatar);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ minHeight: "60px !important", gap: 1.5 }}>
        <IconButton
          onClick={() => setMobileOpen(true)}
          sx={{ display: { md: "none" }, color: "text.secondary" }}
        >
          <MenuIcon />
        </IconButton>

        {/* Search */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "background.default",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "8px",
            px: 1.5,
            py: 0.6,
            width: 280,
            flexShrink: 0,
            "&:focus-within": { borderColor: "#c4b5fd" },
            transition: "border-color 0.15s",
          }}
        >
          <Search sx={{ color: "text.disabled", fontSize: 17 }} />
          <InputBase
            placeholder="Search anything..."
            sx={{
              flex: 1,
              fontSize: "0.84rem",
              color: "text.primary",
              "& input::placeholder": { color: "text.disabled" },
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Apply Leave CTA */}
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate("/apply-leave")}
          sx={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            fontWeight: 700,
            fontSize: "0.82rem",
            px: 2.5,
            py: 0.85,
            borderRadius: "8px",
            boxShadow: "none",
            "&:hover": {
              background: "linear-gradient(135deg, #6d28d9, #4338ca)",
              boxShadow: "none",
            },
          }}
        >
          + Apply Leave
        </Button>

        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={{
              color: "text.secondary",
              bgcolor: "background.default",
              width: 36,
              height: 36,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
              "&:hover": { borderColor: "#c4b5fd" },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.6rem",
                  minWidth: 14,
                  height: 14,
                },
              }}
            >
              <Notifications fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Notifications dropdown */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{
            sx: {
              width: 360,
              maxHeight: 460,
              mt: 1.5,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            },
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Typography
                variant="caption"
                sx={{ color: "#7c3aed", cursor: "pointer", fontWeight: 600 }}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Typography>
            )}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Notifications
                sx={{ color: "text.disabled", fontSize: 36, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                All caught up!
              </Typography>
            </Box>
          ) : (
            notifications.slice(0, 8).map((notif) => (
              <MenuItem
                key={notif._id}
                onClick={() => handleMarkRead(notif._id)}
                sx={{
                  py: 1.2,
                  px: 2,
                  alignItems: "flex-start",
                  bgcolor: notif.isRead
                    ? "transparent"
                    : "rgba(124,58,237,0.04)",
                  borderLeft: `3px solid ${notif.isRead ? "transparent" : typeColor(notif.type)}`,
                }}
              >
                <Circle
                  sx={{
                    fontSize: 7,
                    color: typeColor(notif.type),
                    mt: 0.9,
                    mr: 1.5,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: notif.isRead ? 400 : 600,
                      fontSize: "0.82rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {notif.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notif.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>

        {/* Avatar / user menu */}
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.8,
            cursor: "pointer",
            p: 0.5,
            borderRadius: "8px",
            "&:hover": { bgcolor: "background.default" },
          }}
        >
          <Avatar
            src={avatarUrl || undefined}
            sx={{
              width: 32,
              height: 32,
              fontSize: 13,
              fontWeight: 700,
              background: avatarUrl
                ? "none"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              borderRadius: "8px",
            }}
          >
            {!avatarUrl && user?.name?.charAt(0)}
          </Avatar>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.2 }}>
            <Typography variant="subtitle2" fontWeight={700} fontSize="0.85rem">
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              navigate("/profile");
              setAnchorEl(null);
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon>
              <Person fontSize="small" sx={{ color: "#7c3aed" }} />
            </ListItemIcon>
            <Typography variant="body2">Profile</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              logout();
              navigate("/login");
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon>
              <Logout fontSize="small" color="error" />
            </ListItemIcon>
            <Typography variant="body2" color="error">
              Logout
            </Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
