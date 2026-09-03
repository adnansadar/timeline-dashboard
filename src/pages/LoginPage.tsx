import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { ApiError } from "../api/client";
import { FullScreenLoader } from "../components/StateViews";
import { useAuth } from "../hooks/authContext";

export default function LoginPage() {
  const { isAuthenticated, isRestoring, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const usernameError =
    submitted && !username.trim() ? "Username is required" : "";
  const passwordError = submitted && !password ? "Password is required" : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError(null);

    if (!username.trim() || !password) return;

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(toLoginMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (isRestoring) return <FullScreenLoader label="Restoring your session…" />;

  return (
    <Box
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}
    >
      <Card sx={{ width: "100%", maxWidth: 400 }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Timeline Dashboard
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, mb: 3 }}
          >
            Sign in to continue
          </Typography>

          <form onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              {formError ? <Alert severity="error">{formError}</Alert> : null}

              <TextField
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                error={Boolean(usernameError)}
                helperText={usernameError}
                autoComplete="username"
                autoFocus
                fullWidth
                disabled={submitting}
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={Boolean(passwordError)}
                helperText={passwordError}
                autoComplete="current-password"
                fullWidth
                disabled={submitting}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

function toLoginMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }

  if (error.status === 401) return "Invalid username or password.";
  return error.message;
}
