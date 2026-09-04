import RefreshIcon from "@mui/icons-material/Refresh";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

import type { DashboardFilters } from "../types/filters";
import type { FlatAsset } from "../utils/assets";
import type { ShiftOption } from "../utils/time";

interface FilterBarProps {
  assets: FlatAsset[];
  levelIds: number[];
  shiftOptions: ShiftOption[];
  filters: DashboardFilters;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onRefresh: () => void;
  isFetching: boolean;
}

export default function FilterBar({
  assets,
  levelIds,
  shiftOptions,
  filters,
  onChange,
  onRefresh,
  isFetching,
}: FilterBarProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Asset level</InputLabel>
          <Select
            label="Asset level"
            value={filters.assetLevelId ?? "all"}
            onChange={(event) =>
              onChange({
                assetLevelId:
                  event.target.value === "all" ? null : Number(event.target.value),
              })
            }
          >
            <MenuItem value="all">All levels</MenuItem>
            {levelIds.map((levelId) => (
              <MenuItem key={levelId} value={levelId}>
                Level {levelId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Asset</InputLabel>
          <Select
            label="Asset"
            value={filters.assetId ?? ""}
            onChange={(event) => onChange({ assetId: event.target.value })}
          >
            {assets.map((asset) => (
              <MenuItem key={asset.id} value={asset.id}>
                {asset.name}
                {asset.codename ? ` (${asset.codename})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DatePicker
          label="Date"
          value={dayjs(filters.date)}
          onChange={(value) =>
            value && onChange({ date: value.format("YYYY-MM-DD") })
          }
          slotProps={{ textField: { size: "small", sx: { width: 170 } } }}
        />

        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Shift</InputLabel>
          <Select
            label="Shift"
            value={filters.shiftOptionId ?? ""}
            onChange={(event) => onChange({ shiftOptionId: event.target.value })}
          >
            {shiftOptions.map((shift) => (
              <MenuItem key={shift.id} value={shift.id}>
                {shift.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={filters.showIndividualProduces}
              onChange={(event) =>
                onChange({ showIndividualProduces: event.target.checked })
              }
            />
          }
          label="Show individual produces"
        />

        <IconButton onClick={onRefresh} disabled={isFetching} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
