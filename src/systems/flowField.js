export const FF_CELL = 24;

export function buildFlowField(W, H, px, py, obstacles = [], cellSize = FF_CELL) {
  const cols = Math.ceil(W / cellSize);
  const rows = Math.ceil(H / cellSize);
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cellSize;
      const cy = (r + 0.5) * cellSize;
      for (const ob of obstacles) {
        if (cx > ob.x - 10 && cx < ob.x + ob.w + 10 && cy > ob.y - 10 && cy < ob.y + ob.h + 10) {
          blocked[r * cols + c] = 1;
          break;
        }
      }
    }
  }

  const fdx = new Float32Array(cols * rows);
  const fdy = new Float32Array(cols * rows);
  const visited = new Uint8Array(cols * rows);
  const pc = Math.min(cols - 1, Math.max(0, Math.floor(px / cellSize)));
  const pr = Math.min(rows - 1, Math.max(0, Math.floor(py / cellSize)));
  visited[pr * cols + pc] = 1;
  const queue = [[pc, pr]];
  let qi = 0;
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  while (qi < queue.length) {
    const [cc, cr] = queue[qi++];
    for (const [dc, dr] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      if (visited[nr * cols + nc] || blocked[nr * cols + nc]) continue;
      visited[nr * cols + nc] = 1;
      const ddx = cc - nc;
      const ddy = cr - nr;
      const dl = Math.hypot(ddx, ddy);
      fdx[nr * cols + nc] = ddx / dl;
      fdy[nr * cols + nc] = ddy / dl;
      queue.push([nc, nr]);
    }
  }
  return { fdx, fdy, cols, rows, cellSize };
}

export function sampleFlowField(flowField, x, y) {
  if (!flowField) return null;
  const cellSize = flowField.cellSize || FF_CELL;
  const fc = Math.min(flowField.cols - 1, Math.max(0, Math.floor(x / cellSize)));
  const fr = Math.min(flowField.rows - 1, Math.max(0, Math.floor(y / cellSize)));
  const idx = fr * flowField.cols + fc;
  const dx = flowField.fdx[idx] || 0;
  const dy = flowField.fdy[idx] || 0;
  return dx !== 0 || dy !== 0 ? { sx: dx, sy: dy } : null;
}
