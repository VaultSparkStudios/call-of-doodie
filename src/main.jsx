import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CallOfDoodie from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CallOfDoodie />
  </StrictMode>
);
