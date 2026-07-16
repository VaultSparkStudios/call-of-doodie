import { useState, useCallback, useEffect, useRef } from "react";
import { buildInputCalibrationRecord, saveInputCalibration } from "../utils/inputCalibration.js";

const TARGETS = [
  { id: "north", label: "N", x: 50, y: 18, bucket: "north", delay: "0s" },
  { id: "east",  label: "E", x: 82, y: 50, bucket: "east",  delay: "0.55s" },
  { id: "south", label: "S", x: 50, y: 82, bucket: "south", delay: "1.1s" },
  { id: "west",  label: "W", x: 18, y: 50, bucket: "west",  delay: "1.65s" },
];

export default function CalibrationScreen({ onComplete, onSkip, isMobile = false }) {
  const [hit, setHit]         = useState(new Set());
  const [lastHit, setLastHit] = useState(null);
  const sourceRef             = useRef("mouse");
  const scheduledRef          = useRef(false); // guards against double-scheduling

  const markTarget = useCallback((targetId, isTouch) => {
    if (isTouch) sourceRef.current = "touch";
    setHit(prev => {
      if (prev.has(targetId)) return prev;
      const next = new Set(prev);
      next.add(targetId);
      setLastHit(targetId);
      setTimeout(() => setLastHit(null), 500);
      return next;
    });
  }, []);

  const hitCount = hit.size;
  const done     = hitCount >= 4;

  // Schedule completion after all 4 targets are hit.
  // Use a ref guard so the effect body only runs once regardless of dep changes.
  useEffect(() => {
    if (!done || scheduledRef.current) return;
    scheduledRef.current = true;
    const buckets = TARGETS.filter(t => hit.has(t.id)).map(t => t.bucket);
    saveInputCalibration(
      buildInputCalibrationRecord({ source: sourceRef.current, buckets, timestamp: Date.now() })
    );
    const t = setTimeout(onComplete, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]); // only re-evaluate when done flips; hit/onComplete are stable once done=true

  const handleSkip = useCallback(() => {
    const buckets = TARGETS.filter(t => hit.has(t.id)).map(t => t.bucket);
    saveInputCalibration(
      buildInputCalibrationRecord({ source: sourceRef.current, buckets, timestamp: Date.now() })
    );
    onSkip();
  }, [hit, onSkip]);

  const remaining = 4 - hitCount;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "#060a06",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "'Courier New', monospace",
        userSelect: "none", WebkitUserSelect: "none",
        touchAction: "none",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ position: "absolute", top: "max(20px, env(safe-area-inset-top))", left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
        <div style={{ fontSize: "clamp(11px,2.5vw,14px)", letterSpacing: 3, color: "#00E5FF", fontWeight: 900 }}>
          AIM CHECK
        </div>
        <div data-testid="calibration-instruction" style={{ fontSize: "clamp(9px,2vw,11px)", color: "#7AF", marginTop: 4, letterSpacing: 1 }}>
          {done
            ? "✓ ALL TARGETS HIT — CALIBRATION COMPLETE"
            : remaining === 4
              ? isMobile ? "TAP EACH GLOWING TARGET" : "CLICK EACH GLOWING TARGET"
              : remaining === 1
                ? "ONE TARGET LEFT"
                : `${remaining} TARGETS LEFT`}
        </div>
      </div>

      {/* Arena */}
      <div
        data-testid="calibration-arena"
        style={{
          position: "relative",
          width: "min(85vw, 85vh, 460px)",
          height: "min(85vw, 85vh, 460px)",
          borderRadius: "50%",
          border: "1px solid rgba(0,229,255,0.08)",
          background: "radial-gradient(ellipse at 50% 50%, rgba(0,229,255,0.03) 0%, transparent 70%)",
        }}
      >
        {/* Center crosshair */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
          opacity: done ? 1 : 0.7,
          filter: done ? "drop-shadow(0 0 8px #FFD700)" : "none",
          transition: "filter 0.4s, opacity 0.4s",
          pointerEvents: "none",
        }}>
          🎯
        </div>

        {/* Targets */}
        {TARGETS.map(t => {
          const isHit   = hit.has(t.id);
          const isPulse = lastHit === t.id;
          return (
            <div
              key={t.id}
              data-testid={`target-${t.id}`}
              data-hit={String(isHit)}
              onClick={!isHit ? () => markTarget(t.id, false) : undefined}
              onTouchEnd={!isHit ? (e) => { e.preventDefault(); markTarget(t.id, true); } : undefined}
              style={{
                position: "absolute",
                left: `${t.x}%`, top: `${t.y}%`,
                transform: `translate(-50%, -50%) scale(${isPulse ? 1.25 : isHit ? 0.95 : 1})`,
                width: 96, height: 96,
                borderRadius: "50%",
                border: isHit ? "2px solid rgba(0,255,100,0.6)" : "2px solid rgba(0,229,255,0.7)",
                background: isHit ? "rgba(0,255,100,0.12)" : "rgba(0,229,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column",
                cursor: isHit ? "default" : "crosshair",
                transition: "border-color 0.25s, background 0.25s, transform 0.15s",
                boxShadow: isHit ? "0 0 18px rgba(0,255,100,0.35)" : "0 0 14px rgba(0,229,255,0.22)",
                // Use full animation shorthand (including delay) to avoid mixing shorthand + animationDelay
                animation: !isHit ? `calPulse 2.2s ease-in-out ${t.delay} infinite` : "none",
              }}
            >
              <div style={{
                fontSize: "clamp(16px,4vw,22px)",
                fontWeight: 900,
                color: isHit ? "#00FF64" : "#00E5FF",
                letterSpacing: 1,
                lineHeight: 1,
                pointerEvents: "none",
              }}>
                {isHit ? "✓" : t.label}
              </div>
              <div style={{
                fontSize: "clamp(7px,1.5vw,9px)",
                color: isHit ? "rgba(0,255,100,0.7)" : "rgba(0,229,255,0.5)",
                letterSpacing: 2,
                marginTop: 2,
                pointerEvents: "none",
              }}>
                {isHit ? "HIT" : isMobile ? "TAP" : "CLICK"}
              </div>
            </div>
          );
        })}

        {/* Progress ring */}
        <svg
          viewBox="0 0 100 100"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none",
            opacity: 0.3,
          }}
        >
          <circle
            cx="50" cy="50" r="49"
            fill="none"
            stroke={done ? "#00FF64" : "#00E5FF"}
            strokeWidth="0.5"
            strokeDasharray={`${(hitCount / 4) * 307} 307`}
            strokeDashoffset="77"
            style={{ transition: "stroke-dasharray 0.4s, stroke 0.4s" }}
          />
        </svg>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: "max(20px, env(safe-area-inset-bottom))",
        left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 16,
      }}>
        <div style={{ fontSize: "clamp(8px,1.8vw,10px)", color: "#444", letterSpacing: 2, textAlign: "center" }}>
          {done ? "" : isMobile ? "JOYSTICK LEFT · AIM RIGHT" : "WASD · MOUSE AIM"}
        </div>
        {!done && (
          <button
            data-testid="skip-button"
            onClick={handleSkip}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.12)",
              color: "#555", fontSize: "clamp(9px,2vw,11px)",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'Courier New', monospace", letterSpacing: 2,
            }}
          >
            SKIP
          </button>
        )}
      </div>

      <style>{`
        @keyframes calPulse {
          0%, 100% { box-shadow: 0 0 14px rgba(0,229,255,0.22); }
          50%       { box-shadow: 0 0 28px rgba(0,229,255,0.50); }
        }
      `}</style>
    </div>
  );
}
