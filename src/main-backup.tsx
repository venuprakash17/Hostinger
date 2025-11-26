import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 Main.tsx is loading...");
console.log("Root element:", document.getElementById("root"));

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("❌ Root element not found!");
    document.body.innerHTML = "<h1>Error: Root element not found!</h1>";
  } else {
    console.log("✅ Root element found, rendering App...");
    createRoot(rootElement).render(<App />);
    console.log("✅ App rendered successfully!");
  }
} catch (error) {
  console.error("❌ Error in main.tsx:", error);
  document.body.innerHTML = `<h1>Error: ${error}</h1><pre>${error.stack || error}</pre>`;
}
