import { describe, expect, it } from "vitest";
import { readBoundedJson } from "./httpIngress.js";

function request(body, contentType = "application/json") {
  return new Request("https://callofdoodie.wtf/api/profile", {
    method: "PUT",
    headers: { "content-type": contentType },
    body,
    ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
  });
}

describe("bounded API JSON ingress", () => {
  it("rejects a chunked body as soon as the UTF-8 byte ceiling is crossed", async () => {
    let sent = 0;
    const body = new ReadableStream({
      pull(controller) {
        sent += 1;
        controller.enqueue(new TextEncoder().encode("é".repeat(4)));
        if (sent === 5) controller.close();
      },
    });
    const parsed = await readBoundedJson(request(body), 12);
    expect(parsed).toEqual({ error: "too_large", status: 413 });
    expect(sent).toBeLessThan(5);
  });

  it("rejects corrupt UTF-8, invalid JSON and wrong media types", async () => {
    expect(await readBoundedJson(request(new Uint8Array([0xff])), 100)).toEqual({ error: "bad_json", status: 400 });
    expect(await readBoundedJson(request("{broken"), 100)).toEqual({ error: "bad_json", status: 400 });
    expect(await readBoundedJson(request("{}", "text/plain"), 100)).toEqual({ error: "unsupported_media_type", status: 415 });
  });

  it("times out a stalled upload without parsing it", async () => {
    const body = new ReadableStream({ start() {} });
    expect(await readBoundedJson(request(body), 100, 5)).toEqual({ error: "body_timeout", status: 408 });
  });
});
