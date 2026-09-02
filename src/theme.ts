import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  typography: {
    fontSize: 13,
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: { whiteSpace: "nowrap" },
      },
    },
  },
});
