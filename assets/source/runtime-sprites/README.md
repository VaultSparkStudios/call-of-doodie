# Runtime Enemy Atlas Sources

License: Proprietary — All Rights Reserved, VaultSpark Studios LLC

These three source atlases were generated for Call of Doodie on 2026-07-25 with the built-in OpenAI image generation tool, then processed locally with the Codex image-generation skill's chroma-key removal helper. The green source files remain here as provenance/editing inputs; transparent runtime outputs live in `public/visual-assets/`.

## Shared prompt direction

- Production-ready sprite atlas for the proprietary comedy action game Call of Doodie.
- Consistent top-down three-quarter camera for a twin-stick arena shooter.
- Polished 2.5D cartoon art, chunky readable silhouettes, dark navy outlines, crisp cel shading, tactile materials, and legibility at 64–80 pixels.
- One character centered in each equal cell, uniform scale and orientation, generous separation, no text or watermark.
- Perfectly flat `#00FF00` background for local chroma removal.

## Atlas prompts

- `enemy-atlas-core-source.png`: 4×2 grid — Mall Cop, Karen, Florida Man, Homeowners Association President, IT Guy, Gym Bro, Influencer, Conspiracy Bro.
- `enemy-atlas-specialists-source.png`: 4×2 grid — Landlord, Crypto Bro, Shield Guy, YOLO Bomber, Sergeant Karen, Life Coach, Tech Chief Executive, Splitter.
- `enemy-atlas-bosses-source.png`: 3×2 grid — Mega Karen, Juggernaut, Summoner, Doomscroller, The Algorithm, The Developer; boss-scale silhouettes and stronger material detail.

The exact expanded prompts are retained in the implementation session record. Runtime mapping and cell coordinates are defined in `src/utils/visualAssetLibrary.js`. Procedural canvas bodies remain underneath every sprite as an instant-loading and failure fallback.
