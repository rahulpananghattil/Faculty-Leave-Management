import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#7c3aed",
      light: "#a78bfa",
      dark: "#5b21b6",
      contrastText: "#fff",
    },
    secondary: { main: "#06b6d4" },
    success: { main: "#10b981", light: "#d1fae5" },
    warning: { main: "#f59e0b", light: "#fef3c7" },
    error: { main: "#ef4444", light: "#fee2e2" },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#64748b",
    },
    divider: "#e2e8f0",
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  shadows: [
    "none",
    "0 1px 3px rgba(0,0,0,0.04)",
    "0 2px 6px rgba(0,0,0,0.06)",
    "0 4px 12px rgba(0,0,0,0.07)",
    ...Array(21).fill("0 4px 20px rgba(0,0,0,0.09)"),
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px",
          fontSize: "0.85rem",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.72rem",
          borderRadius: "8px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            "& fieldset": { borderColor: "#e2e8f0" },
            "&:hover fieldset": { borderColor: "#c4b5fd" },
            "&.Mui-focused fieldset": { borderColor: "#7c3aed" },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ffffff",
          border: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: "8px" },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "#e2e8f0" } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          minHeight: 40,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: "8px" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: "8px" },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: "8px" },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        rounded: { borderRadius: "8px" },
      },
    },
  },
});

export default theme;
