import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { DayLog, DayLogEntry, ELDMeta } from "../types/trip";

const ROWS = [
  { key: "off_duty", label: "Off Duty" },
  { key: "sleeper", label: "Sleeper Berth" },
  { key: "driving", label: "Driving" },
  { key: "on_duty", label: "On Duty" },
];

const statusToRow: Record<string, number> = {
  off_duty: 0,
  sleeper: 1,
  driving: 2,
  on_duty: 3,
};

const statusAlias: Record<string, string> = {
  sleeper_berth: "sleeper",
  on_duty_not_driving: "on_duty",
};

interface NormalizedEntry {
  rowIndex: number;
  startHour: number;
  endHour: number;
}

interface Segment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function parseTimeToHour(timeText?: string): number | null {
  const [hour, minute] = String(timeText || "")
    .split(":")
    .map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return hour + minute / 60;
}

function normalizeEntries(entries?: DayLogEntry[]): NormalizedEntry[] {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const normalizedStatus =
        statusAlias[entry?.status ?? ""] || entry?.status;
      const rowIndex = statusToRow[normalizedStatus ?? ""];
      const startHour = parseTimeToHour(entry?.start_time || entry?.start);
      const endHour = parseTimeToHour(entry?.end_time || entry?.end);

      if (rowIndex == null || startHour == null || endHour == null) {
        return null;
      }

      return {
        rowIndex,
        startHour,
        endHour,
      };
    })
    .filter((entry): entry is NormalizedEntry => entry != null)
    .sort((a, b) => a.startHour - b.startHour);
}

function buildStepSegments(
  entries: NormalizedEntry[],
  xFromHour: (hour: number) => number,
  yFromRow: (rowIndex: number) => number,
): Segment[] {
  const segments: Segment[] = [];
  let previous: NormalizedEntry | null = null;

  for (const entry of entries) {
    const start = Math.max(0, Math.min(24, entry.startHour));
    const end = Math.max(0, Math.min(24, entry.endHour));
    if (end < start) {
      continue;
    }

    const y = yFromRow(entry.rowIndex);
    const x1 = xFromHour(start);
    const x2 = xFromHour(end);

    if (previous && previous.rowIndex !== entry.rowIndex) {
      const transitionX = xFromHour(start);
      segments.push({
        key: `v-${start}-${previous.rowIndex}-${entry.rowIndex}`,
        x1: transitionX,
        y1: yFromRow(previous.rowIndex),
        x2: transitionX,
        y2: y,
      });
    }

    segments.push({
      key: `h-${start}-${end}-${entry.rowIndex}`,
      x1,
      y1: y,
      x2,
      y2: y,
    });

    previous = entry;
  }

  return segments;
}

function buildDefaultMeta(dayLog: DayLog): ELDMeta {
  return {
    driverName: dayLog.driver_name || "",
    carrierName: dayLog.carrier_name || "",
    truckNumber: dayLog.truck_number || "",
    date: dayLog.date_label || "",
    totalMiles: String(dayLog.total_miles || ""),
    remarks: Array.isArray(dayLog.remarks) ? dayLog.remarks.join("\n") : "",
  };
}

interface DayLogSvgProps {
  dayLog: DayLog;
  meta: ELDMeta;
  onOpenEdit: () => void;
  onRemarksChange: (remarks: string) => void;
}

function DayLogSvg({
  dayLog,
  meta,
  onOpenEdit,
  onRemarksChange,
}: DayLogSvgProps) {
  const width = 1080;
  const height = 250;
  const left = 130;
  const right = 20;
  const top = 42;
  const bottom = 16;
  const gridWidth = width - left - right;
  const gridHeight = height - top - bottom;
  const rowHeight = gridHeight / 4;
  const quarterHourWidth = gridWidth / 96;

  const entries = useMemo(
    () => normalizeEntries(dayLog.entries),
    [dayLog.entries],
  );
  const xFromHour = (hour: number) => left + hour * (gridWidth / 24);
  const yFromRow = (rowIndex: number) =>
    top + rowIndex * rowHeight + rowHeight / 2;
  const segments = useMemo(
    () => buildStepSegments(entries, xFromHour, yFromRow),
    [entries],
  );

  return (
    <section className="eld-sheet-wrapper">
      <header className="eld-meta-header">
        <div className="eld-meta-grid">
          <div className="eld-meta-item">
            <span className="eld-meta-label">Driver</span>
            <span className="eld-meta-value">{meta.driverName || "-"}</span>
          </div>
          <div className="eld-meta-item">
            <span className="eld-meta-label">Carrier</span>
            <span className="eld-meta-value">{meta.carrierName || "-"}</span>
          </div>
          <div className="eld-meta-item">
            <span className="eld-meta-label">Truck #</span>
            <span className="eld-meta-value">{meta.truckNumber || "-"}</span>
          </div>
          <div className="eld-meta-item">
            <span className="eld-meta-label">Date</span>
            <span className="eld-meta-value">{meta.date || "-"}</span>
          </div>
          <div className="eld-meta-item">
            <span className="eld-meta-label">Total Miles</span>
            <span className="eld-meta-value">{meta.totalMiles || "-"}</span>
          </div>
        </div>
        <button
          type="button"
          className="eld-action-btn no-export"
          onClick={onOpenEdit}
        >
          Edit
        </button>
      </header>

      <svg
        className="eld-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={meta.date || "ELD log"}
      >
        {Array.from({ length: 97 }, (_, tick) => {
          const x = left + tick * quarterHourWidth;
          const variant =
            tick % 4 === 0
              ? "hour"
              : tick % 2 === 0
                ? "half-hour"
                : "quarter-hour";
          return (
            <line
              key={`v-grid-${tick}`}
              x1={x}
              y1={top}
              x2={x}
              y2={top + gridHeight}
              className={`eld-grid-line eld-grid-line-${variant}`}
            />
          );
        })}

        {Array.from({ length: 5 }, (_, idx) => {
          const y = top + idx * rowHeight;
          return (
            <line
              key={`h-grid-${idx}`}
              x1={left}
              y1={y}
              x2={left + gridWidth}
              y2={y}
              className="eld-grid-line eld-grid-line-hour"
            />
          );
        })}

        {Array.from({ length: 25 }, (_, hour) => {
          const x = xFromHour(hour);
          return (
            <text
              key={`hour-label-${hour}`}
              x={x + 1}
              y={top - 9}
              className="eld-hour-label"
            >
              {hour}
            </text>
          );
        })}

        {ROWS.map((row, idx) => {
          const y = yFromRow(idx);
          return (
            <text key={row.key} x={12} y={y + 4} className="eld-row-label">
              {row.label}
            </text>
          );
        })}

        {segments.map((segment, idx) => (
          <line
            key={`${segment.key}-${idx}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            className="eld-entry-line"
          />
        ))}
      </svg>

      <section className="eld-remarks-box">
        <div className="eld-remarks-label">REMARKS</div>
        <textarea
          className="eld-remarks-input"
          value={meta.remarks}
          onChange={(event) => onRemarksChange(event.target.value)}
          placeholder="Enter remarks"
        />
      </section>
    </section>
  );
}

interface ELDLogSheetProps {
  logs: DayLog[];
}

function ELDLogSheet({ logs }: ELDLogSheetProps) {
  const [metaByDay, setMetaByDay] = useState<Record<string, ELDMeta>>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [draft, setDraft] = useState<ELDMeta | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const getDayKey = (day: DayLog, index: number): string =>
    String(day.day ?? index);

  const getMeta = (dayLog: DayLog, dayKey: string): ELDMeta => {
    return {
      ...buildDefaultMeta(dayLog),
      ...(metaByDay[dayKey] || {}),
    };
  };

  const handleOpenEdit = (dayLog: DayLog, dayKey: string) => {
    setEditingDay(dayKey);
    setDraft(getMeta(dayLog, dayKey));
  };

  const handleSaveEdit = () => {
    if (!editingDay || !draft) {
      return;
    }
    setMetaByDay((current) => ({
      ...current,
      [editingDay]: draft,
    }));
    setEditingDay(null);
    setDraft(null);
  };

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) {
      return;
    }

    setDownloading(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        ignoreElements: (element: Element) =>
          element.classList?.contains("no-export") || false,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let remaining = imageHeight;
      let y = 0;

      pdf.addImage(imageData, "PNG", 0, y, imageWidth, imageHeight);
      remaining -= pageHeight;

      while (remaining > 0) {
        y = remaining - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, y, imageWidth, imageHeight);
        remaining -= pageHeight;
      }

      pdf.save("eld-log-sheet.pdf");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card">
      <div className="eld-toolbar no-export">
        <h2>ELD Log Sheets</h2>
        <button
          type="button"
          className="eld-action-btn"
          onClick={handleDownloadPdf}
          disabled={downloading || !logs.length}
        >
          {downloading ? "Preparing PDF..." : "Download PDF"}
        </button>
      </div>

      {logs.length ? (
        <div className="sheet-stack" ref={sheetRef}>
          {logs.map((dayLog, index) => {
            const dayKey = getDayKey(dayLog, index);
            const meta = getMeta(dayLog, dayKey);
            return (
              <DayLogSvg
                key={dayKey}
                dayLog={dayLog}
                meta={meta}
                onOpenEdit={() => handleOpenEdit(dayLog, dayKey)}
                onRemarksChange={(remarks) => {
                  setMetaByDay((current) => ({
                    ...current,
                    [dayKey]: {
                      ...meta,
                      remarks,
                    },
                  }));
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="eld-empty-state">
          <p className="eld-empty-title">No log sheets yet</p>
          <p className="eld-empty-copy">
            Generate a route plan to populate daily ELD logs. Once a plan is
            ready, your sheets will appear here.
          </p>
        </div>
      )}

      {editingDay && draft ? (
        <div
          className="eld-modal-overlay no-export"
          role="dialog"
          aria-modal="true"
        >
          <div className="eld-modal">
            <h3>Edit Log Details</h3>
            <label>
              Driver Name
              <input
                type="text"
                value={draft.driverName}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, driverName: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              Carrier Name
              <input
                type="text"
                value={draft.carrierName}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, carrierName: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              Truck Number
              <input
                type="text"
                value={draft.truckNumber}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, truckNumber: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              Date
              <input
                type="text"
                value={draft.date}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, date: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              Total Miles
              <input
                type="text"
                value={draft.totalMiles}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, totalMiles: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <label>
              Remarks
              <textarea
                value={draft.remarks}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? { ...current, remarks: event.target.value }
                      : current,
                  )
                }
              />
            </label>
            <div className="eld-modal-actions">
              <button
                type="button"
                className="eld-action-btn"
                onClick={handleSaveEdit}
              >
                Save
              </button>
              <button
                type="button"
                className="eld-action-btn eld-action-btn-ghost"
                onClick={() => {
                  setEditingDay(null);
                  setDraft(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ELDLogSheet;
