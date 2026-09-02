import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function LoginPage() {
  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5">Sign in</Typography>
      <Typography variant="body2" color="text.secondary">
        Login form
      </Typography>
    </Container>
  );
}
