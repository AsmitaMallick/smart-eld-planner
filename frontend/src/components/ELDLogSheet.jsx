import { useEffect, useRef } from "react";

const ROWS = [
  { key: "off_duty", label: "Off Duty" },
  { key: "sleeper_berth", label: "Sleeper Berth" },
  { key: "driving", label: "Driving" },
  { key: "on_duty_not_driving", label: "On Duty (ND)" },
];

const statusToRow = {
  off_duty: 0,
  sleeper_berth: 1,
  driving: 2,
  on_duty_not_driving: 3,
};

function parseTimeToHour(timeText) {
  const [hour, minute] = String(timeText).split(":").map(Number);
  return hour + minute / 60;
}

function drawSheet(canvas, dayLog) {
  const ctx = canvas.getContext("2d");
  const width = 1080;
  const height = 290;
  const left = 130;
  const top = 34;
  const gridWidth = 760;
  const rowHeight = 50;
  const totalRows = 4;
  const gridHeight = rowHeight * totalRows;
  const hourWidth = gridWidth / 24;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 18px Segoe UI";
  ctx.fillText(dayLog.date_label, left, 24);

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  for (let col = 0; col <= 24; col += 1) {
    const x = left + col * hourWidth;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + gridHeight);
    ctx.stroke();
  }

  for (let row = 0; row <= totalRows; row += 1) {
    const y = top + row * rowHeight;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + gridWidth, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#334155";
  ctx.font = "12px Segoe UI";
  for (let col = 0; col < 24; col += 1) {
    const x = left + col * hourWidth + 2;
    ctx.fillText(String(col).padStart(2, "0"), x, top - 8);
  }

  ctx.font = "12px Segoe UI";
  ROWS.forEach((row, index) => {
    const y = top + index * rowHeight + rowHeight / 2 + 4;
    ctx.fillText(row.label, 16, y);
  });

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (const entry of dayLog.entries || []) {
    const rowIdx = statusToRow[entry.status];
    if (rowIdx == null) {
      continue;
    }

    const startHour = parseTimeToHour(entry.start_time);
    const endHour = parseTimeToHour(entry.end_time);
    const y = top + rowIdx * rowHeight + rowHeight / 2;
    const x1 = left + startHour * hourWidth;
    const x2 = left + endHour * hourWidth;

    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "600 12px Segoe UI";
  const tx = left + gridWidth + 24;
  const totals = dayLog.totals || {};
  ctx.fillText(`Off: ${Number(totals.off_duty || 0).toFixed(1)} h`, tx, top + 26);
  ctx.fillText(`SB: ${Number(totals.sleeper_berth || 0).toFixed(1)} h`, tx, top + 56);
  ctx.fillText(`Drive: ${Number(totals.driving || 0).toFixed(1)} h`, tx, top + 86);
  ctx.fillText(
    `On-Duty: ${Number(totals.on_duty_not_driving || 0).toFixed(1)} h`,
    tx,
    top + 116
  );
}

function DayLogCanvas({ dayLog }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    drawSheet(canvasRef.current, dayLog);
  }, [dayLog]);

  return (
    <div className="sheet-card">
      <canvas ref={canvasRef} className="eld-canvas" />
    </div>
  );
}

function ELDLogSheet({ logs }) {
  return (
    <div className="card">
      <h2>ELD Log Sheets</h2>
      <div className="sheet-stack">
        {logs.map((day) => (
          <DayLogCanvas key={day.day} dayLog={day} />
        ))}
      </div>
    </div>
  );
}

export default ELDLogSheet;
