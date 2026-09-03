import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import AppHeader from "../components/AppHeader";

export default function DashboardPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppHeader />
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Filters, chart and hourly table land here
        </Typography>
      </Container>
    </Box>
  );
}
