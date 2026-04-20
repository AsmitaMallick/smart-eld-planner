import { useState } from "react";
import { Clock3, Flag, MapPin, Truck } from "lucide-react";
import LocationSearchInput from "./LocationSearchInput";

function TripForm({ onSubmit, loading, error }) {
  const [origin, setOrigin] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedDropoff, setSelectedDropoff] = useState(null);
  const [currentCycleUsed, setCurrentCycleUsed] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedOrigin || !selectedPickup || !selectedDropoff) {
      setFormError("Please choose Origin, Pickup, and Dropoff from suggestions.");
      return;
    }

    setFormError("");
    onSubmit({
      origin: selectedOrigin.label,
      pickup: selectedPickup.label,
      dropoff: selectedDropoff.label,
      current_cycle_used: Number(currentCycleUsed),
    });
  };

  const handleReset = () => {
    setOrigin("");
    setPickup("");
    setDropoff("");
    setSelectedOrigin(null);
    setSelectedPickup(null);
    setSelectedDropoff(null);
    setCurrentCycleUsed("");
    setFormError("");
  };

  const handleCycleUsedChange = (nextValue) => {
    if (nextValue === "") {
      setCurrentCycleUsed("");
      return;
    }

    const normalizedValue = nextValue.replace(/^0+(?=\d)/, "");
    setCurrentCycleUsed(normalizedValue);
  };

  const cycleUsedNumber = Number(currentCycleUsed);
  const cycleUsedSafe = Number.isFinite(cycleUsedNumber) ? Math.max(0, Math.min(70, cycleUsedNumber)) : 0;
  const cycleHours = Math.floor(cycleUsedSafe);
  const cycleMinutes = Math.round((cycleUsedSafe - cycleHours) * 60);
  const cycleMinutesText = String(cycleMinutes).padStart(2, "0");
  const cycleProgress = (cycleUsedSafe / 70) * 100;

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Route &amp; Planning</h2>
      <p className="form-subtitle">Configure your trip parameters and regulatory constraints.</p>
      <div className="form-grid">
        <LocationSearchInput
          label="Current Location"
          labelIcon={<MapPin size={14} strokeWidth={2.25} className="location-icon current" aria-hidden="true" />}
          inputIcon={<MapPin size={16} strokeWidth={2.2} aria-hidden="true" />}
          value={origin}
          onValueChange={(nextValue) => {
            setOrigin(nextValue);
            setFormError("");
          }}
          onSelect={setSelectedOrigin}
          selectedOption={selectedOrigin}
          placeholder="Enter city or location"
          required
        />
        <LocationSearchInput
          label="Pickup Location"
          labelIcon={<Truck size={14} strokeWidth={2.2} className="location-icon pickup" aria-hidden="true" />}
          inputIcon={<Truck size={16} strokeWidth={2.2} aria-hidden="true" />}
          value={pickup}
          onValueChange={(nextValue) => {
            setPickup(nextValue);
            setFormError("");
          }}
          onSelect={setSelectedPickup}
          selectedOption={selectedPickup}
          placeholder="Enter city or location"
          required
        />
        <LocationSearchInput
          label="Dropoff Location"
          labelIcon={<Flag size={14} strokeWidth={2.25} className="location-icon dropoff" aria-hidden="true" />}
          inputIcon={<Flag size={16} strokeWidth={2.2} aria-hidden="true" />}
          value={dropoff}
          onValueChange={(nextValue) => {
            setDropoff(nextValue);
            setFormError("");
          }}
          onSelect={setSelectedDropoff}
          selectedOption={selectedDropoff}
          placeholder="Enter city or location"
          required
          />
        <label>
          Current Cycle Used
          <div className="cycle-input-shell">
            <span className="cycle-input-icon" aria-hidden="true">
              <Clock3 size={16} strokeWidth={2} />
            </span>
            <input
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={currentCycleUsed}
              onChange={(event) => handleCycleUsedChange(event.target.value)}
              onWheel={(event) => event.currentTarget.blur()}
              placeholder="Hours used in current cycle"
              required
            />
          </div>
        </label>
      </div>

      <div className="cycle-usage-panel">
        <div className="cycle-usage-row">
          <span>Cycle Usage</span>
          <strong>{`${cycleHours}h ${cycleMinutesText}m / 70h`}</strong>
        </div>
        <div className="cycle-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={70} aria-valuenow={cycleUsedSafe}>
          <div className="cycle-progress-fill" style={{ width: `${cycleProgress}%` }} />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="form-btn primary" disabled={loading}>
          {loading ? "Planning..." : "Generate Plan"}
        </button>
        <button type="button" className="form-btn secondary" onClick={handleReset} disabled={loading}>
          Reset
        </button>
      </div>
      {formError ? <p className="error-text">{formError}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}

export default TripForm;
