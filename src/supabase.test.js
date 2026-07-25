import { describe, expect, it, vi } from "vitest";
import { createSupabaseClientLoader } from "./supabase.js";

describe("lazy Supabase client loader", () => {
  it("does not load the vendor without configuration", async () => {
    const loadModule = vi.fn();
    const loadClient = createSupabaseClientLoader({ url: "", anonKey: "", loadModule });
    expect(await loadClient()).toBeNull();
    expect(loadModule).not.toHaveBeenCalled();
  });

  it("creates one client under concurrent demand", async () => {
    const client = { from: vi.fn() };
    const createClient = vi.fn(() => client);
    const loadModule = vi.fn(async () => ({ createClient }));
    const loadClient = createSupabaseClientLoader({ url: "https://db.test", anonKey: "anon", loadModule });
    const [first, second] = await Promise.all([loadClient(), loadClient()]);
    expect(first).toBe(client);
    expect(second).toBe(client);
    expect(loadModule).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("fails closed and permits a later retry", async () => {
    const client = { from: vi.fn() };
    const loadModule = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ createClient: () => client });
    const loadClient = createSupabaseClientLoader({ url: "https://db.test", anonKey: "anon", loadModule });
    expect(await loadClient()).toBeNull();
    expect(await loadClient()).toBe(client);
    expect(loadModule).toHaveBeenCalledTimes(2);
  });
});
