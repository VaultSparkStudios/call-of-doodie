import { describe, expect, it } from "vitest";
import { getObeliskRoute } from "./obeliskRoutes.js";

describe("Obelisk route classifier", () => {
  it("routes only explicit auth surfaces away from the game", () => {
    expect(getObeliskRoute("/login")).toBe("login");
    expect(getObeliskRoute("/login/")).toBe("login");
    expect(getObeliskRoute("/auth/callback")).toBe("callback");
    expect(getObeliskRoute("/auth/callback/")).toBe("callback");
    expect(getObeliskRoute("/")).toBe("game");
    expect(getObeliskRoute("/daily")).toBe("game");
    expect(getObeliskRoute("/anything-else")).toBe("game");
  });
});
