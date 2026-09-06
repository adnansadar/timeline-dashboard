import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import type { ApiError } from "../api/client";

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Box sx={{ display: "grid", justifyItems: "center", gap: 2 }}>
        <CircularProgress />
        {label ? (
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

export function EmptyBanner({ hasSegments }: { hasSegments: boolean }) {
  return (
    <Alert severity="info">
      {hasSegments
        ? "No production recorded for this shift. The timeline still shows runtime and downtime."
        : "No data for this shift. Try a date between 22 and 25 June 2026."}
    </Alert>
  );
}

export function ErrorAlert({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  // Retrying a 4xx just repeats the same answer.
  const canRetry = error.isRetryable;

  return (
    <Alert
      severity={error.status === 403 ? "warning" : "error"}
      action={
        canRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{error.message}</AlertTitle>
      {error.fieldErrors.length > 0 ? (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {error.fieldErrors.map((field) => (
            <li key={`${field.field}:${field.message}`}>
              <Typography variant="body2">
                <strong>{field.field}</strong>: {field.message}
              </Typography>
            </li>
          ))}
        </Box>
      ) : null}
      {error.traceId ? (
        <Typography variant="caption" color="text.secondary">
          Trace {error.traceId}
        </Typography>
      ) : null}
    </Alert>
  );
}
