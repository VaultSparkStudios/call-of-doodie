// Current roadmap claims derive from the same observed capability contract
// used by status, machine-readable discovery and current release notes.
import { PUBLIC_CAPABILITIES } from "./capabilities.js";

export const ROADMAP = Object.freeze({
  shipped: PUBLIC_CAPABILITIES.filter((entry) => entry.group === "shipped").map((entry) => [entry.label, entry.benefit]),
  next: PUBLIC_CAPABILITIES.filter((entry) => entry.group === "next").map((entry) => [entry.label, entry.benefit]),
  later: PUBLIC_CAPABILITIES.filter((entry) => entry.group === "later").map((entry) => [entry.label, entry.benefit]),
});

export function roadmapSections() {
  const line = (group) => PUBLIC_CAPABILITIES.filter((entry) => entry.group === group)
    .map((entry) => `${entry.label} — ${entry.benefit}${entry.availability === "unavailable" ? " Not available on the current deployment." : ""}`).join(" · ");
  return [
    ["Shipped", line("shipped")],
    ["Next", line("next")],
    ["Later, and not live yet", line("later")],
  ];
}
