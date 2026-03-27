// Minimal QR Code encoder — byte mode, error correction level M, version auto-selected
// Returns a 2D boolean matrix (true = dark module)

const GF = 283; // QR Code GF(256) primitive polynomial
function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  let r = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) r ^= a;
    const hb = a & 0x80;
    a = (a << 1) & 0xFF;
    if (hb) a ^= (GF & 0xFF);
    b >>= 1;
  }
  return r;
}

// Generate Reed-Solomon check symbols
function rsEncode(data, ncheck) {
  // Generator polynomial coefficients for ncheck symbols
  const gen = [1];
  for (let i = 0; i < ncheck; i++) {
    const a = 1 << i;
    for (let j = gen.length - 1; j >= 0; j--) {
      gen[j] = gfMul(gen[j], a);
      if (j > 0) gen[j] ^= gen[j-1];
    }
    gen.unshift(0);
  }
  gen.shift();
  const res = [...data];
  for (let i = 0; i < ncheck; i++) res.push(0);
  for (let i = 0; i < data.length; i++) {
    const c = res[i];
    if (c !== 0) for (let j = 0; j < ncheck; j++) res[i+1+j] ^= gfMul(gen[j], c);
  }
  return res.slice(data.length);
}

// QR version info: [version, ecl, dataCW, ecCW, blocks, dcPerBlock, ecPerBlock]
// We support versions 1-5, ECL M
const VERSIONS = [
  [1,'M', 13, 10, 1, 13, 10],
  [2,'M', 22, 16, 1, 22, 16],
  [3,'M', 34, 26, 2, 17, 13],
  [4,'M', 48, 36, 2, 24, 18],
  [5,'M', 64, 48, 2, 32, 24],
];

export function qrEncode(text) {
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  // Pick version
  const vInfo = VERSIONS.find(v => v[2] >= Math.ceil(len * 8 / 8) + 2) || VERSIONS[VERSIONS.length-1];
  const [version, , dataCW, , blocks, dcPerBlock, ecPerBlock] = vInfo;
  const size = 17 + version * 4;

  // Build data bitstream — byte mode
  const bits = [];
  const addBits = (val, n) => { for (let i = n-1; i >= 0; i--) bits.push((val >> i) & 1); };
  addBits(0b0100, 4); // byte mode
  addBits(len, 8);    // character count
  for (const b of bytes) addBits(b, 8);
  // Terminator + padding
  for (let i = 0; i < 4 && bits.length < dataCW * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const padBytes = [0xEC, 0x11];
  let pi = 0;
  while (bits.length < dataCW * 8) { addBits(padBytes[pi % 2], 8); pi++; }

  // Data codewords
  const dataCWs = [];
  for (let i = 0; i < dataCW; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i*8+j] || 0);
    dataCWs.push(b);
  }

  // Split into blocks and add EC
  const allData = [], allEC = [];
  let off = 0;
  for (let b = 0; b < blocks; b++) {
    const block = dataCWs.slice(off, off + dcPerBlock); off += dcPerBlock;
    allData.push(block);
    allEC.push(rsEncode(block, ecPerBlock));
  }

  // Interleave
  const codewords = [];
  const maxDC = Math.max(...allData.map(b => b.length));
  for (let i = 0; i < maxDC; i++) allData.forEach(b => { if (i < b.length) codewords.push(b[i]); });
  const maxEC = Math.max(...allEC.map(b => b.length));
  for (let i = 0; i < maxEC; i++) allEC.forEach(b => { if (i < b.length) codewords.push(b[i]); });

  // Place modules
  const m = Array.from({length: size}, () => new Array(size).fill(null)); // null=unset, true=dark, false=light
  const fn = Array.from({length: size}, () => new Array(size).fill(false)); // function module mask
  const set = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) { m[r][c] = v; fn[r][c] = true; } };

  // Finder patterns
  const finder = (r, c) => {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const inFinder = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const dark = inFinder && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
      set(r+dr, c+dc, inFinder ? dark : false);
    }
  };
  finder(0, 0); finder(0, size-7); finder(size-7, 0);

  // Timing patterns
  for (let i = 8; i < size-8; i++) {
    set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0);
  }

  // Dark module
  set(4*version+9, 8, true);

  // Alignment patterns (version >= 2)
  if (version >= 2) {
    const ap = [[6,18],[18,6],[18,18]]; // simplified for v2-5
    if (version >= 3) ap.push([6,22],[22,6],[22,22]);
    if (version >= 4) ap.push([6,26],[26,6],[26,26]);
    if (version >= 5) ap.push([6,30],[30,6],[30,30]);
    ap.forEach(([ar, ac]) => {
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const dark = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
        if (m[ar+dr]?.[ac+dc] === null) set(ar+dr, ac+dc, dark);
      }
    });
  }

  // Data placement
  const dataStream = [];
  for (const cw of codewords) for (let b = 7; b >= 0; b--) dataStream.push((cw >> b) & 1);

  let di = 0;
  for (let col = size-1; col >= 1; col -= 2) {
    if (col === 6) col--;
    const upward = Math.floor((size-1-col)/2) % 2 === 0;
    for (let i = 0; i < size; i++) {
      const r = upward ? (size-1-i) : i;
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (!fn[r][c] && di < dataStream.length) {
          m[r][c] = dataStream[di++] === 1;
        }
      }
    }
  }

  // Apply mask pattern 0 (i+j) % 2 === 0 — only to data modules, never function modules
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (!fn[r][c] && m[r][c] !== null) {
      if ((r + c) % 2 === 0) m[r][c] = !m[r][c];
    }
  }
  // Re-set finder/timing as function modules (mask doesn't apply there — already correct above)

  // Format info — mask 0, ECL M (binary: 101)
  const formatBits = 0b101000000000000; // ECL M + mask 0 raw, pre-masked with 101010000010010
  const FORMAT_MASK = 0b101010000010010;
  const fmt = formatBits ^ FORMAT_MASK;
  const fmtBits = [];
  for (let i = 14; i >= 0; i--) fmtBits.push((fmt >> i) & 1);
  // Place format info
  const fmtPos = [8,8,8,8,8,8,8,8,7,5,4,3,2,1,0];
  const fmtRow = [0,1,2,3,4,5,7,8,8,8,8,8,8,8,8];
  for (let i = 0; i < 15; i++) {
    set(fmtRow[i], fmtPos[i], fmtBits[i] === 1);
    set(fmtPos[i], fmtRow[i], fmtBits[i] === 1);
  }

  return { matrix: m, size };
}
