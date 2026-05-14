const base = new URL(".", import.meta.url).pathname;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${base}sw.js`);
  });
}
