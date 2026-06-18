import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { callClaude, MODELS, safeJsonStringify, sanitizeUnicodeScalars } from "../scripts/lib/model-router.mjs";

function fakeHttps(capture) {
  return {
    request(options, callback) {
      const req = new EventEmitter();
      req.write = (chunk) => { capture.payload = chunk; };
      req.end = () => {
        const res = new EventEmitter();
        callback(res);
        res.emit("data", JSON.stringify({ content: [{ type: "text", text: "ok" }], usage: {} }));
        res.emit("end");
      };
      return req;
    },
  };
}

describe("model-router Unicode transport safety", () => {
  it("replaces lone surrogates before API JSON transport", async () => {
    const capture = {};
    await callClaude({
      apiKey: "test-key",
      model: MODELS.haiku,
      maxTokens: 8,
      turnClassify: false,
      system: "stable \uD800 prefix",
      messages: [{ role: "user", content: "bad high \uD800 and bad low \uDC00" }],
    }, fakeHttps(capture));

    expect(capture.payload).not.toContain("\\ud800");
    expect(capture.payload).not.toContain("\\udc00");
    const parsed = JSON.parse(capture.payload);
    expect(parsed.system).toContain("\uFFFD");
    expect(parsed.messages[0].content).toContain("\uFFFD");
  });

  it("preserves valid surrogate-pair characters", () => {
    const sanitized = sanitizeUnicodeScalars({ text: "valid 💩 emoji" });
    expect(sanitized.text).toBe("valid 💩 emoji");
    expect(safeJsonStringify(sanitized)).toContain("💩");
  });
});
