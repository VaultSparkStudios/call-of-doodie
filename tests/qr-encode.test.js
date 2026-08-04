import { describe, expect, it } from 'vitest';
import { MAX_QR_PAYLOAD_BYTES, qrEncode } from '../src/utils/qrEncode.js';

function assertFinder(matrix, row, column) {
  for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
    const expected = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
    expect(matrix[row + r][column + c]).toBe(expected);
  }
}

describe('QR reference-vector court', () => {
  it.each(['https://callofdoodie.wtf/', 'COD-7af09c', 'Doodie 🚽'])('encodes deterministic square matrices for %s', (payload) => {
    const first = qrEncode(payload);
    const second = qrEncode(payload);
    expect(first).toEqual(second);
    expect(first.matrix).toHaveLength(first.size);
    expect(first.matrix.every((row) => row.length === first.size && row.every((cell) => typeof cell === 'boolean'))).toBe(true);
    assertFinder(first.matrix, 0, 0);
    assertFinder(first.matrix, 0, first.size - 7);
    assertFinder(first.matrix, first.size - 7, 0);
  });

  it('fails closed instead of silently truncating an unsupported payload', () => {
    expect(() => qrEncode('x'.repeat(MAX_QR_PAYLOAD_BYTES + 1))).toThrow(/maximum supported payload/);
    expect(qrEncode('x'.repeat(MAX_QR_PAYLOAD_BYTES)).size).toBe(37);
  });
});
