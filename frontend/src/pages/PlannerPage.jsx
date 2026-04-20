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

const API_BASE = import.meta.env.VITE_API_URL;
const API_URL = `${API_BASE}/api/trip/plan/`;

function PlannerPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handlePlan = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(API_URL, payload, {
        headers: { "Content-Type": "application/json" },
      });
      setResult(response.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Unable to plan trip. Check backend and API key.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

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
            <button type="button" className="sidebar-link">
              <FileText size={16} strokeWidth={2} aria-hidden="true" />
              <span>Logs</span>
            </button>
            <button type="button" className="sidebar-link">
              <Map size={16} strokeWidth={2} aria-hidden="true" />
              <span>Maps</span>
            </button>
            <button type="button" className="sidebar-link">
              <Compass size={16} strokeWidth={2} aria-hidden="true" />
              <span>Documents</span>
            </button>
            <button type="button" className="sidebar-link">
              <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
              <span>Compliance</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button type="button" className="sidebar-link">
            <Settings size={16} strokeWidth={2} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button type="button" className="sidebar-link">
            <CircleHelp size={16} strokeWidth={2} aria-hidden="true" />
            <span>Support</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <p className="topbar-app-name">Dashboard</p>
          <div className="topbar-actions">
            <button type="button" className="topbar-icon" aria-label="Notifications">
              <Bell size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button type="button" className="topbar-icon" aria-label="Profile">
              <User size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button type="button" className="topbar-export" aria-label="Export plan data">
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
              <RouteMap geometry={result?.route?.geometry || []} stops={result?.stops || []} />
            </section>
          </section>

          {result?.summary ? (
            <section className="summary-grid" aria-label="Trip summary stats">
              <article className="summary-card">
                <p className="summary-label">Total Miles</p>
                <p className="summary-value">{Number(result.summary.total_miles || 0).toFixed(1)}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Estimated Days</p>
                <p className="summary-value">{result.summary.estimated_days || 0}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Drive Hours</p>
                <p className="summary-value">{Number(result.summary.total_drive_hours || 0).toFixed(1)}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Rest Stops</p>
                <p className="summary-value">{result.summary.rest_stops || 0}</p>
              </article>
            </section>
          ) : null}

          {result ? (
            <section className="dashboard-eld-section">
              <ELDLogSheet logs={result.eld_logs || []} />
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default PlannerPage;
