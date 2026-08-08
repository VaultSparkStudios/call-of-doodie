#!/usr/bin/env node
// Configures the credential-hiding Pages Function proxy without printing values.

import { cfAccountId, cfDeploy } from "../../vaultspark-studio-ops/scripts/lib/cf-deploy.mjs";
import { getSecret } from "./lib/secrets.mjs";

const apply = process.argv.includes("--apply");
const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
const supabaseAnonKey = getSecret("SUPABASE_ANON_KEY", "supabase.admin");
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Community Stats Pages configuration requires Supabase admin capability.");
  process.exit(1);
}
if (!apply) {
  console.log(JSON.stringify({
    apply: false,
    project: "call-of-doodie",
    environments: ["production", "preview"],
    keys: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
  }, null, 2));
  process.exit(0);
}

const envVars = {
  SUPABASE_URL: { type: "plain_text", value: supabaseUrl },
  SUPABASE_ANON_KEY: { type: "secret_text", value: supabaseAnonKey },
};
const accountId = await cfAccountId();
const response = await cfDeploy(
  "community-stats-pages-env",
  `/accounts/${accountId}/pages/projects/call-of-doodie`,
  {
    method: "PATCH",
    body: JSON.stringify({
      deployment_configs: {
        production: { env_vars: envVars },
        preview: { env_vars: envVars },
      },
    }),
  },
);
if (!response.ok) {
  console.error(`Cloudflare Pages environment update failed (${response.status}).`);
  process.exit(1);
}
console.log("Community Stats Pages environment: configured for production + preview");
