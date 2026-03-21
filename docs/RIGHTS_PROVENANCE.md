# Rights And Provenance

## Ownership summary

- Project owner: VaultSpark Studios
- IP owner: VaultSpark Studios
- License constraints: future third-party assets, fonts, music, or sound packs must be documented before ship

## Source record

### Core game code

- Origin: repository-authored implementation
- Created by: VaultSpark development workflow
- Date: active project history through current repo
- Ownership or license note: treat as first-party project code unless explicitly documented otherwise
- Evidence link: repository source files

### Runtime audio

- Origin: synthesized with Web Audio API at runtime
- Created by: in-repo implementation
- Date: current shipped implementation
- Ownership or license note: no external sound-file dependency in the core current approach
- Evidence link: `src/sounds.js`, `context/DECISIONS.md`

### Brand and world language

- Origin: project-specific parody and comedy framing
- Created by: VaultSpark project direction
- Date: current project phase
- Ownership or license note: protect original naming, UI voice, enemy names, and weapon names as first-party expression; avoid undocumented borrowing
- Evidence link: `README.md`, `context/PROJECT_BRIEF.md`, `docs/BRAND_SYSTEM.md`

## Risk watchlist

- Unclear provenance item: any future third-party audio, art, or font import
- Risk: undocumented external assets can weaken IP posture
- Action: record origin, license, and evidence before merge

- Unclear provenance item: parody boundaries in public branding and store-facing assets
- Risk: overly direct imitation of third-party military branding or presentation
- Action: preserve the project's own comedic identity and log major naming or visual decisions in `CREATIVE_DIRECTION_RECORD.md`
