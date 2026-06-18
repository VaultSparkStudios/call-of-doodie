# Call of Doodie Visual Asset Library

This folder is the proprietary source-art library for Call of Doodie. Keep game-specific source assets here, not in a shared studio repo, unless the asset is intentionally shipped through Studio Ark.

## Rules

- All VaultSpark-original visual assets are proprietary by default: All Rights Reserved, VaultSpark Studios LLC.
- Every runtime visual asset must have an entry in `assets/visual-assets.json`.
- Every generated, Blender-authored, downloaded, or third-party-derived source must record source type, license, source path, runtime path, dimensions, and status.
- Prefer 3D-authored, 2D-delivered sprites for gameplay-critical assets until a full 3D migration is separately proven.
- Runtime exports belong under `public/` or `src/` only after the source/provenance entry exists.
- Use CC0 assets first when importing free external visuals. Mixed-license libraries require per-asset tracking before use.

## Recommended Pipeline

1. Model or generate the asset in Blender or a verified open/free tool.
2. Save editable sources under `assets/source/<asset-id>/`.
3. Export runtime files to `public/assets/` or `src/assets/` with mobile-safe dimensions.
4. Add or update the matching manifest entry.
5. Run `npm run assets:check` and `npm run launch:media-check`.

## Tool Notes

- Blender is the default source-art workstation for 3D-authored sprite sheets and GLB experiments.
- Poly Haven and ambientCG are preferred for CC0 materials/HDRIs.
- Kenney assets can be used as CC0-style reference/placeholders when the exact asset license is recorded.
- OpenGameArt is allowed only with per-asset license verification.
- Image-to-3D tools such as TripoSR or Hunyuan3D are source-generation aids, not direct runtime asset sources; outputs still need cleanup, optimization, and provenance entries.
