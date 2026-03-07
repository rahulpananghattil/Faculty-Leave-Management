import React, { useEffect, useState } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Avatar,
  Chip, Switch, CircularProgress, Alert, Divider,
  TextField, InputAdornment,
} from "@mui/material";
import { SmartToy, Search } from "@mui/icons-material";
import API from "../api/axiosInstance";
import { useAuth } from "../context/authContext";

const SubstitutePage = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    Promise.all([API.get("/users"), API.get("/leaves/substitutes")])
      .then(([u, s]) => { setFaculty(u.data); setSuggestions(s.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggleAvailability = async (id, current) => {
    try {
      await API.put(`/users/${id}/availability`, { isAvailable: !current });
      setFaculty((prev) => prev.map((f) => f._id === id ? { ...f, isAvailable: !current } : f));
      setSuccessMsg("Availability updated!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch { }
  };

  const filteredFaculty = faculty.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.department.toLowerCase().includes(search.toLowerCase())
  );

  const suggestedIds = new Set(suggestions.map((s) => s._id));

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} color="primary.main" mb={1}>Substitute Management</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        AI-powered substitute assignment and faculty availability tracking
      </Typography>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      {suggestions.length > 0 && (
        <Card sx={{ mb: 3, border: "2px solid", borderColor: "primary.light" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SmartToy color="primary" />
              <Typography variant="h6" fontWeight={700}>AI-Recommended Substitutes</Typography>
              <Chip label="Auto-Selected" size="small" color="primary" />
            </Box>
            <Grid container spacing={2}>
              {suggestions.map((sub, i) => (
                <Grid item xs={12} sm={4} key={sub._id}>
                  <Box sx={{
                    p: 2, bgcolor: i === 0 ? "#e8eaf6" : "grey.50", borderRadius: 2,
                    border: "1px solid", borderColor: i === 0 ? "primary.light" : "divider",
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ bgcolor: i === 0 ? "primary.main" : "grey.400", width: 40, height: 40 }}>
                        {sub.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{sub.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{sub.department}</Typography>
                      </Box>
                    </Box>
                    {i === 0 && <Chip label="Best Match" size="small" color="primary" sx={{ fontSize: "0.65rem" }} />}
                    {i === 1 && <Chip label="Good Match" size="small" color="secondary" sx={{ fontSize: "0.65rem" }} />}
                    {i === 2 && <Chip label="Alternative" size="small" color="default" sx={{ fontSize: "0.65rem" }} />}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>All Faculty</Typography>
        <TextField size="small" placeholder="Search faculty…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 260 }} />
      </Box>

      <Grid container spacing={2}>
        {filteredFaculty.map((f) => (
          <Grid item xs={12} sm={6} md={4} key={f._id}>
            <Card sx={{
              border: suggestedIds.has(f._id) ? "2px solid" : "1px solid",
              borderColor: suggestedIds.has(f._id) ? "primary.light" : "divider",
            }}>
              <CardContent sx={{ pb: "12px !important" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: f.isAvailable ? "primary.main" : "grey.400", width: 44, height: 44, fontWeight: 700 }}>
                    {f.name.charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{f.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.department}</Typography>
                    {suggestedIds.has(f._id) && (
                      <Chip label="AI Suggested" size="small" color="primary" sx={{ ml: 0.5, height: 16, fontSize: "0.55rem" }} />
                    )}
                  </Box>
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Chip label={f.isAvailable ? "Available" : "Unavailable"}
                    color={f.isAvailable ? "success" : "default"} size="small" />
                  {(user?.role === "admin" || user?.role === "hod" || f._id === user?._id) && (
                    <Switch size="small" checked={f.isAvailable}
                      onChange={() => toggleAvailability(f._id, f.isAvailable)} />
                  )}
                </Box>
                {f.subjects?.length > 0 && (
                  <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {f.subjects.slice(0, 2).map((s) => (
                      <Chip key={s} label={s} size="small" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
                    ))}
                    {f.subjects.length > 2 && (
                      <Chip label={`+${f.subjects.length - 2}`} size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SubstitutePage;