import { createRoot } from "react-dom/client";

// Minimal test component
function TestApp() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>✅ React is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<TestApp />);
} else {
  console.error("❌ Root element not found!");
}
