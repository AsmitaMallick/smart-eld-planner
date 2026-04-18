import { useMemo, useState } from "react";
import axios from "axios";
import TripForm from "../components/TripForm";
import RouteMap from "../components/RouteMap";
import StopList from "../components/StopList";
import ELDLogSheet from "../components/ELDLogSheet";

const API_URL = "http://localhost:8000/api/trip/plan/";

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

  const summary = useMemo(() => {
    if (!result) {
      return null;
    }

    const route = result.route || {};
    const logs = result.eld_logs || [];
    const schedule = result.schedule || [];

    const totalMiles = Number(route.total_miles || 0);
    const totalDriveHours = logs.reduce((sum, day) => sum + Number(day.totals?.driving || 0), 0);
    const restStops = schedule.filter((event) => ["rest", "break"].includes(event.type)).length;

    return {
      totalMiles: totalMiles.toFixed(1),
      estimatedDays: logs.length,
      totalDriveHours: totalDriveHours.toFixed(1),
      restStops,
    };
  }, [result]);

  return (
    <main className="planner-page">
      <section className="hero-block">
        <h1>ELD Trip Planner</h1>
        <p>Plan a route, inspect stops, and review canvas-based ELD logs.</p>
      </section>

      <TripForm onSubmit={handlePlan} loading={loading} error={error} />

      {result ? (
        <section className="results-stack">
          {summary ? (
            <div className="summary-bar">
              {`Total Miles: ${summary.totalMiles} | Estimated Days: ${summary.estimatedDays} | Total Drive Hours: ${summary.totalDriveHours} | Rest Stops: ${summary.restStops}`}
            </div>
          ) : null}
          <RouteMap geometry={result.route?.geometry || []} stops={result.stops || []} />
          <StopList stops={result.stops || []} />
          <ELDLogSheet logs={result.eld_logs || []} />
        </section>
      ) : null}
    </main>
  );
}

export default PlannerPage;
