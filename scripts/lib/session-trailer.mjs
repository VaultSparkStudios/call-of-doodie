// session-trailer.mjs — S387 [audit #2] · closes [SIL][S386 #2].
//
// Binds a commit to the session that made it. The S386 timing check separates "this
// session's commits" from other writers by git author identity, so two sessions under the
// same identity in separate checkouts or worktrees (Codex beside Claude) convicted each
// other. Two terminals in ONE checkout share one lock and stamp the same value. The
// prepare-commit-msg hook (scripts/git-hooks/prepare-commit-msg) writes
//   Studio-Session: S<n>
//   Studio-Session-Start: <session_start>
// from context/.session-lock; the start instant tells apart two sessions that were handed
// the same number.
//
// S388 — ONE GRAMMAR PER KEY. S387 wrote a single `Studio-Session: S<n> @ <start>`, but
// the key already had a producer and consumers: the /start drain commit (S371,
// lib/propagation-drain-commit.mjs) writes `Studio-Session: <n>` and Vorn's
// external-write-audit reads it as /^S?(\d+)$/. Shipped to a sibling, the S387 value would
// have made every hook-stamped commit unattributed there. The session keeps the shared
// grammar; the start instant rides in its own trailer. Internally (lock, comparisons) the
// combined "S<n> @ <start>" string stays the canonical value, and the S387 combined
// trailer is still read, so existing history keeps its binding. CI routines have no lock, so their commits carry no trailer and fall
// back to the identity rule. The trailer is unsigned and self-declared, like the author.
import { sessionIdFromLock } from './session-identity.mjs';

export const SESSION_TRAILER_KEY = 'Studio-Session';
export const SESSION_START_TRAILER_KEY = 'Studio-Session-Start';
const VALUE_RE = /^S([0-9]+) @ ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z)$/;
// The fleet grammar of Studio-Session (drain commits, Vorn's audit): a bare or S-prefixed number.
const NUMBER_RE = /^S?([0-9]+)$/i;
const START_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/;

/** The trailer value for the session a lock describes; null when the lock cannot say. */
export function sessionTrailerValue(lockText) {
  const id = sessionIdFromLock(lockText);
  const start = String(lockText || '').match(/^session_start:\s*(\S+)\s*$/m)?.[1] ?? null;
  if (!Number.isInteger(id) || !start || Number.isNaN(Date.parse(start))) return null;
  const value = `S${id} @ ${start}`;
  return VALUE_RE.test(value) ? value : null;
}

/**
 * The two trailers the hook writes for the session a lock describes:
 * { session: 'S<n>', start: '<iso>' }, or null when the lock cannot say.
 */
export function sessionTrailerFields(lockText) {
  const m = sessionTrailerValue(lockText)?.match(VALUE_RE);
  return m ? { session: `S${m[1]}`, start: m[2] } : null;
}

/** A well-formed trailer value, normalised; null for anything else. */
export function parseSessionTrailerValue(raw) {
  const v = String(raw ?? '').trim();
  return VALUE_RE.test(v) ? v : null;
}

/**
 * The session start instant a trailer value names. Review S387 #1: the start instant is
 * the session's identity, not the number — write-session-lock keeps session_start (and
 * start_head) on a repeated /start, while `--session <n>` can correct the number. A
 * whole-string compare read a corrected session's earlier commits as another writer's.
 */
export function sessionStartOf(value) {
  return parseSessionTrailerValue(value)?.match(VALUE_RE)?.[2] ?? null;
}

/**
 * The session a commit claims, as the canonical "S<n> @ <start>", from its Studio-Session
 * values and its Studio-Session-Start values (git log %(trailers:key=…,valueonly)).
 * Accepted: the split pair (S388), the S387 combined value, or both when they agree. A
 * number with no start (a drain commit) is unbound — the number alone cannot tell two
 * sessions apart. Anything unreadable or contradictory reads as unbound (null), never
 * as either claim.
 */
export function commitSessionFromTrailers(values = [], startValues = []) {
  const vals = (values || []).map((v) => String(v ?? '').trim()).filter(Boolean);
  const starts = [...new Set((startValues || []).map((v) => String(v ?? '').trim()).filter(Boolean))];
  if (!vals.length) return null;
  if (starts.some((v) => !START_RE.test(v) || Number.isNaN(Date.parse(v)))) return null;
  const claims = new Set();
  const numbers = new Set();
  for (const v of vals) {
    if (VALUE_RE.test(v)) claims.add(v);
    else if (NUMBER_RE.test(v)) numbers.add(Number(v.match(NUMBER_RE)[1]));
    else return null;
  }
  if (numbers.size) {
    if (numbers.size !== 1 || starts.length !== 1) return null;
    claims.add(`S${[...numbers][0]} @ ${starts[0]}`);
  } else if (starts.length && ![...claims].every((c) => starts.includes(c.match(VALUE_RE)[2]))) {
    return null;
  }
  return claims.size === 1 ? [...claims][0] : null;
}
