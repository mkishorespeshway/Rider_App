import { createTheme } from "@mui/material/styles";

const appTheme = createTheme({
  palette: {
    primary: { main: "#00bfa6" },
    secondary: { main: "#2ec4b6" },
  },
  typography: {
    fontFamily: "Inter, Helvetica Neue, sans-serif",
  },
});

export default appTheme;