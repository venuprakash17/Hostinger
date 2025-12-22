import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logConfigWarning } from "@/lib/resumeitnow/utils/envCheck";

// Suppress non-critical connection errors (e.g., ping requests from dev tools)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    // Suppress ERR_CONNECTION_REFUSED for ping/health check requests
    if (
      message.includes('ERR_CONNECTION_REFUSED') &&
      (message.includes('ping') || message.includes('localhost:8081/') || message.includes('waitForSuccessfulPing'))
    ) {
      // Silently ignore these non-critical errors
      return;
    }
    originalError.apply(console, args);
  };
}

console.log("🚀 Main.tsx is loading...");
console.log("Root element:", document.getElementById("root"));

// Check ResumeItNow configuration on startup
if (typeof window !== 'undefined') {
  logConfigWarning();
}

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("❌ Root element not found!");
    document.body.innerHTML = "<h1 style='padding: 2rem; color: red;'>Error: Root element not found!</h1>";
  } else {
    console.log("✅ Root element found, rendering App...");
    createRoot(rootElement).render(<App />);
    console.log("✅ App rendered successfully!");
  }
} catch (error: any) {
  console.error("❌ Error in main.tsx:", error);
  const errorMsg = error?.message || String(error);
  const errorStack = error?.stack || '';
  document.body.innerHTML = `
    <div style="padding: 2rem; font-family: monospace;">
      <h1 style="color: red;">⚠️ Error Loading App</h1>
      <h2>${errorMsg}</h2>
      <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">${errorStack}</pre>
      <p>Check browser console (F12) for more details.</p>
    </div>
  `;
}
