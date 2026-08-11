-- Session 148: un-quarantine a legitimate top score that was hidden by the
-- automated "trust court" heuristic (level-velocity), and record the reversal
-- for audit history. See audits/leaderboard-trust.ndjson for the original
-- quarantine receipt and scripts/lib/leaderboard-trust.mjs for the heuristic
-- (loosened separately in the same session: level > wave*3+5 -> wave*4+10).
--
-- Manual founder review confirmed row f51c1d66-bfe6-4847-bea8-3bbbd75cc8c4
-- (callsign "7272uwhe", score 1063334) was a genuine run, not a cheat: the
-- level-velocity heuristic false-positives on efficient/meta-progressed
-- players whose account level isn't tightly coupled to in-run wave count.

UPDATE leaderboard
SET quarantined = false,
    quarantine_reason = coalesce(quarantine_reason, '') ||
      ' | reviewed-and-cleared 2026-08-10: level-velocity heuristic false positive'
WHERE id = 'f51c1d66-bfe6-4847-bea8-3bbbd75cc8c4'
  AND quarantined = true;
