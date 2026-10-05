# Gameplay findings — 2026-10-04

The playthrough audit found and repaired three additional game defects: a reload could finish during pause, a newly selected starting kit could use the previous kit, and the terminal screen could show stale score/wave values and fail to find its saved victory export.

Setup sharing now preserves all twelve supported modes and four difficulties. Zombies and Bot Royale honor their advertised enemy factors. Settings expose names, values and selected states to keyboard users and browser agents. Mobile run-code controls match desktop, duplicate combat ammo/weapon information is removed, and completed local modes show their unranked status clearly.

Operations and Zombies retain their distinct rebuilt loops. Their music now has objective-specific phrases. Creature Practice uses the actual five creature renderers and attack simulation in an optional ten-second room. Pump-paced creature introductions are an explicit local experiment; depth pacing remains the default. These changes add no mandatory upgrade interruptions to Classic.

## S183 verified production follow-through

Source e6b72c770cd83a70847f74b390e28aa9f50b4622 passed exact-main workflow 37245074608: 291/291 files, 1,931/1,931 tests, strict lint, build and Cloudflare deployment. Canonical callofdoodie.wtf reports e6b72c770cd8; canonical and immutable https://ea7fba17.call-of-doodie.pages.dev/ pass shell 7/7 each, domain routing 5/5 and replay trust 3/3. Actual canonical browser checks pass 24/24 mode advancement/pause/resume cases, 8/8 death/victory ending cases with expanded sections, short-screen scrolling, menu return and hashed downloads, 4/4 setup/settings cases and 20/20 creature practice cases. Actual Classic/Zombies/Operations audio output, pause/mute/resume, single context and movement pass.

Twelve technical audit outcomes are verified and shipped. Eight comparative acceptance outcomes remain pending: participant pump pacing, objective-music listening, creature comprehension/humor, matched human/agent comparison, human interpretation of outcomes, isolated target-device timing, evidence-cache token usage and evidence-pack token usage. No human rating, natural all-mode completion, physical-device result, speedup or model-token saving is claimed.

## Verified coverage

- Sixty fixed-seed browser observations cover twelve modes × four desktop difficulties, plus each mode at mobile Normal. Twenty-four follow-ups verify advancement, pause and resume across all twelve modes on desktop/mobile after the reload fix. These are bounded observations, not natural completions of every mode.
- Actual audio output, single-context reuse, pause/mute/resume and keyboard movement pass Classic, Operations and Zombies. Twelve weapon hotkeys were exercised in Classic.
- Four theme/viewport setup cases preserve Zombies/Insane/seed 42 through actual clipboard export. All fourteen settings sliders were named and operated with the keyboard; seven help panels were inspected.
- Twenty creature trials pass on staging across five variants, two themes and two widths. Exported practice results identify browser-agent operation and leave humor ratings unanswered.
- Eight death/victory ending cases cover both themes and desktop/mobile, including a 390×360 screen, keyboard End, touch scrolling and return to menu. Submission/share sections are expanded. Final staging repeats also verify saved run-pack downloads.
- The full local suite initially passed 1,929 of 1,930 assertions. Its sole stale wiring assertion was updated for the new difficulty argument and passed in isolation. New kit, terminal-state, reload and export regressions pass. Exact-main CI is recorded separately as the release authority.
- Strict lint, configured build, public contracts, security policy and supply-chain checks pass. The generic responsive tool skipped because it expected another Playwright package; the installed project browser harness performed the actual touched-screen checks.

## Findings and next improvements

1. **Human and agent comparison:** use matched deployed source, seed, mode, difficulty, kit, mutation, pacing, viewport and input budget. Compare objective understanding, natural outcomes, first damage and control errors. Separate ordinary play from manipulated integration fixtures. Actual human results remain unmeasured.
2. **Music and creatures:** use counterbalanced listening and time/pump pacing trials. Collect real creature recognition, damage-window answers and optional humor ratings before changing default pacing or claiming improved enjoyment.
3. **Performance:** six shared-host development samples measured about 16.7 ms median frames and several long tasks. Profile simulation, rendering, audio and interface costs separately on target devices under an isolated production profile before optimizing hot paths. No speedup is claimed.
4. **Agent efficiency:** the declared setup/trust/export question subset uses one evidence-pack read instead of two resource reads, reducing decoded bytes from 65,369 to 37,415. Cache keys reject changed source/deployment/setup/theme/input/viewport/state and live, failed or incomplete evidence. Model-token savings remain unmeasured.

Run exports contain bounded build/setup/objective provenance and a content hash. They are local advisory evidence, not authenticated score attestations. No online score submission, external sharing or participant rating was fabricated during this audit.
