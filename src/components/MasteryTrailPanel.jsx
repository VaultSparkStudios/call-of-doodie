import { useState } from "react";
import { ACHIEVEMENTS } from "../constants.js";
import { clearMasteryTrail, createMasteryTrail, MASTERY_FOCI, MASTERY_MILESTONES, saveMasteryTrail } from "../utils/masteryTrail.js";
import "./mastery-trail.css";

export default function MasteryTrailPanel({ trail, progress, lastRun, doctrines, career, onChange, onOpenBuild, onPlay }) {
  const [focusId, setFocusId] = useState("survival");
  const [milestoneId, setMilestoneId] = useState("doctrine");
  const [notice, setNotice] = useState("");
  const select = () => {
    const next = createMasteryTrail({ focusId, milestoneId, lastRun, doctrines, career });
    if (!next) { setNotice("Finish one run before choosing a measurable trail."); return; }
    if (!saveMasteryTrail(next)) { setNotice("This browser could not save your trail. Check site storage and retry."); return; }
    onChange(next);
    setNotice("Trail chosen. Your baseline is saved on this device.");
  };
  const update = (patch) => {
    const next = { ...trail, ...patch };
    if (!saveMasteryTrail(next)) { setNotice("This browser could not save that choice."); return; }
    onChange(next);
  };
  const replace = () => {
    if (!clearMasteryTrail()) { setNotice("This browser could not clear the trail."); return; }
    onChange(null);
    setNotice("Trail cleared. Choose another whenever you like; earned progress remains yours.");
  };
  const earnedName = progress?.earnedId && (trail?.milestoneId === "achievement"
    ? ACHIEVEMENTS.find((entry) => entry.id === progress.earnedId)?.name || progress.earnedId
    : progress.earnedId.replaceAll("_", " "));
  return <section className="mastery-trail" aria-label="Mastery Trail" data-testid="mastery-trail">
    <div className="mastery-trail__head"><div><span className="mastery-trail__eyebrow">PLAYER-CHOSEN · NO STREAK PENALTY</span><h2>Mastery Trail</h2></div>{progress?.completed && <strong className="mastery-trail__stamp" aria-label="Mastery trail completed">MASTERED!</strong>}</div>
    {!trail ? <>
      <p>Pick one weakness to practice and one expressive milestone. The trail reads runs and unlocks already saved in this browser. It gives no extra power and can be replaced at any time.</p>
      {lastRun ? <p className="mastery-trail__baseline">Last observed run: wave {Number(lastRun.wave || 1)} · {Number(lastRun.totalShots || 0)} shots · {Number(lastRun.bossKills || 0)} boss defeats.</p> : <p className="mastery-trail__baseline">No run is saved yet. Play once to establish a real baseline.</p>}
      <fieldset><legend>Choose a practice focus</legend><div className="mastery-trail__choices">{MASTERY_FOCI.map((focus) => <button key={focus.id} type="button" aria-pressed={focusId === focus.id} onClick={() => setFocusId(focus.id)}><span>{focus.icon} {focus.label}</span><small>{focus.description}</small></button>)}</div></fieldset>
      <fieldset><legend>Choose a build milestone</legend><div className="mastery-trail__choices">{MASTERY_MILESTONES.map((milestone) => <button key={milestone.id} type="button" aria-pressed={milestoneId === milestone.id} onClick={() => setMilestoneId(milestone.id)}><span>{milestone.label}</span><small>{milestone.description}</small></button>)}</div></fieldset>
      <button className="mastery-trail__action" type="button" onClick={select} disabled={!lastRun}>Choose this trail</button>
    </> : <>
      <p><strong>{progress.focus.icon} {progress.focus.label}</strong> · {progress.milestone.label}. This is a personal practice plan, not a leaderboard or reward track.</p>
      <ol className="mastery-trail__steps">
        <li data-done="true"><span>01 · OBSERVE</span><strong>Baseline: wave {trail.baseline.wave}{trail.baseline.deathName ? ` · observed threat ${trail.baseline.deathName}` : ""}</strong><small>Saved run at the time you chose this trail.</small></li>
        <li data-done={Boolean(progress.practiceRun)}><span>02 · PRACTICE</span><strong>{progress.practiceLabel}</strong><small>{progress.practiceRun ? `Observed in a later saved run: ${progress.comparison.before} → ${progress.comparison.after} ${progress.comparison.unit}.` : "Not yet observed in a later saved run."}</small></li>
        <li data-done={Boolean(progress.earnedId)}><span>03 · EXPRESS</span><strong>{progress.milestone.label}</strong><small>{progress.earnedId ? `Earned: ${earnedName}.` : "A new unlock after this trail was chosen will complete this step."}</small></li>
      </ol>
      {progress.completed && <p className="mastery-trail__earned">A new run met your practice rule and a new unlock met your build rule. This is an observed comparison, not proof that the trail caused the change.</p>}
      <div className="mastery-trail__actions"><button type="button" onClick={onPlay}>Return to play</button><button type="button" onClick={onOpenBuild}>Open Build</button><button type="button" aria-pressed={Boolean(trail.weeklyFocus)} onClick={() => update({ weeklyFocus: !trail.weeklyFocus })}>{trail.weeklyFocus ? "This week's focus ✓" : "Mark as this week's focus"}</button><button type="button" onClick={() => update({ hidden: !trail.hidden })}>{trail.hidden ? "Show in Overview" : "Hide from Overview"}</button><button type="button" onClick={replace}>Replace trail</button></div>
      <small className="mastery-trail__foot">Weekly focus is a reminder only. Nothing expires, and missing a week removes no earned progress.</small>
    </>}
    {notice && <p role="status" className="mastery-trail__notice">{notice}</p>}
  </section>;
}
