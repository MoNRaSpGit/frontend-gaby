import { Navigate, Route, Routes } from "react-router-dom";
import { GabyHomePage } from "../features/gaby/GabyHomePage";

function HealthPage() {
  return (
    <main style={{ fontFamily: "Inter, Segoe UI, sans-serif", padding: "2rem" }}>
      <h2>Frontend Gaby Almacén OK</h2>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<GabyHomePage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
