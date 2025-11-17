import { createTheme } from "@mui/material/styles";

const appTheme = createTheme({
  palette: {
    primary: { main: "#16A34A" },
    secondary: { main: "#22C55E" },
  },
  typography: {
    fontFamily: "Inter, Helvetica Neue, sans-serif",
  },
});

export default appTheme;