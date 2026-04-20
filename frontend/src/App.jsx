import PlannerPage from "./pages/PlannerPage";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <PlannerPage />
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={10}
        containerStyle={{
          bottom: 16,
          left: 12,
          right: 12,
        }}
        toastOptions={{
          duration: 3200,
          style: {
            borderRadius: "12px",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.24)",
            padding: "12px 16px",
            fontSize: "14px",
            lineHeight: 1.35,
            maxWidth: "min(92vw, 420px)",
            color: "#ffffff",
            background: "#1f2937",
          },
          success: {
            duration: 3200,
            style: {
              borderRadius: "12px",
              boxShadow: "0 10px 26px rgba(15, 23, 42, 0.24)",
              padding: "12px 16px",
              fontSize: "14px",
              lineHeight: 1.35,
              maxWidth: "min(92vw, 420px)",
              color: "#ffffff",
              background: "#16a34a",
            },
          },
          error: {
            duration: 3600,
            style: {
              borderRadius: "12px",
              boxShadow: "0 10px 26px rgba(15, 23, 42, 0.24)",
              padding: "12px 16px",
              fontSize: "14px",
              lineHeight: 1.35,
              maxWidth: "min(92vw, 420px)",
              color: "#ffffff",
              background: "#dc2626",
            },
          },
        }}
      />
    </>
  );
}

export default App;
