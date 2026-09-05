import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {
  MIN_ZOOM_SPAN_MS,
  PRODUCE_COLORS,
  SEGMENT_COLORS,
  SEGMENT_KINDS,
  SEGMENT_LABELS,
} from "../utils/constants";
import {
  buildHourlyMarkers,
  buildProduceMarkers,
  lowerBound,
  timeTicks,
  valueTicks,
} from "../utils/chart";
import type { Marker } from "../utils/chart";
import { collectSegments } from "../utils/segments";
import type { HourColumn, Segment } from "../utils/segments";
import { istLabelFromMillis } from "../utils/time";
import type { ShiftWindow } from "../utils/time";
import type { MachineIntervalsResponse } from "../types/api";

const PADDING = { left: 56, right: 16, top: 16, bottom: 28 };
const HEIGHT = 380;
const HOVER_RADIUS_PX = 12;
const MIN_LABEL_WIDTH_PX = 14;

interface TimelineChartProps {
  window: ShiftWindow;
  columns: HourColumn[];
  intervals: MachineIntervalsResponse | undefined;
  showIndividualProduces: boolean;
}

interface Hover {
  marker: Marker;
  x: number;
  y: number;
}

export default function TimelineChart({
  window,
  columns,
  intervals,
  showIndividualProduces,
}: TimelineChartProps) {
  const plotRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const view = useMemo<[number, number]>(
    () => zoom ?? [window.from.valueOf(), window.to.valueOf()],
    [zoom, window],
  );

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const segments = useMemo<Segment[]>(
    () => (intervals ? collectSegments(intervals) : []),
    [intervals],
  );

  const markers = useMemo(
    () =>
      showIndividualProduces
        ? buildProduceMarkers(intervals)
        : buildHourlyMarkers(window, columns),
    [showIndividualProduces, intervals, window, columns],
  );

  const maxY = useMemo(
    () => Math.max(1, ...markers.map((marker) => marker.y)),
    [markers],
  );

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const xFor = useCallback(
    (time: number) =>
      PADDING.left + ((time - view[0]) / (view[1] - view[0])) * plotWidth,
    [view, plotWidth],
  );

  const yFor = useCallback(
    (value: number) => PADDING.top + plotHeight - (value / maxY) * plotHeight,
    [maxY, plotHeight],
  );

  useEffect(() => {
    const ctx = prepareCanvas(plotRef.current, width);
    if (!ctx || plotWidth <= 0) return;

    drawBands(ctx, segments, xFor, plotWidth, plotHeight);
    drawAxes(ctx, view, maxY, xFor, yFor, width, plotWidth, plotHeight);
    if (showIndividualProduces) {
      drawMarkers(ctx, markers, view, xFor, yFor);
    } else {
      drawCumulativeLine(ctx, markers, xFor, yFor);
    }
  }, [
    segments,
    markers,
    view,
    maxY,
    width,
    plotWidth,
    plotHeight,
    showIndividualProduces,
    xFor,
    yFor,
  ]);

  useEffect(() => {
    const ctx = prepareCanvas(overlayRef.current, width);
    if (!ctx || plotWidth <= 0) return;

    if (drag) {
      const left = Math.min(drag[0], drag[1]);
      const span = Math.abs(drag[1] - drag[0]);
      ctx.fillStyle = "rgba(33, 150, 243, 0.18)";
      ctx.fillRect(left, PADDING.top, span, plotHeight);
      ctx.strokeStyle = "#1976D2";
      ctx.strokeRect(left, PADDING.top, span, plotHeight);
    }

    if (hover) {
      ctx.strokeStyle = "#263238";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [drag, hover, width, plotWidth, plotHeight]);

  function positionIn(event: ReactMouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (!event.shiftKey) return;
    const { x } = positionIn(event);
    setDrag([x, x]);
    setHover(null);
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLCanvasElement>) {
    const { x, y } = positionIn(event);
    if (drag) {
      setDrag([drag[0], x]);
      return;
    }
    setHover(findHover(markers, x, y, view, xFor, yFor, plotWidth));
  }

  function handleMouseUp() {
    if (!drag) return;
    const [fromPx, toPx] = drag;
    setDrag(null);
    if (Math.abs(toPx - fromPx) < 4) return;

    const span = view[1] - view[0];
    const timeAt = (px: number) =>
      view[0] + ((px - PADDING.left) / plotWidth) * span;

    let from = timeAt(Math.min(fromPx, toPx));
    let to = timeAt(Math.max(fromPx, toPx));
    if (to - from < MIN_ZOOM_SPAN_MS) {
      const middle = (from + to) / 2;
      from = middle - MIN_ZOOM_SPAN_MS / 2;
      to = middle + MIN_ZOOM_SPAN_MS / 2;
    }
    setZoom([from, to]);
  }

  function resetView() {
    setZoom(null);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Production History
        </Typography>
        <Legend showIndividualProduces={showIndividualProduces} />
      </Stack>

      <Box
        ref={boxRef}
        sx={{ position: "relative", height: HEIGHT, userSelect: "none" }}
      >
        <canvas
          ref={plotRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: HEIGHT }}
        />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: HEIGHT,
            cursor: drag ? "crosshair" : "default",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setDrag(null);
            setHover(null);
          }}
          onDoubleClick={resetView}
        />
        {hover ? <MarkerTooltip hover={hover} width={width} /> : null}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          variant="outlined"
          label="Shift + drag to zoom into a time range · double-click to reset"
        />
        {zoom ? (
          <Chip size="small" color="primary" label="Zoomed" onDelete={resetView} />
        ) : null}
      </Stack>
    </Paper>
  );
}

function prepareCanvas(canvas: HTMLCanvasElement | null, width: number) {
  if (!canvas || width <= 0) return null;
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = HEIGHT * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, HEIGHT);
  return ctx;
}

function findHover(
  markers: Marker[],
  x: number,
  y: number,
  view: [number, number],
  xFor: (time: number) => number,
  yFor: (value: number) => number,
  plotWidth: number,
): Hover | null {
  if (markers.length === 0 || plotWidth <= 0) return null;

  const span = view[1] - view[0];
  const timeAtX = view[0] + ((x - PADDING.left) / plotWidth) * span;
  const slack = (HOVER_RADIUS_PX / plotWidth) * span;

  let best: Hover | null = null;
  let bestDistance = HOVER_RADIUS_PX;

  for (let i = lowerBound(markers, timeAtX - slack); i < markers.length; i += 1) {
    const marker = markers[i];
    if (marker.time > timeAtX + slack) break;
    const px = xFor(marker.time);
    const py = yFor(marker.y);
    const distance = Math.hypot(px - x, py - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { marker, x: px, y: py };
    }
  }

  return best;
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  xFor: (time: number) => number,
  plotWidth: number,
  plotHeight: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(PADDING.left, PADDING.top, plotWidth, plotHeight);
  ctx.clip();

  for (const segment of segments) {
    const left = xFor(segment.start);
    const right = xFor(segment.end);
    if (right < PADDING.left || left > PADDING.left + plotWidth) continue;

    const bandWidth = right - left;
    ctx.fillStyle = SEGMENT_COLORS[segment.kind];
    ctx.fillRect(left, PADDING.top, bandWidth, plotHeight);

    if (bandWidth >= MIN_LABEL_WIDTH_PX) {
      const label = (segment.name ?? SEGMENT_LABELS[segment.kind]).toUpperCase();
      ctx.save();
      ctx.translate(left + bandWidth / 2, PADDING.top + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0, plotHeight - 16);
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  view: [number, number],
  maxY: number,
  xFor: (time: number) => number,
  yFor: (value: number) => number,
  width: number,
  plotWidth: number,
  plotHeight: number,
) {
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#546E7A";
  ctx.lineWidth = 1;

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const value of valueTicks(maxY)) {
    ctx.fillText(String(value), PADDING.left - 8, yFor(value));
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  for (const tick of timeTicks(view[0], view[1])) {
    const x = xFor(tick);
    if (x < PADDING.left || x > PADDING.left + plotWidth) continue;
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top + plotHeight);
    ctx.lineTo(x, PADDING.top + plotHeight + 4);
    ctx.stroke();
    ctx.fillText(istLabelFromMillis(tick), x, PADDING.top + plotHeight + 7);
  }

  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, PADDING.top + plotHeight);
  ctx.lineTo(width - PADDING.right, PADDING.top + plotHeight);
  ctx.stroke();
}

/**
 * Three batched passes, FAIL crosses last so they are never hidden behind the
 * thousands of PASS and WIP markers.
 */
function drawMarkers(
  ctx: CanvasRenderingContext2D,
  markers: Marker[],
  view: [number, number],
  xFor: (time: number) => number,
  yFor: (value: number) => number,
) {
  const start = lowerBound(markers, view[0]);
  const end = lowerBound(markers, view[1]);

  ctx.fillStyle = PRODUCE_COLORS.WIP;
  ctx.beginPath();
  for (let i = start; i < end; i += 1) {
    const marker = markers[i];
    if (marker.result === "FAIL" || marker.produceType !== "WIP") continue;
    const x = xFor(marker.time);
    const y = yFor(marker.y);
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x + 3, y + 2);
    ctx.lineTo(x - 3, y + 2);
  }
  ctx.fill();

  ctx.fillStyle = PRODUCE_COLORS.PASS;
  ctx.beginPath();
  for (let i = start; i < end; i += 1) {
    const marker = markers[i];
    if (marker.result === "FAIL" || marker.produceType === "WIP") continue;
    const x = xFor(marker.time);
    const y = yFor(marker.y);
    ctx.moveTo(x + 2.5, y);
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.strokeStyle = PRODUCE_COLORS.FAIL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = start; i < end; i += 1) {
    const marker = markers[i];
    if (marker.result !== "FAIL") continue;
    const x = xFor(marker.time);
    const y = yFor(marker.y);
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x + 4, y + 4);
    ctx.moveTo(x + 4, y - 4);
    ctx.lineTo(x - 4, y + 4);
  }
  ctx.stroke();
}

function drawCumulativeLine(
  ctx: CanvasRenderingContext2D,
  markers: Marker[],
  xFor: (time: number) => number,
  yFor: (value: number) => number,
) {
  if (markers.length === 0) return;

  ctx.strokeStyle = PRODUCE_COLORS.PASS;
  ctx.lineWidth = 2;
  ctx.beginPath();
  markers.forEach((marker, index) => {
    const x = xFor(marker.time);
    const y = yFor(marker.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const marker of markers) {
    const x = xFor(marker.time);
    const y = yFor(marker.y);

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PRODUCE_COLORS.PASS;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#1A237E";
    ctx.fillText(String(marker.y), x + 7, y);
  }
}

function MarkerTooltip({ hover, width }: { hover: Hover; width: number }) {
  const flip = hover.x > width - 180;
  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        left: flip ? hover.x - 172 : hover.x + 12,
        top: Math.max(0, hover.y - 52),
        px: 1.5,
        py: 1,
        pointerEvents: "none",
        minWidth: 150,
      }}
    >
      <Typography variant="caption" display="block" color="text.secondary">
        {istLabelFromMillis(hover.marker.time)} IST
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {hover.marker.result}
        {hover.marker.produceType === "WIP" ? " (WIP)" : ""}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Cumulative: {hover.marker.y}
      </Typography>
    </Paper>
  );
}

function Legend({
  showIndividualProduces,
}: {
  showIndividualProduces: boolean;
}) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      {SEGMENT_KINDS.map((kind) => (
        <Stack key={kind} direction="row" spacing={0.5} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.5,
              bgcolor: SEGMENT_COLORS[kind],
            }}
          />
          <Typography variant="caption">{SEGMENT_LABELS[kind]}</Typography>
        </Stack>
      ))}
      {showIndividualProduces ? (
        <Typography variant="caption" color="text.secondary">
          ● PASS · ✕ FAIL · ▲ WIP
        </Typography>
      ) : null}
    </Stack>
  );
}
