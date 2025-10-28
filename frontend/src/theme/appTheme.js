import { createTheme } from "@mui/material/styles";

const appTheme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#06C167" },
  },
  typography: {
    fontFamily: "Inter, Helvetica Neue, sans-serif",
  },
});

export default appTheme;