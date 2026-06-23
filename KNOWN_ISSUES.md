# Known Issues

## Fixed In This Cleanup

- Public `/states/` no longer shows edit buttons, password fields, or admin controls.
- Public `/states/` now has a small `Edit atlas` link to the protected editor route.
- Editor controls moved to `/states/#/edit` behind a secret phrase gate.
- The editor now uses a dropdown-first workflow instead of rendering 50 editable cards.
- City and park selections are explicit checklist/custom inputs and save to `cities_visited` and `parks_visited`.
- The full public state list was removed from normal page flow.
- Metro and park labels are hidden by default and now appear only for selected/hovered features or at higher zoom.
- Alaska and Hawaii are simplified clickable insets instead of distorted map geometry.

## Remaining

- Exact `/states-edit/` is not deployed yet. The current editor URL is `/states/#/edit`; a separate `/states-edit/` Pages deployment can be added later if desired.
- The MapLibre bundle is large for a small personal site. A future pass can lazy-load the map route or split vendor chunks.
- Metro and park outlines are simplified visual footprints, not official/legal boundaries. They should be replaced later with Census TIGER/Line Urban Area data and official NPS boundary data.
- Alaska and Hawaii are represented as clickable inset controls rather than full geographic placement.
- The edit modal is functional, but long badge/city/park lists could use a more refined compact mobile layout in a later UI pass.
