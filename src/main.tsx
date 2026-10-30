import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

void initSentry(); // optional error reporting (VITE_SENTRY_DSN)

createRoot(document.getElementById("root")!).render(<App />);
