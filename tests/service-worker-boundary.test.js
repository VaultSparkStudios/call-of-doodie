import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve("public/sw.js"), "utf8");

// Runs the real worker file against a minimal fake service-worker scope.
function loadWorker({ origin = "https://callofdoodie.wtf", network } = {}) {
  const listeners = {};
  const stores = new Map();
  const key = (req) => new URL(typeof req === "string" ? req : req.url, origin).href;
  const store = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };
  const cacheFor = (name) => ({
    match: async (req) => store(name).get(key(req))?.clone(),
    put: async (req, res) => { store(name).set(key(req), res); },
    addAll: async () => {},
  });
  const fetchCalls = [];
  const sandbox = {
    URL,
    Response,
    Promise,
    console,
    self: {
      location: { origin },
      registration: { scope: `${origin}/` },
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async (name) => cacheFor(name),
      match: async (req) => {
        for (const entries of stores.values()) {
          const hit = entries.get(key(req));
          if (hit) return hit.clone();
        }
        return undefined;
      },
      keys: async () => [...stores.keys()],
      delete: async (name) => stores.delete(name),
    },
    fetch: async (req) => { fetchCalls.push(req.url); return network(req); },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const dispatch = async (url, { method = "GET", mode = "cors" } = {}) => {
    let responded = null;
    const pending = [];
    listeners.fetch({
      request: { url, method, mode },
      respondWith: (promise) => { responded = Promise.resolve(promise); },
      waitUntil: (promise) => { pending.push(promise); },
    });
    if (!responded) return { handled: false };
    const response = await responded;
    await Promise.all(pending);
    return { handled: true, response };
  };
  return { dispatch, fetchCalls, stores };
}

const json = (body, cacheControl) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { "content-type": "application/json", ...(cacheControl ? { "cache-control": cacheControl } : {}) },
});

describe("service worker network boundary", () => {
  it("never answers same-origin /api requests from its cache", async () => {
    let version = 0;
    const worker = loadWorker({ network: async () => json({ version: ++version }, "no-store") });
    expect((await worker.dispatch("https://callofdoodie.wtf/api/top-scores")).handled).toBe(false);
    expect((await worker.dispatch("https://callofdoodie.wtf/api/profile?x=1")).handled).toBe(false);
    expect((await worker.dispatch("https://callofdoodie.wtf/_health")).handled).toBe(false);
  });

  it("still serves shell files stale-while-revalidate", async () => {
    const worker = loadWorker({ network: async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }) });
    const first = await worker.dispatch("https://callofdoodie.wtf/manifest.json");
    expect(first.handled).toBe(true);
    await first.response.text();
    const second = await worker.dispatch("https://callofdoodie.wtf/manifest.json");
    expect(second.handled).toBe(true);
    expect([...worker.stores.values()][0].has("https://callofdoodie.wtf/manifest.json")).toBe(true);
  });

  it("refuses to store no-store or private responses even on cached paths", async () => {
    for (const cacheControl of ["no-store", "private, max-age=0", "public, NO-STORE"]) {
      const worker = loadWorker({ network: async () => json({ ok: true }, cacheControl) });
      const result = await worker.dispatch("https://callofdoodie.wtf/data.json");
      await result.response.text();
      const entries = [...worker.stores.values()].flatMap((entries) => [...entries.keys()]);
      expect(entries, cacheControl).not.toContain("https://callofdoodie.wtf/data.json");
    }
  });

  it("compares origins exactly instead of by substring", async () => {
    const worker = loadWorker({ origin: "http://localhost:5173", network: async () => json({}) });
    expect((await worker.dispatch("http://localhost:51730/app.js")).handled).toBe(false);
    expect((await worker.dispatch("http://localhost:5173/app.js")).handled).toBe(true);
    const prod = loadWorker({ network: async () => json({}) });
    expect((await prod.dispatch("https://callofdoodie.wtf.evil.example/app.js")).handled).toBe(false);
    expect((await prod.dispatch("https://callofdoodie.wtf/app.js")).handled).toBe(true);
  });

  it.each([
    [200, "no-store"], [200, "private, max-age=0"], [404, "public"], [500, "public"],
  ])("does not cache navigation status %s with %s", async (status, cacheControl) => {
    const worker = loadWorker({ network: async () => new Response("page", { status, headers: { "cache-control": cacheControl } }) });
    const result = await worker.dispatch("https://callofdoodie.wtf/private", { mode: "navigate" });
    expect(result.response.status).toBe(status);
    expect(await result.response.text()).toBe("page");
    expect([...worker.stores.values()].flatMap(entries => [...entries.keys()])).toEqual([]);
  });

  it("stores public navigation without consuming it and keeps the offline shell", async () => {
    let offline = false;
    const worker = loadWorker({ network: async () => {
      if (offline) throw new Error("offline");
      return new Response("public shell", { headers: { "cache-control": "public" } });
    } });
    const first = await worker.dispatch("https://callofdoodie.wtf/index.html", { mode: "navigate" });
    expect(await first.response.text()).toBe("public shell");
    expect([...worker.stores.values()][0].has("https://callofdoodie.wtf/index.html")).toBe(true);
    offline = true;
    const fallback = await worker.dispatch("https://callofdoodie.wtf/other", { mode: "navigate" });
    expect(await fallback.response.text()).toBe("public shell");
  });

  it("uses a new cache name so previously stored /api entries are purged on activate", () => {
    expect(source).toMatch(/const CACHE_NAME = "cod-v(\d+)"/);
    const version = Number(source.match(/const CACHE_NAME = "cod-v(\d+)"/)[1]);
    expect(version).toBeGreaterThanOrEqual(7);
  });
});
