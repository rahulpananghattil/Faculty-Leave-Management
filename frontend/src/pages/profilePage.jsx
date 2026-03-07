import React, { useState, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Chip,
  IconButton,
} from "@mui/material";
import {
  CameraAlt,
  Delete,
  Save,
  Person,
  Email,
  Phone,
  School,
  Work,
  CheckCircle,
} from "@mui/icons-material";
import { useAuth } from "../context/authContext";
import { getAvatarUrl } from "../api/axiosInstance";

const ProfilePage = () => {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const fileInputRef = useRef(null);

  const avatarUrl = getAvatarUrl(user?.avatar);

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    designation: user?.designation || "",
    subjects: user?.subjects?.join(", ") || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };
  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3500);
  };

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
        designation: form.designation,
        subjects: form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      showSuccess("Profile updated successfully.");
    } catch {
      showError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    /* Client-side validation */
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      showError("Only JPEG, PNG, WEBP and GIF images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Image must be under 5MB.");
      return;
    }

    /* Preview immediately */
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      await uploadAvatar(file);
      setPreviewUrl(null);
      showSuccess("Profile photo updated successfully.");
    } catch {
      setPreviewUrl(null);
      showError("Failed to upload photo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setRemoving(true);
    try {
      await removeAvatar();
      setPreviewUrl(null);
      showSuccess("Profile photo removed.");
    } catch {
      showError("Failed to remove photo.");
    } finally {
      setRemoving(false);
    }
  };

  const displayAvatar = previewUrl || avatarUrl;
  const roleColor = { admin: "#ef4444", hod: "#f59e0b", faculty: "#7c3aed" };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, color: "text.primary" }}
        >
          My Profile
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.4 }}>
          Manage your account details and profile photo
        </Typography>
      </Box>

      {/* Alerts */}
      {successMsg && (
        <Alert
          severity="success"
          icon={<CheckCircle fontSize="small" />}
          sx={{ mb: 2, borderRadius: "8px" }}
        >
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: "8px" }}>
          {errorMsg}
        </Alert>
      )}

      {/* Avatar upload card */}
      <Card sx={{ borderRadius: "8px", mb: 2.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2.5 }}>
            Profile Photo
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            {/* Avatar preview */}
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={displayAvatar || undefined}
                sx={{
                  width: 90,
                  height: 90,
                  fontSize: 32,
                  fontWeight: 900,
                  background: displayAvatar
                    ? "none"
                    : `linear-gradient(135deg, ${roleColor[user?.role] || "#7c3aed"}, #4f46e5)`,
                  borderRadius: "16px",
                  border: "3px solid",
                  borderColor: "divider",
                }}
              >
                {!displayAvatar && user?.name?.charAt(0)}
              </Avatar>

              {/* Loading spinner overlay */}
              {(uploading || removing) && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "16px",
                    bgcolor: "rgba(0,0,0,0.45)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={24} sx={{ color: "white" }} />
                </Box>
              )}

              {/* Camera icon badge */}
              {!uploading && !removing && (
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: "absolute",
                    bottom: -6,
                    right: -6,
                    width: 28,
                    height: 28,
                    bgcolor: "#7c3aed",
                    color: "white",
                    border: "2px solid white",
                    borderRadius: "8px",
                    "&:hover": { bgcolor: "#6d28d9" },
                  }}
                >
                  <CameraAlt sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>

            {/* Buttons + hint */}
            <Box>
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CameraAlt sx={{ fontSize: 15 }} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || removing}
                  sx={{
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    borderColor: "#7c3aed",
                    color: "#7c3aed",
                    "&:hover": { bgcolor: "#f5f3ff", borderColor: "#6d28d9" },
                  }}
                >
                  {uploading ? "Uploading…" : "Upload Photo"}
                </Button>

                {(user?.avatar || previewUrl) && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Delete sx={{ fontSize: 15 }} />}
                    onClick={handleRemoveAvatar}
                    disabled={uploading || removing}
                    sx={{
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      borderColor: "#fecaca",
                      color: "#ef4444",
                      "&:hover": { bgcolor: "#fef2f2", borderColor: "#ef4444" },
                    }}
                  >
                    {removing ? "Removing…" : "Remove Photo"}
                  </Button>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontSize: "0.7rem" }}
              >
                Max 5MB · JPEG, PNG, WEBP, GIF
              </Typography>
            </Box>
          </Box>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Profile info card */}
      <Card sx={{ borderRadius: "8px" }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Personal Information
            </Typography>
            <Chip
              label={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              size="small"
              sx={{
                bgcolor: `${roleColor[user?.role]}15`,
                color: roleColor[user?.role],
                fontWeight: 700,
                fontSize: "0.7rem",
                borderRadius: "8px",
              }}
            />
          </Box>

          <Grid container spacing={2}>
            {/* Read-only fields */}
            <Grid item xs={12} sm={6}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <Email sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.65rem",
                  }}
                >
                  Email
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: "text.primary",
                  bgcolor: "background.default",
                  p: 1,
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {user?.email}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <School sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.65rem",
                  }}
                >
                  Department
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: "text.primary",
                  bgcolor: "background.default",
                  p: 1,
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {user?.department}
              </Typography>
            </Grid>

            {/* Editable fields */}
            <Grid item xs={12} sm={6}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <Person sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.65rem",
                  }}
                >
                  Full Name
                </Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                name="name"
                value={form.name}
                onChange={handleChange}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <Phone sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.65rem",
                  }}
                >
                  Phone
                </Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <Work sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.65rem",
                  }}
                >
                  Designation
                </Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="e.g. Assistant Professor"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <School sx={{ fontSize: 15, color: "text.disabled" }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontSize: "0.65rem",
                  }}
                >
                  Subjects (comma-separated)
                </Typography>
              </Box>
              <TextField
                fullWidth
                size="small"
                name="subjects"
                value={form.subjects}
                onChange={handleChange}
                placeholder="e.g. Maths, Physics, Chemistry"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={15} sx={{ color: "white" }} />
              ) : (
                <Save sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              fontWeight: 700,
              fontSize: "0.85rem",
              px: 3,
              py: 1,
              borderRadius: "8px",
              boxShadow: "none",
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9, #4338ca)",
                boxShadow: "none",
              },
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
