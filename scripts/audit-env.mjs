const groups = [
  {
    name: "GitHub Pages build",
    required: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    optional: ["VITE_POSTHOG_KEY", "VITE_SENTRY_DSN"],
  },
  {
    name: "Supabase Edge Function runtime",
    required: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    optional: ["RUN_TOKEN_SIGNING_SECRET"],
    warnings: [{
      key: "RUN_TOKEN_SIGNING_SECRET",
      whenMissing: "HMAC signing falls back to the service-role key — set a dedicated secret so a signing-key rotation never requires a service-role rotation (S145).",
    }],
  },
  {
    name: "GitHub Actions function deploy",
    required: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"],
    optional: [],
  },
];

const mode = process.argv[2] || "all";
const validModes = new Set(["all", "site", "functions", "deploy"]);
if (!validModes.has(mode)) {
  console.error(`Unknown mode "${mode}". Use one of: all, site, functions, deploy`);
  process.exit(1);
}

const selectedGroups = groups.filter((group) => {
  if (mode === "all") return true;
  if (mode === "site") return group.name === "GitHub Pages build";
  if (mode === "functions") return group.name === "Supabase Edge Function runtime";
  if (mode === "deploy") return group.name === "GitHub Actions function deploy";
  return false;
});

let missingRequired = 0;

for (const group of selectedGroups) {
  console.log(`\n[${group.name}]`);

  for (const key of group.required) {
    const present = Boolean(process.env[key]);
    console.log(`- ${present ? "OK" : "MISSING"} ${key}`);
    if (!present) missingRequired += 1;
  }

  for (const key of group.optional) {
    const present = Boolean(process.env[key]);
    console.log(`- ${present ? "SET" : "OPTIONAL"} ${key}`);
  }

  for (const warning of group.warnings || []) {
    if (!process.env[warning.key]) console.log(`- WARN ${warning.key}: ${warning.whenMissing}`);
  }
}

if (missingRequired > 0) {
  console.error(`\nMissing ${missingRequired} required environment variable(s).`);
  process.exit(1);
}

console.log("\nAll required environment variables for the selected scope are present.");
