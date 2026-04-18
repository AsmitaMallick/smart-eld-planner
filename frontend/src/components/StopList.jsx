const iconFor = {
  pickup: "🟢",
  dropoff: "🔴",
  rest: "⚫",
  fuel: "🟠",
};

function StopList({ stops }) {
  return (
    <div className="card">
      <h2>Stops Timeline</h2>
      <ol className="timeline">
        {stops.map((stop, idx) => (
          <li key={`${stop.type}-${idx}`}>
            <span className="timeline-icon">{iconFor[stop.type] || "⚪"}</span>
            <div>
              <p className="timeline-title">{stop.type.replace("_", " ")}</p>
              <p className="timeline-meta">Duration: {Number(stop.duration_hrs || 0).toFixed(2)} hrs</p>
              <p className="timeline-notes">{stop.notes || "No notes"}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default StopList;
