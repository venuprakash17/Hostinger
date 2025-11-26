// Minimal test app to verify React works
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

function TestPage() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>✅ React is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>The issue is likely in one of the imported components.</p>
    </div>
  );
}

function MinimalApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/test" replace />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/login" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default MinimalApp;

