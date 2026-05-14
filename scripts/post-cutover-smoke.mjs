const DEFAULT_TARGETS = {
  apex: "https://callofdoodie.wtf/",
  www: "https://www.callofdoodie.wtf/",
  backup: "https://playcallofdoodie.com/",
  backupWww: "https://www.playcallofdoodie.com/",
  pages: "https://call-of-doodie.pages.dev/",
};

const TIMEOUT_MS = Number(process.env.COD_SMOKE_TIMEOUT_MS || 10000);

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return promise(controller.signal)
    .finally(() => clearTimeout(timeout))
    .catch((error) => {
      throw new Error(`${label}: ${error.name === "AbortError" ? `timed out after ${TIMEOUT_MS}ms` : error.message}`);
    });
}

async function fetchText(url, label, redirect = "follow") {
  return withTimeout(async (signal) => {
    const response = await fetch(url, { redirect, signal });
    const text = await response.text().catch(() => "");
    return {
      status: response.status,
      ok: response.ok,
      url: response.url,
      location: response.headers.get("location") || "",
      text,
      contentType: response.headers.get("content-type") || "",
    };
  }, label);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRedirect(name, fromUrl, targetUrl) {
  const response = await fetchText(fromUrl, name, "manual");
  assert([301, 302, 307, 308].includes(response.status), `${name}: expected redirect, got ${response.status}`);
  assert(response.location === targetUrl, `${name}: expected Location ${targetUrl}, got ${response.location || "(none)"}`);
  console.log(`PASS ${name} redirects to ${targetUrl}`);
}

async function assertPlayableHost(name, url) {
  const html = await fetchText(url, name);
  assert(html.status === 200, `${name}: expected 200, got ${html.status}`);
  assert(html.text.includes("<title>Call of Doodie"), `${name}: title missing`);
  assert(html.text.includes('rel="canonical" href="https://callofdoodie.wtf/"'), `${name}: canonical href mismatch`);
  assert(html.text.includes("manifest.json"), `${name}: manifest reference missing`);

  const manifest = await fetchText(new URL("manifest.json", url).toString(), `${name} manifest`);
  assert(manifest.status === 200, `${name} manifest: expected 200, got ${manifest.status}`);
  const json = JSON.parse(manifest.text);
  assert(json.start_url === "/", `${name} manifest: start_url mismatch ${json.start_url}`);
  assert(json.scope === "/", `${name} manifest: scope mismatch ${json.scope}`);
  console.log(`PASS ${name} serves playable shell + manifest`);
}

async function main() {
  const targets = {
    apex: process.env.COD_CANONICAL_URL || DEFAULT_TARGETS.apex,
    www: process.env.COD_WWW_URL || DEFAULT_TARGETS.www,
    backup: process.env.COD_BACKUP_URL || DEFAULT_TARGETS.backup,
    backupWww: process.env.COD_BACKUP_WWW_URL || DEFAULT_TARGETS.backupWww,
    pages: process.env.COD_PAGES_URL || DEFAULT_TARGETS.pages,
  };

  await assertPlayableHost("apex", targets.apex);
  await assertPlayableHost("pages", targets.pages);
  await assertRedirect("www", targets.www, targets.apex);
  await assertRedirect("backup", targets.backup, targets.apex);
  await assertRedirect("backup www", targets.backupWww, targets.apex);

  console.log("Post-cutover smoke complete: 5/5 surfaces passed.");
}

main().catch((error) => {
  console.error(`Post-cutover smoke failed: ${error.message}`);
  process.exitCode = 1;
});
