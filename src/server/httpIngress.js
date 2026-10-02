const DEFAULT_TIMEOUT_MS = 5000;

/** Read a JSON request with a real byte ceiling, including chunked bodies. */
export async function readBoundedJson(request, maxBytes, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" && !/^application\/[a-z0-9.+-]+\+json$/.test(contentType || "")) {
    return { error: "unsupported_media_type", status: 415 };
  }
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))) {
    return { error: "bad_content_length", status: 400 };
  }
  if (declared !== null && Number(declared) > maxBytes) return { error: "too_large", status: 413 };
  if (!request.body) return { error: "bad_json", status: 400 };

  const reader = request.body.getReader();
  let timer;
  let total = 0;
  let shouldCancel = false;
  const chunks = [];
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("body_timeout")), timeoutMs);
  });
  try {
    const read = async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          shouldCancel = true;
          return { error: "too_large", status: 413 };
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let body;
      try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { return { error: "bad_json", status: 400 }; }
      if (!body || Array.isArray(body) || typeof body !== "object") return { error: "bad_json", status: 400 };
      return { body };
    };
    return await Promise.race([read(), timeout]);
  } catch (error) {
    shouldCancel = true;
    return error?.message === "body_timeout"
      ? { error: "body_timeout", status: 408 }
      : { error: "bad_json", status: 400 };
  } finally {
    clearTimeout(timer);
    if (shouldCancel) void reader.cancel().catch(() => {});
  }
}
