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
          bottom: 20,
          left: 12,
          right: 12,
        }}
        toastOptions={{
          duration: 3200,
          style: {
            borderRadius: "14px",
            boxShadow: "0 14px 34px rgba(8, 20, 42, 0.28)",
            padding: "12px 18px",
            fontSize: "14px",
            lineHeight: 1.35,
            maxWidth: "min(92vw, 420px)",
            color: "#eaf3ff",
            border: "1px solid rgba(186, 202, 224, 0.24)",
            backdropFilter: "blur(12px)",
            background: "linear-gradient(140deg, rgba(20, 34, 56, 0.9), rgba(31, 51, 84, 0.86))",
          },
          success: {
            duration: 3200,
            style: {
              borderRadius: "14px",
              boxShadow: "0 14px 34px rgba(8, 20, 42, 0.24)",
              padding: "12px 18px",
              fontSize: "14px",
              lineHeight: 1.35,
              maxWidth: "min(92vw, 420px)",
              color: "#effff7",
              border: "1px solid rgba(96, 255, 180, 0.2)",
              backdropFilter: "blur(12px)",
              background: "linear-gradient(140deg, rgba(16, 128, 74, 0.94), rgba(11, 97, 58, 0.88))",
            },
          },
          error: {
            duration: 3600,
            style: {
              borderRadius: "14px",
              boxShadow: "0 14px 34px rgba(8, 20, 42, 0.24)",
              padding: "12px 18px",
              fontSize: "14px",
              lineHeight: 1.35,
              maxWidth: "min(92vw, 420px)",
              color: "#fff5f5",
              border: "1px solid rgba(255, 158, 158, 0.24)",
              backdropFilter: "blur(12px)",
              background: "linear-gradient(140deg, rgba(205, 44, 62, 0.95), rgba(152, 27, 45, 0.9))",
            },
          },
        }}
      />
    </>
  );
}

export default App;
