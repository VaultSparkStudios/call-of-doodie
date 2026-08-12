import { useEffect, useState } from "react";

export default function MobileDeployConfig({
  modes,
  modeId,
  onSelectMode,
  difficulties,
  difficulty,
  onSelectDifficulty,
  palette,
}) {
  // A mode change fans out through App. A tiny urgent local acknowledgement
  // paints the selected button immediately while that larger update remains
  // inside HomeV2's startTransition boundary.
  const [acknowledgedModeId, setAcknowledgedModeId] = useState(modeId);
  const [acknowledgedDifficulty, setAcknowledgedDifficulty] = useState(difficulty);
  useEffect(() => setAcknowledgedModeId(modeId), [modeId]);
  useEffect(() => setAcknowledgedDifficulty(difficulty), [difficulty]);
  const selectedMode = modes.find((mode) => mode.id === acknowledgedModeId);
  const selectedDifficulty = difficulties[acknowledgedDifficulty];
  const groupStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 };
  const isLight = palette?.colorScheme === "light";
  const optionStyle = (selected, color) => ({
    minHeight: 44,
    padding: "7px 8px",
    borderRadius: 7,
    border: `1px solid ${selected ? (isLight ? palette.accent : color) : (palette?.line || "rgba(255,255,255,0.14)")}`,
    background: selected ? (isLight ? "rgba(184,60,0,0.10)" : `${color}1F`) : (palette?.panel || "rgba(0,0,0,0.24)"),
    color: selected ? (isLight ? palette.ink : color) : (palette?.ink || "#DDD"),
    font: "inherit",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
    outlineOffset: 2,
  });
  const moveRadio = (event, values, index, onSelect) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
    let nextIndex = index;
    if (delta) nextIndex = (index + delta + values.length) % values.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = values.length - 1;
    else return;
    event.preventDefault();
    onSelect(values[nextIndex]);
    event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[nextIndex]?.focus();
  };
  const commitAfterAcknowledgementPaint = (commit) => {
    if (typeof requestAnimationFrame !== "function") {
      commit();
      return;
    }
    // A timer posted from the next animation frame cannot begin the expensive
    // App-wide mode fan-out until the browser has presented the local radio
    // acknowledgement. Forty-eight milliseconds preserves human-immediate
    // semantics while keeping that work out of the originating interaction.
    requestAnimationFrame(() => setTimeout(commit, 48));
  };
  const chooseMode = (value) => {
    setAcknowledgedModeId(value);
    commitAfterAcknowledgementPaint(() => onSelectMode(value));
  };
  const chooseDifficulty = (value) => {
    setAcknowledgedDifficulty(value);
    commitAfterAcknowledgementPaint(() => onSelectDifficulty(value));
  };

  return (
    <div data-testid="mobile-deploy-config" style={{ display: "grid", gap: 12, minWidth: "min(310px, calc(100vw - 58px))" }}>
      <strong style={{ color: isLight ? palette.accent : "#FFB36B", fontSize: 15, letterSpacing: 1.2 }}>QUICK DEPLOY CONFIG</strong>
      <div>
        <div id="mobile-mode-label" style={{ color: palette?.muted || "#AAA", fontSize: 13, letterSpacing: 0.8, marginBottom: 7 }}>MODE</div>
        <div role="radiogroup" aria-labelledby="mobile-mode-label" style={groupStyle}>
          {modes.map((mode, index) => {
            const selected = mode.id === acknowledgedModeId;
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                aria-label={`${mode.label} mode`}
                data-mode-id={mode.id}
                onClick={() => chooseMode(mode.id)}
                onKeyDown={(event) => moveRadio(event, modes.map((item) => item.id), index, chooseMode)}
                style={optionStyle(selected, mode.color)}
              >
                {mode.emoji} {mode.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div id="mobile-difficulty-label" style={{ color: palette?.muted || "#AAA", fontSize: 13, letterSpacing: 0.8, marginBottom: 7 }}>DIFFICULTY</div>
        <div role="radiogroup" aria-labelledby="mobile-difficulty-label" style={groupStyle}>
          {Object.entries(difficulties).map(([key, item], index, entries) => {
            const selected = key === acknowledgedDifficulty;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                aria-label={`${item.label} difficulty`}
                data-difficulty-id={key}
                onClick={() => chooseDifficulty(key)}
                onKeyDown={(event) => moveRadio(event, entries.map(([id]) => id), index, chooseDifficulty)}
                style={optionStyle(selected, item.color)}
              >
                {item.emoji} {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div role="status" aria-live="polite" style={{ color: palette?.cyan || "#B9F3FF", fontSize: 14 }}>
        Selected: {selectedMode?.label || acknowledgedModeId} · {selectedDifficulty?.label || acknowledgedDifficulty}
      </div>
    </div>
  );
}
