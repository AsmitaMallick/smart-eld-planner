import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LocationOption } from "../types/trip";

const API_BASE = import.meta.env.VITE_API_URL;
const LOCATION_SEARCH_URL = `${API_BASE}/api/trip/location-search/`;

interface LocationSearchInputProps {
  label: string;
  labelIcon?: ReactNode;
  placeholder: string;
  value: string;
  onValueChange: (nextValue: string) => void;
  onSelect: (option: LocationOption | null) => void;
  selectedOption?: LocationOption | null;
  required?: boolean;
}

function isRawLocationOption(item: unknown): item is { label: unknown; lat: unknown; lng: unknown } {
  if (item == null || typeof item !== "object") {
    return false;
  }

  return "label" in item && "lat" in item && "lng" in item;
}

function LocationSearchInput({
  label,
  labelIcon = null,
  placeholder,
  value,
  onValueChange,
  onSelect,
  selectedOption = null,
  required = false,
}: LocationSearchInputProps) {
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          const detail: unknown = await response.json().catch(() => null);
          if (detail && typeof detail === "object" && "detail" in detail && typeof detail.detail === "string") {
            throw new Error(detail.detail);
          }
          throw new Error("Failed to fetch location suggestions");
        }

        const data: unknown = await response.json();
        const nextOptions: LocationOption[] = Array.isArray(data)
          ? data
              .slice(0, 5)
              .filter((item) => isRawLocationOption(item))
              .filter(
                (item) =>
                  typeof item.label === "string" &&
                  Number.isFinite(Number(item.lat)) &&
                  Number.isFinite(Number(item.lng))
              )
              .map((item) => ({
                label: item.label as string,
                lat: Number(item.lat),
                lng: Number(item.lng),
              }))
          : [];

        setOptions(nextOptions);
        setOpen(true);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setOptions([]);
        setError(err instanceof Error ? err.message : "Unable to load suggestions");
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

  const handleSelect = (item: LocationOption) => {
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
      <input
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
      {open ? (
        <div className="suggestions-dropdown">
          {loading ? <div className="suggestions-row muted">Loading...</div> : null}
          {!loading && error ? <div className="suggestions-row error">{error}</div> : null}
          {!loading && !error && !options.length ? <div className="suggestions-row muted">No matches</div> : null}
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
