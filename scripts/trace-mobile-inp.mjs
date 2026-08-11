#!/usr/bin/env node

// S147 — real Chrome DevTools trace capture for the mobile mode-selector INP
// regression (context/DECISIONS.md S146: 1408ms vs the 832ms S142 baseline,
// grep alone could not find the blocking task). Uses a raw CDP Tracing
// session (the same trace format the DevTools Performance panel records)
// instead of another source-reading guess.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const baseUrl = process.argv[2] || "https://callofdoodie.wtf/";
const outPath = path.join(root, "docs", "performance", "MOBILE_INP_TRACE_S147.json");

const TRACE_CATEGORIES = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-v8.cpu_profiler",
  "blink.user_timing",
  "loading",
].join(",");

const browser = await chromium.launch({ headless: true });
let report;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("cod-theme", "sewer-night");
    localStorage.setItem("cod-callsign-v1", "TRACE-QA");
    localStorage.setItem("cod-home-v2", "1");
  });
  await page.goto(new URL("?home=v2&theme=sewer-night", baseUrl).href, { waitUntil: "networkidle" });

  const action = page.locator('button[data-mode-id="score_attack"]');
  await action.waitFor({ state: "visible" });
  await page.waitForTimeout(1000);

  const client = await context.newCDPSession(page);
  const events = [];
  client.on("Tracing.dataCollected", (data) => { events.push(...(data.value || [])); });
  await client.send("Tracing.start", { categories: TRACE_CATEGORIES, transferMode: "ReportEvents" });
  await page.waitForTimeout(50);

  const clickStartWall = Date.now();
  await action.click();
  await page.waitForTimeout(1600); // outlast the 1408ms observed INP with margin
  const clickEndWall = Date.now();

  await new Promise((resolve) => {
    client.once("Tracing.tracingComplete", resolve);
    client.send("Tracing.end");
  });
  await client.detach();

  // Trace timestamps are microseconds since an arbitrary epoch; find the
  // click's own timestamp via its EventDispatch entry to anchor the window
  // instead of trusting wall-clock skew between Node and the renderer.
  const clickDispatch = events.find((e) => e.name === "EventDispatch" && e.args?.data?.type === "click");
  const anchorUs = clickDispatch ? clickDispatch.ts : null;
  const windowStartUs = anchorUs != null ? anchorUs - 20000 : null;
  const windowEndUs = anchorUs != null ? anchorUs + 2000000 : null;

  const inWindow = (e) => windowStartUs == null || (e.ts >= windowStartUs && e.ts <= windowEndUs);

  const longTasks = events
    .filter((e) => inWindow(e) && (e.name === "RunTask" || e.name === "FunctionCall" || e.name === "EvaluateScript" || e.name === "V8.Compile" || e.name === "Layout" || e.name === "UpdateLayoutTree" || e.name === "Paint" || e.name === "Timer Fired") && typeof e.dur === "number")
    .map((e) => ({
      name: e.name,
      durMs: Math.round((e.dur || 0) / 100) / 10,
      tsOffsetMs: anchorUs != null ? Math.round((e.ts - anchorUs) / 100) / 10 : null,
      functionName: e.args?.data?.functionName || e.args?.data?.name || null,
      url: e.args?.data?.url || null,
      lineNumber: e.args?.data?.lineNumber ?? null,
    }))
    .filter((e) => e.durMs >= 5)
    .sort((a, b) => b.durMs - a.durMs)
    .slice(0, 25);

  report = {
    schemaVersion: "mobile-inp-trace-v1",
    capturedAt: new Date().toISOString(),
    baseUrl,
    method: "Raw CDP Tracing session (devtools.timeline + v8.cpu_profiler categories) around a real click on the mobile Score Attack button, anchored to the trace's own EventDispatch(click) timestamp — not wall-clock.",
    priorEvidence: "docs/performance/STAGING_SESSION_142_INP.json recorded 1408ms via the Event Timing API; context/DECISIONS.md S146 found no synchronous work in HomeV2.jsx by grep alone.",
    clickAnchorFound: Boolean(clickDispatch),
    totalTraceEvents: events.length,
    eventsInWindow: events.filter(inWindow).length,
    topEventsByDuration: longTasks,
    wallClockClickToSettleMs: clickEndWall - clickStartWall,
  };
} finally {
  await browser.close();
}

fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
