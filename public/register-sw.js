const base = import.meta.env?.BASE_URL || "/";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${base}sw.js`);
  });
}
