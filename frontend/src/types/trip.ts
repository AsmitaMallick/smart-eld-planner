export type ToastVariant = "success" | "error" | "info";

export interface LocationOption {
  label: string;
  lat: number;
  lng: number;
}

export interface TripPlanPayload {
  origin: string;
  pickup: string;
  dropoff: string;
  current_cycle_used: number;
}

export type StopType =
  | "pickup"
  | "dropoff"
  | "rest"
  | "fuel"
  | "reset"
  | "end_of_trip_rest"
  | (string & {});

export interface TripStop {
  lat: number;
  lng: number;
  type: StopType;
  notes?: string | null;
}

export type RoutePoint = [number, number];

export interface TripRoute {
  geometry?: RoutePoint[];
}

export interface TripSummary {
  total_miles?: number;
  estimated_days?: number;
  total_drive_hours?: number;
  rest_stops?: number;
}

export type DutyStatus =
  | "driving"
  | "on_duty"
  | "sleeper"
  | "off_duty"
  | (string & {});

export interface TimelineItem {
  type: string;
  status?: DutyStatus;
  day?: number;
  time?: string;
  duration?: number;
  title?: string;
}

export interface DayLogEntry {
  status?: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
}

export interface DayLog {
  day?: number | string;
  driver_name?: string;
  carrier_name?: string;
  truck_number?: string;
  date_label?: string;
  total_miles?: number | string;
  remarks?: string[];
  entries?: DayLogEntry[];
}

export interface ELDMeta {
  driverName: string;
  carrierName: string;
  truckNumber: string;
  date: string;
  totalMiles: string;
  remarks: string;
}

export interface TripPlanResult {
  route?: TripRoute | null;
  stops?: TripStop[];
  summary?: TripSummary | null;
  eld_logs?: DayLog[];
  timeline?: TimelineItem[];
}

export interface ApiErrorResponse {
  detail?: string;
}
