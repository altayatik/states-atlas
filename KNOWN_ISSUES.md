# Known Issues

## Fixed In This Cleanup

- Public `/states/` no longer shows edit buttons, password fields, or admin controls.
- Public `/states/` now has a small `Edit atlas` link to the protected editor route.
- Editor controls moved to `/states/#/edit` behind a secret phrase gate.
- The editor now uses a dropdown-first inline workflow instead of search, modal steps, or 50 editable cards.
- Editor unlock now requires a backend/admin-token response; arbitrary phrases no longer unlock the route.
- City and park selections are explicit checklist/custom inputs and save to `cities_visited` and `parks_visited`.
- Editor changes autosave when closing the form, switching states, or returning to the public atlas.
- The full public state list was removed from normal page flow.
- Recent/latest memories were removed from the public page.
- City/metro and national park map layers were restored as subtle zoom-dependent outlines.
- City/park labels and public map layer toggles were removed, keeping the default map uncluttered.
- Alaska and Hawaii are atlas-style clickable insets instead of distorted map geometry.

## Remaining

- Exact `/states-edit/` is not deployed yet. The current editor URL is `/states/#/edit`; a separate `/states-edit/` Pages deployment can be added later if desired.
- The MapLibre bundle is large for a small personal site. A future pass can lazy-load the map route or split vendor chunks.
- Existing metro and park outline data are simplified visual footprints, not official/legal boundaries. They should be replaced later with Census TIGER/Line Urban Area data and official NPS boundary data if accuracy becomes a priority.
- City/park outlines are intentionally subtle and zoom-dependent. Persistent labels remain disabled to avoid overlap; selected places are described in the detail panel instead.
- Alaska and Hawaii are represented as clickable inset controls rather than full geographic placement.
- Long badge/city/park lists are functional and mobile-safe, but could be made more elegant with a custom compact picker later.
