const base = new URL(".", import.meta.url).pathname;
const lifecycleEvent = "cod:service-worker-lifecycle";

function emitLifecycle(detail) {
  const receipt = {
    supported: true,
    registered: Boolean(detail.registered),
    controlled: Boolean(navigator.serviceWorker.controller),
    updateReady: Boolean(detail.updateReady),
    failed: Boolean(detail.failed),
    errorCode: detail.failed ? String(detail.errorCode || "registration-error").slice(0, 48) : null,
  };
  window.__COD_SW_LIFECYCLE__ = receipt;
  window.dispatchEvent(new CustomEvent(lifecycleEvent, { detail: receipt }));
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    emitLifecycle({ registered: false });
    try {
      const registration = await navigator.serviceWorker.register(`${base}sw.js`);
      emitLifecycle({ registered: true, updateReady: Boolean(registration.waiting) });

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            emitLifecycle({ registered: true, updateReady: Boolean(navigator.serviceWorker.controller) });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        emitLifecycle({ registered: true, updateReady: false });
      });
    } catch (error) {
      emitLifecycle({
        registered: false,
        failed: true,
        errorCode: error?.name || "registration-error",
      });
    }
  });
}
