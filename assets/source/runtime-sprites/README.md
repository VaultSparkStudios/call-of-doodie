# Runtime Character Sprites

These proprietary transparent source images were generated with OpenAI's built-in image-generation workflow for VaultSpark Studios LLC, then chroma-keyed locally. `npm run assets:generate` trims and downsizes them into browser-ready PNGs under `public/visual-assets/`.

- `cod-doodie-operative-v2-source.png`: top-down three-quarter tactical operative with plunger launcher; magenta chroma source removed before this file was saved.
- `cod-karen-nemesis-v2-source.png`: top-down three-quarter Karen Nemesis boss with clipboard shield; green chroma source removed before this file was saved.

Runtime exports are visual layers over the deterministic procedural renderer. Collision, telegraphs, hit flashes, and fallback rendering remain code-driven.
