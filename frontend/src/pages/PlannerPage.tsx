import { useState } from "react";
import axios from "axios";
import {
  Bell,
  CircleHelp,
  Compass,
  FileText,
  LayoutDashboard,
  Map,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import TripForm from "../components/TripForm";
import RouteMap from "../components/RouteMap";
import ELDLogSheet from "../components/ELDLogSheet";
import { showToast } from "../utils/toast";
import type {
  ApiErrorResponse,
  ToastVariant,
  TripPlanPayload,
  TripPlanResult,
} from "../types/trip";

const API_BASE = import.meta.env.VITE_API_URL;
const API_URL = `${API_BASE}/api/trip/plan/`;

function PlannerPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<TripPlanResult | null>(null);

  const handlePlan = async (payload: TripPlanPayload): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post<TripPlanResult>(API_URL, payload, {
        headers: { "Content-Type": "application/json" },
      });
      setResult(response.data);
      showToast("Plan generated successfully", "success");
    } catch (err: unknown) {
      let detail = "";
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        detail = err.response?.data?.detail ?? "";
      }

      const errorMessage =
        detail || "Unable to plan trip. Check backend and API key.";
      setError(errorMessage);
      setResult(null);
      showToast(errorMessage, "error", { duration: 3600 });
    } finally {
      setLoading(false);
    }
  };

  const notifyComingSoon =
    (message: string, type: ToastVariant = "info") =>
    () => {
      showToast(message, type);
    };

  const geometry = result?.route?.geometry ?? [];
  const stops = result?.stops ?? [];
  const summary = result?.summary;
  const logs = result?.eld_logs ?? [];

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          <h1 className="sidebar-title">ELD Planner</h1>
          <nav className="sidebar-nav" aria-label="Primary">
            <button type="button" className="sidebar-link active">
              <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className="sidebar-link placeholder-control"
              onClick={notifyComingSoon("Logs feature coming soon")}
            >
              <FileText size={16} strokeWidth={2} aria-hidden="true" />
              <span>Logs</span>
            </button>
            <button
              type="button"
              className="sidebar-link placeholder-control"
              onClick={notifyComingSoon("Maps feature coming soon")}
            >
              <Map size={16} strokeWidth={2} aria-hidden="true" />
              <span>Maps</span>
            </button>
            <button
              type="button"
              className="sidebar-link placeholder-control"
              onClick={notifyComingSoon("Documents feature coming soon")}
            >
              <Compass size={16} strokeWidth={2} aria-hidden="true" />
              <span>Documents</span>
            </button>
            <button
              type="button"
              className="sidebar-link placeholder-control"
              onClick={notifyComingSoon("Compliance dashboard coming soon")}
            >
              <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
              <span>Compliance</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-link placeholder-control"
            onClick={notifyComingSoon("Settings page coming soon")}
          >
            <Settings size={16} strokeWidth={2} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            className="sidebar-link placeholder-control"
            onClick={notifyComingSoon("Support feature coming soon")}
          >
            <CircleHelp size={16} strokeWidth={2} aria-hidden="true" />
            <span>Support</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <p className="topbar-app-name">Dashboard</p>
          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-icon placeholder-control"
              aria-label="Notifications"
              onClick={notifyComingSoon("Notifications feature coming soon")}
            >
              <Bell size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="topbar-icon placeholder-control"
              aria-label="Profile"
              onClick={notifyComingSoon("Account page coming soon")}
            >
              <User size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="topbar-export placeholder-control"
              aria-label="Export plan data"
              onClick={notifyComingSoon("Export feature coming soon")}
            >
              Export
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          <section className="dashboard-top-row">
            <section className="dashboard-route-col">
              <TripForm onSubmit={handlePlan} loading={loading} error={error} />
            </section>

            <section className="dashboard-map-col">
              <RouteMap geometry={geometry} stops={stops} />
            </section>
          </section>

          {summary ? (
            <section className="summary-grid" aria-label="Trip summary stats">
              <article className="summary-card">
                <p className="summary-label">Total Miles</p>
                <p className="summary-value">
                  {Number(summary.total_miles || 0).toFixed(1)}
                </p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Estimated Days</p>
                <p className="summary-value">{summary.estimated_days || 0}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Drive Hours</p>
                <p className="summary-value">
                  {Number(summary.total_drive_hours || 0).toFixed(1)}
                </p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Rest Stops</p>
                <p className="summary-value">{summary.rest_stops || 0}</p>
              </article>
            </section>
          ) : null}

          {result ? (
            <section className="dashboard-eld-section">
              <ELDLogSheet logs={logs} />
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default PlannerPage;
