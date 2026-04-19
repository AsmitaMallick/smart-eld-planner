import { useMemo, useState } from "react";

const DOT_CLASS_BY_STATUS = {
  driving: "timeline-dot driving",
  on_duty: "timeline-dot on-duty",
  sleeper: "timeline-dot sleeper",
  off_duty: "timeline-dot off-duty",
};

const DOT_CLASS_BY_EVENT = {
  pickup: "timeline-dot pickup",
  dropoff: "timeline-dot dropoff",
};

function formatClockTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toDayLabel(day) {
  const n = Number(day || 1);
  return `Day ${Number.isFinite(n) && n > 0 ? n : 1}`;
}

function colorClassFor(item) {
  if (DOT_CLASS_BY_EVENT[item.type]) {
    return DOT_CLASS_BY_EVENT[item.type];
  }
  return DOT_CLASS_BY_STATUS[item.status] || "timeline-dot off-duty";
}

function isMajorStop(item) {
  return ["pickup", "dropoff", "fuel", "reset"].includes(item.type);
}

function StopList({ timeline }) {
  const [showMajorOnly, setShowMajorOnly] = useState(false);

  const filteredTimeline = useMemo(() => {
    const source = Array.isArray(timeline) ? timeline : [];
    if (!showMajorOnly) {
      return source;
    }
    return source.filter((item) => isMajorStop(item));
  }, [timeline, showMajorOnly]);

  const byDay = useMemo(() => {
    const groups = {};
    for (const item of filteredTimeline) {
      const day = Number(item.day || 1);
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(item);
    }
    return Object.entries(groups)
      .map(([day, items]) => ({ day: Number(day), items }))
      .sort((a, b) => a.day - b.day);
  }, [filteredTimeline]);

  return (
    <div className="card">
      <div className="timeline-header-row">
        <h2>Duty Timeline</h2>
        <label className="timeline-toggle" htmlFor="major-only-toggle">
          <input
            id="major-only-toggle"
            type="checkbox"
            checked={showMajorOnly}
            onChange={(event) => setShowMajorOnly(event.target.checked)}
          />
          <span>{showMajorOnly ? "Show only major stops" : "Show full duty timeline"}</span>
        </label>
      </div>

      <div className="timeline-days-wrap" role="region" aria-label="Grouped timeline by day">
        {byDay.length === 0 ? <p className="timeline-empty">No timeline segments available.</p> : null}

        {byDay.map((group) => (
          <section key={group.day} className="timeline-day-group" aria-label={toDayLabel(group.day)}>
            <h3 className="timeline-day-heading">{toDayLabel(group.day)}</h3>
            <div className="timeline-scroll" role="region" aria-label={`Horizontal timeline for ${toDayLabel(group.day)}`}>
              <ol className="timeline-horizontal">
                {group.items.map((item, idx) => {
                  const duration = Number(item.duration || 0);
                  return (
                    <li key={`${group.day}-${item.time}-${item.type}-${idx}`} className="timeline-item">
                      <div className="timeline-track-segment" aria-hidden="true" />
                      <span className={colorClassFor(item)} aria-hidden="true" />
                      <div className="timeline-item-body">
                        <p className="timeline-item-time">{formatClockTime(item.time)}</p>
                        <p className="timeline-item-day">{toDayLabel(item.day)}</p>
                        <p className="timeline-item-title">{item.title || item.type}</p>
                        <p className="timeline-item-duration">{`Duration: ${duration.toFixed(2)} hrs`}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default StopList;
