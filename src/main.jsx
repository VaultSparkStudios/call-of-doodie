import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CallOfDoodie from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <CallOfDoodie />
    </ErrorBoundary>
  </StrictMode>
);
