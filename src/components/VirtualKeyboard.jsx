import { useState, useEffect, useRef } from "react";

const ROWS = [
  ["1","2","3","4","5","6","7","8","9","0","-","_"],
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L","!"],
  ["Z","X","C","V","B","N","M","."],
  ["SPACE","⌫","✓"],
];

const NUM_ROWS = [
  ["1","2","3"],
  ["4","5","6"],
  ["7","8","9"],
  ["0","⌫","✓"],
];

export default function VirtualKeyboard({
  value,
  onChange,
  onConfirm,
  maxLength   = 20,
  title       = "ENTER TEXT",
  numericOnly = false,
}) {
  const rows = numericOnly ? NUM_ROWS : ROWS;

  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);

  // Refs so the polling useEffect never goes stale
  const posRef = useRef({ row: 0, col: 0 });
  const cbRef  = useRef({ value, onChange, onConfirm, maxLength });
  cbRef.current = { value, onChange, onConfirm, maxLength };

  useEffect(() => { posRef.current = { row, col }; }, [row, col]);

  const clampCol = (r, c) => Math.min(c, rows[r].length - 1);

  // ── Gamepad polling ──────────────────────────────────────────────────────
  useEffect(() => {
    const DEAD          = 0.45;
    const INITIAL_DELAY = 290;
    const REPEAT_RATE   = 105;
    let activeDir = null;
    let repeatTimeout = null;
    let lastA = false, lastB = false, lastY = false, lastStart = false;

    const doMove = (dir) => {
      const { row: r, col: c } = posRef.current;
      let nr = r, nc = c;
      if (dir === "up")    nr = Math.max(0, r - 1);
      if (dir === "down")  nr = Math.min(rows.length - 1, r + 1);
      if (dir === "left")  nc = Math.max(0, c - 1);
      if (dir === "right") nc = c + 1;
      nc = Math.min(nc, rows[nr].length - 1);
      if (nr !== r || nc !== c) {
        posRef.current = { row: nr, col: nc };
        setRow(nr); setCol(nc);
      }
    };

    const startDir = (dir) => {
      if (activeDir === dir) return;
      clearTimeout(repeatTimeout);
      activeDir = dir;
      doMove(dir);
      const tick = () => {
        if (activeDir !== dir) return;
        doMove(dir);
        repeatTimeout = setTimeout(tick, REPEAT_RATE);
      };
      repeatTimeout = setTimeout(tick, INITIAL_DELAY);
    };
    const stopDir = () => { clearTimeout(repeatTimeout); activeDir = null; };

    const pressKey = () => {
      const { row: r, col: c } = posRef.current;
      const key = rows[r]?.[clampCol(r, c)];
      if (!key) return;
      const { value: v, onChange: oc, onConfirm: ocf, maxLength: ml } = cbRef.current;
      if      (key === "SPACE")             { if (v.length < ml) oc(v + " "); }
      else if (key === "⌫")                 { oc(v.slice(0, -1)); }
      else if (key === "✓")                 { ocf?.(); }
      else if (v.length < ml)               { oc(v + key); }
    };

    const id = setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      if (!gp) return;

      const dUp    = gp.buttons[12]?.pressed;
      const dDown  = gp.buttons[13]?.pressed;
      const dLeft  = gp.buttons[14]?.pressed;
      const dRight = gp.buttons[15]?.pressed;
      const lx = gp.axes[0] ?? 0, ly = gp.axes[1] ?? 0;

      const up    = dUp    || ly < -DEAD;
      const down  = dDown  || ly >  DEAD;
      const left  = dLeft  || lx < -DEAD;
      const right = dRight || lx >  DEAD;

      if      (up)    startDir("up");
      else if (down)  startDir("down");
      else if (left)  startDir("left");
      else if (right) startDir("right");
      else            stopDir();

      const aNow     = gp.buttons[0]?.pressed;
      const bNow     = gp.buttons[1]?.pressed;
      const yNow     = gp.buttons[3]?.pressed;
      const startNow = gp.buttons[9]?.pressed;

      if (aNow && !lastA) pressKey();
      if (bNow && !lastB) { const { value: v, onChange: oc } = cbRef.current; oc(v.slice(0, -1)); }
      if ((yNow && !lastY) || (startNow && !lastStart)) cbRef.current.onConfirm?.();

      lastA = !!aNow; lastB = !!bNow; lastY = !!yNow; lastStart = !!startNow;
    }, 50);

    return () => { clearInterval(id); clearTimeout(repeatTimeout); };
  }, [rows.length, numericOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mouse handler ────────────────────────────────────────────────────────
  const handleKey = (key) => {
    if      (key === "SPACE")             { if (value.length < maxLength) onChange(value + " "); }
    else if (key === "⌫")                 { onChange(value.slice(0, -1)); }
    else if (key === "✓")                 { onConfirm?.(); }
    else if (value.length < maxLength)    { onChange(value + key); }
  };

  const _focused = rows[row]?.[clampCol(row, col)];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(5,5,10,0.96)", backdropFilter: "blur(10px)",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 16,
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{ width: "100%", maxWidth: numericOnly ? 250 : 560 }}>

        {/* Title */}
        <div style={{ fontSize: 10, color: "#FF6B35", letterSpacing: 4, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>
          ▸ {title}
        </div>

        {/* Current value display */}
        <div style={{
          background: "rgba(255,255,255,0.05)", border: "2px solid #FF6B35",
          borderRadius: 8, padding: "11px 16px", fontSize: 20, color: "#FFD700",
          textAlign: "center", letterSpacing: 2, marginBottom: 14, minHeight: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          wordBreak: "break-all",
        }}>
          {value || <span style={{ color: "#333" }}>—</span>}
          <span style={{ color: "#FF6B35", marginLeft: 1, animation: "gpKbBlink 1s step-end infinite" }}>█</span>
        </div>

        {/* Key rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: numericOnly ? 6 : 3, marginBottom: 14 }}>
          {rows.map((rowKeys, ri) => (
            <div key={ri} style={{ display: "flex", gap: numericOnly ? 6 : 3, justifyContent: "center" }}>
              {rowKeys.map((key, ci) => {
                const isFocused = ri === row && ci === clampCol(row, col) && ri === row;
                const isConfirm = key === "✓";
                const isBack    = key === "⌫";
                const isSpace   = key === "SPACE";
                return (
                  <button
                    key={key + ci}
                    onClick={() => handleKey(key)}
                    style={{
                      minWidth: isSpace ? 110 : (isBack || isConfirm) ? (numericOnly ? 58 : 52) : numericOnly ? 58 : 32,
                      height: numericOnly ? 52 : 36,
                      borderRadius: 6,
                      fontSize: (isSpace || isBack || isConfirm) ? 10 : numericOnly ? 17 : 12,
                      fontWeight: 900,
                      fontFamily: "'Courier New', monospace",
                      cursor: "pointer",
                      border: "none",
                      background: isFocused
                        ? (isConfirm ? "rgba(0,255,136,0.35)"  : isBack ? "rgba(255,60,60,0.35)"  : "rgba(255,107,53,0.38)")
                        : (isConfirm ? "rgba(0,255,136,0.09)"  : isBack ? "rgba(255,60,60,0.09)"  : "rgba(255,255,255,0.06)"),
                      color: isFocused
                        ? (isConfirm ? "#00FF88" : isBack ? "#FF5555" : "#FFD700")
                        : (isConfirm ? "#00CC66" : isBack ? "#FF7777" : "#CCC"),
                      outline: isFocused
                        ? `2px solid ${isConfirm ? "#00FF88" : isBack ? "#FF4444" : "#FF6B35"}`
                        : "none",
                      outlineOffset: 2,
                      boxShadow: isFocused
                        ? `0 0 12px ${isConfirm ? "rgba(0,255,136,0.3)" : "rgba(255,107,53,0.38)"}`
                        : "none",
                      transition: "all 0.07s",
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hints */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 10, color: "#444", flexWrap: "wrap" }}>
          <span><span style={{ color: "#4CAF50" }}>A</span> Type</span>
          <span><span style={{ color: "#F44336" }}>B</span> Delete</span>
          <span><span style={{ color: "#FFD700" }}>Y / Start</span> Confirm</span>
          <span style={{ color: "#333" }}>or click keys with mouse</span>
        </div>
      </div>

      <style>{`@keyframes gpKbBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
