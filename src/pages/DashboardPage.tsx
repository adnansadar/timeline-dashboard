import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function DashboardPage() {
  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h6">Timeline Dashboard</Typography>
      <Typography variant="body2" color="text.secondary">
        Filters, chart and hourly table
      </Typography>
    </Container>
  );
}
