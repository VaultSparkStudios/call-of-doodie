import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.resolve("public/sw.js"), "utf8");

// Runs the real worker file against a minimal fake service-worker scope.
function loadWorker({ origin = "https://callofdoodie.wtf", network } = {}) {
  const listeners = {};
  const stores = new Map();
  const store = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };
  const cacheFor = (name) => ({
    match: async (req) => store(name).get(typeof req === "string" ? req : req.url),
    put: async (req, res) => { store(name).set(req.url, res); },
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
          const hit = entries.get(typeof req === "string" ? req : req.url);
          if (hit) return hit;
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
    listeners.fetch({
      request: { url, method, mode },
      respondWith: (promise) => { responded = Promise.resolve(promise); },
    });
    return responded ? { handled: true, response: await responded } : { handled: false };
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

  it("uses a new cache name so previously stored /api entries are purged on activate", () => {
    expect(source).toMatch(/const CACHE_NAME = "cod-v(\d+)"/);
    const version = Number(source.match(/const CACHE_NAME = "cod-v(\d+)"/)[1]);
    expect(version).toBeGreaterThanOrEqual(7);
  });
});
