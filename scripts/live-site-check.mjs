#!/usr/bin/env node

// Usage: node scripts/live-site-check.mjs [--url=<origin>]
// Runs seven read-only assertions against an explicit URL or the canonical site.

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/live-site-check.mjs [--url=<origin>]");
  process.exit(0);
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    contentType: response.headers.get("content-type") || "",
    headers: response.headers,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const siteUrl = process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length)
    || "https://callofdoodie.wtf/";
  const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;

  console.log(`Live site target: ${normalizedSiteUrl}`);

  const html = await fetchText(normalizedSiteUrl);
  assert(html.status === 200, `Live page expected 200, got ${html.status}`);
  assert(html.text.includes("<title>Call of Doodie"), "Live page title missing");
  assert(html.text.includes('rel="canonical" href="https://callofdoodie.wtf/"'), "Canonical URL missing");
  assert(html.text.includes("manifest.json"), "Manifest link missing from live HTML");
  assert(html.text.includes("favicon.svg"), "Favicon reference missing from live HTML");
  assert(html.text.includes("og-image.svg"), "OG image reference missing from live HTML");
  assert(html.text.includes('id="root"'), "App root node missing from live HTML");
  const hsts = html.headers.get("strict-transport-security") || "";
  assert(/^max-age=(?:31536000|[3-9]\d{7,});\s*includeSubDomains$/i.test(hsts), `HSTS policy missing or weak: ${hsts || "<missing>"}`);
  console.log("PASS live HTML shell checks");

  const health = await fetchText(`${normalizedSiteUrl}_health`);
  assert(health.status === 200, `Edge health expected 200, got ${health.status}`);
  assert(health.contentType.includes("application/json"), `Edge health must be JSON, got ${health.contentType || "<missing>"}`);
  const healthJson = JSON.parse(health.text);
  assert(healthJson.contract === "edge-health-v1", `Edge health contract mismatch: ${healthJson.contract || "<missing>"}`);
  assert(healthJson.status === "edge-ready", `Edge health status mismatch: ${healthJson.status || "<missing>"}`);
  assert(healthJson.service === "call-of-doodie", `Edge health service mismatch: ${healthJson.service || "<missing>"}`);
  console.log("PASS typed edge health + HSTS checks");

  const manifest = await fetchText(`${normalizedSiteUrl}manifest.json`);
  assert(manifest.status === 200, `Manifest expected 200, got ${manifest.status}`);
  const manifestJson = JSON.parse(manifest.text);
  assert(manifestJson.start_url === "/", `Manifest start_url mismatch: ${manifestJson.start_url}`);
  assert(manifestJson.scope === "/", `Manifest scope mismatch: ${manifestJson.scope}`);
  assert(manifestJson.display === "standalone", `Manifest display mismatch: ${manifestJson.display}`);
  assert(Array.isArray(manifestJson.icons) && manifestJson.icons.some((icon) => icon.sizes === "192x192"), "Manifest missing 192x192 icon");
  assert(Array.isArray(manifestJson.icons) && manifestJson.icons.some((icon) => icon.sizes === "512x512"), "Manifest missing 512x512 icon");
  console.log("PASS manifest checks");

  const registerSw = await fetchText(`${normalizedSiteUrl}register-sw.js`);
  assert(registerSw.status === 200, `register-sw.js expected 200, got ${registerSw.status}`);
  assert(registerSw.text.includes("serviceWorker.register"), "Service worker registration call missing");
  assert(registerSw.text.includes("new URL(\".\", import.meta.url).pathname"), "Service worker base derivation missing");
  assert(registerSw.text.includes("serviceWorker.register(`${base}sw.js`)"), "Service worker path missing");
  console.log("PASS service worker registration checks");

  const sw = await fetchText(`${normalizedSiteUrl}sw.js`);
  assert(sw.status === 200, `sw.js expected 200, got ${sw.status}`);
  assert(sw.text.includes("og-image.svg"), "Service worker cache list missing OG image");
  assert(sw.text.includes("fetch"), "Service worker fetch handler missing");
  console.log("PASS service worker file checks");

  const ogImage = await fetchText(`${normalizedSiteUrl}og-image.svg`);
  assert(ogImage.status === 200, `og-image.svg expected 200, got ${ogImage.status}`);
  assert(ogImage.contentType.includes("image/svg+xml"), `OG image content-type mismatch: ${ogImage.contentType}`);
  console.log("PASS OG image checks");

  console.log("Live site check complete: 7/7 assertions passed.");
}

main().catch((error) => {
  console.error(`Live site check failed: ${error.message}`);
  process.exitCode = 1;
});
