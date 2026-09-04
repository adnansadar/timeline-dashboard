import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import type { HourColumn } from "../utils/segments";
import { formatCycleSeconds, formatMinutes } from "../utils/format";

interface Row {
  label: string;
  render: (column: HourColumn) => string;
}

const ROWS: Row[] = [
  { label: "Total", render: (column) => String(column.total) },
  { label: "Pass", render: (column) => String(column.pass) },
  { label: "Fail", render: (column) => String(column.fail) },
  { label: "Runtime", render: (column) => formatMinutes(column.minutes.runtime) },
  {
    label: "Unplanned Production",
    render: (column) => formatMinutes(column.minutes["unplanned-production"]),
  },
  { label: "Stoppage", render: (column) => formatMinutes(column.minutes.stoppage) },
  {
    label: "Unknown Downtime",
    render: (column) => formatMinutes(column.minutes["unknown-downtime"]),
  },
  {
    label: "Planned Downtime",
    render: (column) => formatMinutes(column.minutes["planned-downtime"]),
  },
  {
    label: "Ideal Cycle Time",
    render: (column) => formatCycleSeconds(column.idealCycleTime),
  },
  {
    label: "Actual Cycle Time",
    render: (column) => formatCycleSeconds(column.actualCycleTime),
  },
];

export default function HourlyTable({ columns }: { columns: HourColumn[] }) {
  return (
    <Paper>
      <Typography variant="subtitle1" sx={{ p: 2, pb: 1, fontWeight: 600 }}>
        Hourly Production &amp; Downtime Summary
      </Typography>

      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Param</TableCell>
              {columns.map((column) => (
                <TableCell key={column.start} align="right" sx={{ fontWeight: 600 }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.label} hover>
                <TableCell sx={{ fontWeight: 500 }}>{row.label}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.start} align="right">
                    {column.isFuture ? "" : row.render(column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
