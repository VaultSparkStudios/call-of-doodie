// Highlight-GIF frame capture (extracted from the game loop, S145).
// Desktop-only rolling buffer; cadence widens under sustained frame drops so
// capture never causes the drops it exists to showcase (S57 invariant: never
// disable outright or the death-screen GIF is silently empty).

export function captureGifFrame(canvas, gifOffscreenRef, frameBuffer) {
  if (!canvas) return;
  if (!gifOffscreenRef.current) {
    const scale = Math.min(1, 240 / canvas.width);
    const oc = document.createElement("canvas");
    oc.width = Math.floor(canvas.width * scale);
    oc.height = Math.floor(canvas.height * scale);
    gifOffscreenRef.current = oc;
  }
  const oc = gifOffscreenRef.current;
  const octx = oc.getContext("2d", { willReadFrequently: true });
  octx.drawImage(canvas, 0, 0, oc.width, oc.height);
  const id = octx.getImageData(0, 0, oc.width, oc.height);
  frameBuffer.push({ data: new Uint8Array(id.data.buffer), ts: Date.now() });
  if (frameBuffer.length > 60) frameBuffer.shift(); // keep ~10s at 6fps
}
