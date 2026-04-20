import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL;
const LOCATION_SEARCH_URL = `${API_BASE}/api/trip/location-search/`;

function LocationSearchInput({
  label,
  labelIcon = null,
  inputIcon = null,
  placeholder,
  value,
  onValueChange,
  onSelect,
  selectedOption = null,
  required = false,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    const query = String(value || "").trim();

    if (selectedOption && query === String(selectedOption.label || "").trim()) {
      setOptions([]);
      setLoading(false);
      setError("");
      setOpen(false);
      return undefined;
    }

    if (query.length < 3) {
      setOptions([]);
      setLoading(false);
      setError("");
      setOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const url = new URL(LOCATION_SEARCH_URL);
        url.searchParams.set("q", query);

        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
          const detail = await response.json().catch(() => null);
          throw new Error(detail?.detail || "Failed to fetch location suggestions");
        }

        const data = await response.json();
        const nextOptions = Array.isArray(data)
          ? data
              .slice(0, 5)
              .filter(
                (item) =>
                  item &&
                  typeof item.label === "string" &&
                  Number.isFinite(Number(item.lat)) &&
                  Number.isFinite(Number(item.lng))
              )
              .map((item) => ({
                label: item.label,
                lat: Number(item.lat),
                lng: Number(item.lng),
              }))
          : [];

        setOptions(nextOptions);
        setOpen(true);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        setOptions([]);
        setError(err.message || "Unable to load suggestions");
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [value, selectedOption]);

  const handleBlur = () => {
    closeRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  };

  const handleFocus = () => {
    if (closeRef.current) {
      clearTimeout(closeRef.current);
    }
    if (options.length || error) {
      setOpen(true);
    }
  };

  const handleSelect = (item) => {
    onValueChange(item.label);
    onSelect(item);
    setOpen(false);
  };

  return (
    <label className="location-input-wrap">
      <span className="location-input-label">
        {labelIcon ? <span className="location-input-label-icon">{labelIcon}</span> : null}
        <span>{label}</span>
      </span>
      <div className="location-input-shell">
        {inputIcon ? <span className="location-input-field-icon">{inputIcon}</span> : null}
        <input
          className="location-input-field"
          type="text"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onValueChange(nextValue);

            const selectedLabel = String(selectedOption?.label || "").trim();
            if (selectedLabel && nextValue.trim() !== selectedLabel) {
              onSelect(null);
            }
          }}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
        />
      </div>
      {open ? (
        <div className="suggestions-dropdown">
          {loading ? <div className="suggestions-row muted">Loading...</div> : null}
          {!loading && error ? <div className="suggestions-row error">{error}</div> : null}
          {!loading && !error && !options.length ? (
            <div className="suggestions-row muted">No matches</div>
          ) : null}
          {!loading && !error
            ? options.map((item, index) => (
                <button
                  className="suggestion-item"
                  key={`${item.label}-${index}`}
                  type="button"
                  onMouseDown={() => handleSelect(item)}
                >
                  {item.label}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </label>
  );
}

export default LocationSearchInput;
