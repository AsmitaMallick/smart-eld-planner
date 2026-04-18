import { useState } from "react";

function TripForm({ onSubmit, loading, error }) {
  const [origin, setOrigin] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [currentCycleUsed, setCurrentCycleUsed] = useState(0);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      origin: origin.trim(),
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      current_cycle_used: Number(currentCycleUsed),
    });
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Trip Inputs</h2>
      <div className="form-grid">
        <label>
          Origin
          <input
            type="text"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="Dallas TX"
            required
          />
        </label>
        <label>
          Pickup
          <input
            type="text"
            value={pickup}
            onChange={(event) => setPickup(event.target.value)}
            placeholder="Houston TX"
            required
          />
        </label>
        <label>
          Dropoff
          <input
            type="text"
            value={dropoff}
            onChange={(event) => setDropoff(event.target.value)}
            placeholder="Chicago IL"
            required
          />
        </label>
        <label>
          Current Cycle Used (0-70)
          <input
            type="number"
            min="0"
            max="70"
            step="0.5"
            value={currentCycleUsed}
            onChange={(event) => setCurrentCycleUsed(event.target.value)}
            required
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Planning..." : "Plan Trip"}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}

export default TripForm;
