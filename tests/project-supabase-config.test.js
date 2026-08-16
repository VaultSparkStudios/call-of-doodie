import { describe, expect, it } from "vitest";
import {
  PROJECT_SUPABASE_REF,
  PROJECT_SUPABASE_URL,
  extractExpectedSupabaseConfig,
  extractProjectAnonKeyFromManagement,
  isProjectAnonKey,
} from "../scripts/lib/project-supabase-config.mjs";

const token = (payload) => [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify(payload)).toString("base64url"),
  "signature",
].join(".");

describe("project Supabase public config", () => {
  it("accepts only the Call of Doodie anon-key identity", () => {
    expect(isProjectAnonKey(token({ ref: PROJECT_SUPABASE_REF, role: "anon" }))).toBe(true);
    expect(isProjectAnonKey(token({ ref: PROJECT_SUPABASE_REF, role: "service_role" }))).toBe(false);
    expect(isProjectAnonKey(token({ ref: "another-project", role: "anon" }))).toBe(false);
  });

  it("extracts the expected deployed pair and rejects unrelated project bundles", () => {
    const expected = token({ ref: PROJECT_SUPABASE_REF, role: "anon" });
    expect(extractExpectedSupabaseConfig(`x=${JSON.stringify(PROJECT_SUPABASE_URL)};k=${JSON.stringify(expected)}`))
      .toEqual({ supabaseUrl: PROJECT_SUPABASE_URL, anonKey: expected });
    expect(extractExpectedSupabaseConfig(`x="https://other.supabase.co";k="${expected}"`)).toBeNull();
  });

  it("accepts only this project's anon identity from management API shapes", () => {
    const expected = token({ ref: PROJECT_SUPABASE_REF, role: "anon" });
    const service = token({ ref: PROJECT_SUPABASE_REF, role: "service_role" });
    expect(extractProjectAnonKeyFromManagement([{ name: "service_role", api_key: service }, { name: "anon", api_key: expected }])).toBe(expected);
    expect(extractProjectAnonKeyFromManagement({ api_keys: [{ value: expected }] })).toBe(expected);
    expect(extractProjectAnonKeyFromManagement([{ api_key: service }])).toBeNull();
  });
});
