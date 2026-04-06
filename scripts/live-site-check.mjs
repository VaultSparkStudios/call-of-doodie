import fs from "node:fs";
import path from "node:path";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    contentType: response.headers.get("content-type") || "",
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadDotEnv(path.join(process.cwd(), ".env.local"));

  const siteUrl = process.env.COD_LIVE_URL || "https://vaultsparkstudios.com/call-of-doodie/";
  const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;

  console.log(`Live site target: ${normalizedSiteUrl}`);

  const html = await fetchText(normalizedSiteUrl);
  assert(html.status === 200, `Live page expected 200, got ${html.status}`);
  assert(html.text.includes("<title>Call of Doodie"), "Live page title missing");
  assert(html.text.includes('rel="canonical" href="https://vaultsparkstudios.com/call-of-doodie/"'), "Canonical URL missing");
  assert(html.text.includes("manifest.json"), "Manifest link missing from live HTML");
  assert(html.text.includes("favicon.svg"), "Favicon reference missing from live HTML");
  assert(html.text.includes("og-image.svg"), "OG image reference missing from live HTML");
  assert(html.text.includes('id="root"'), "App root node missing from live HTML");
  console.log("PASS live HTML shell checks");

  const manifest = await fetchText(`${normalizedSiteUrl}manifest.json`);
  assert(manifest.status === 200, `Manifest expected 200, got ${manifest.status}`);
  const manifestJson = JSON.parse(manifest.text);
  assert(manifestJson.start_url === "/call-of-doodie/", `Manifest start_url mismatch: ${manifestJson.start_url}`);
  assert(manifestJson.display === "standalone", `Manifest display mismatch: ${manifestJson.display}`);
  assert(Array.isArray(manifestJson.icons) && manifestJson.icons.some((icon) => icon.sizes === "192x192"), "Manifest missing 192x192 icon");
  assert(Array.isArray(manifestJson.icons) && manifestJson.icons.some((icon) => icon.sizes === "512x512"), "Manifest missing 512x512 icon");
  console.log("PASS manifest checks");

  const registerSw = await fetchText(`${normalizedSiteUrl}register-sw.js`);
  assert(registerSw.status === 200, `register-sw.js expected 200, got ${registerSw.status}`);
  assert(registerSw.text.includes("serviceWorker.register"), "Service worker registration call missing");
  assert(registerSw.text.includes("/call-of-doodie/sw.js"), "Service worker path missing");
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

  console.log("Live site check complete: 5/5 assertions passed.");
}

main().catch((error) => {
  console.error(`Live site check failed: ${error.message}`);
  process.exitCode = 1;
});
