import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";

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

function fetchText(url) {
  return fetch(url).then((response) => response.text().then((text) => ({
    ok: response.ok,
    status: response.status,
    text,
  })));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeLocation(loc) {
  return stripTrailingSlash(String(loc).trim().toLowerCase());
}

function toUrlOrNull(candidate) {
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function sitemapHasGame(sitemapText, gameUrl) {
  const parsed = toUrlOrNull(gameUrl);
  const haystack = sitemapText.toLowerCase();

  const candidates = new Set();
  const normalizedGameUrl = normalizeLocation(gameUrl);
  if (normalizedGameUrl) candidates.add(normalizedGameUrl);

  if (parsed) {
    candidates.add(normalizeLocation(parsed.origin));

    const pathname = parsed.pathname && parsed.pathname !== "/" ? stripTrailingSlash(parsed.pathname) : "";
    if (pathname) {
      candidates.add(normalizeLocation(pathname));
    }

    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    candidates.add(hostname);

    const hostPrefix = hostname.split(".")[0];
    candidates.add(hostPrefix);
    if (hostPrefix && !hostPrefix.includes("-") && hostPrefix.includes("of")) {
      candidates.add(hostPrefix.replace("of", "-of-"));
    }
  }

  candidates.add("call-of-doodie");
  candidates.add("callofdoodie");

  for (const candidate of candidates) {
    if (candidate && haystack.includes(candidate)) {
      return true;
    }
  }

  return false;
}

async function main() {
  loadDotEnv(path.join(process.cwd(), ".env.local"));

  const siteRoot = process.env.COD_SITE_ROOT || "https://vaultsparkstudios.com/";
  const gameUrl = process.env.COD_LIVE_URL || "https://callofdoodie.wtf/";
  const homepageUrl = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;
  const sitemapUrl = `${homepageUrl}sitemap.xml`;
  const optionalGamesHubUrl = `${homepageUrl}games/`;

  console.log(`Launch surface target: ${homepageUrl}`);

  const homepage = await fetchText(homepageUrl);
  assert(homepage.status === 200, `Homepage expected 200, got ${homepage.status}`);
  assert(homepage.text.includes("call-of-doodie") || homepage.text.includes(gameUrl), "Homepage does not reference Call of Doodie.");
  console.log("PASS homepage references Call of Doodie");

  const sitemap = await fetchText(sitemapUrl);
  assert(sitemap.status === 200, `Sitemap expected 200, got ${sitemap.status}`);
  assert(sitemapHasGame(sitemap.text, gameUrl), "Sitemap does not include Call of Doodie.");
  console.log("PASS sitemap includes Call of Doodie");

  const gamePage = await fetchText(gameUrl);
  assert(gamePage.status === 200, `Live game page expected 200, got ${gamePage.status}`);
  assert(gamePage.text.includes("VaultSpark Studios"), "Live game page missing VaultSpark Studios branding.");
  console.log("PASS live game page branding check");

  const gamesHub = await fetchText(optionalGamesHubUrl);
  if (!gamesHub.ok) {
    console.log(`INFO optional games hub check skipped: ${optionalGamesHubUrl} returned ${gamesHub.status}`);
  } else if (gamesHub.text.includes("call-of-doodie") || gamesHub.text.includes(gameUrl)) {
    console.log("PASS optional games hub references Call of Doodie");
  } else {
    throw new Error("Optional games hub loaded but did not reference Call of Doodie.");
  }

  console.log("Launch surface check complete.");
}

main().catch((error) => {
  console.error(`Launch surface check failed: ${error.message}`);
  process.exitCode = 1;
});
