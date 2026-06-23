# Known Issues

## Fixed In This Cleanup

- Public `/states/` no longer shows edit buttons, password fields, or admin controls.
- Editor controls moved to `/states/#/edit` behind a secret phrase gate.
- Public state browsing is collapsed behind `Browse states` instead of rendering the full 50-state list by default.
- Metro and park labels are hidden by default and now appear only for selected/hovered features or when the `Labels` layer is enabled at higher zoom.

## Remaining

- Exact `/states-edit/` is not deployed yet. The current editor URL is `/states/#/edit`; a separate `/states-edit/` Pages deployment can be added later if desired.
- The MapLibre bundle is large for a small personal site. A future pass can lazy-load the map route or split vendor chunks.
- Metro and park outlines are simplified visual footprints, not official/legal boundaries. They should be replaced later with Census TIGER/Line Urban Area data and official NPS boundary data.
- Alaska and Hawaii are displayed as approximate insets in the local atlas projection rather than full geographic placement.
- The edit modal is functional, but long badge/city/park lists could use a more refined compact mobile layout in a later UI pass.
