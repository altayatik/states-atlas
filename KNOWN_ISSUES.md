# Known Issues

## Fixed In This Cleanup

- Public `/states/` no longer shows edit buttons, password fields, or admin controls.
- Public `/states/` now has a small `Edit atlas` link to the protected editor route.
- Editor controls moved to `/states/#/edit` behind a secret phrase gate.
- The editor now uses a dropdown-first inline workflow instead of search, modal steps, or 50 editable cards.
- Editor unlock now requires a backend/admin-token response; arbitrary phrases no longer unlock the route.
- City and park selections are explicit checklist/custom inputs and save to `cities_visited` and `parks_visited`.
- City and park editor options now come from curated per-state travel option data.
- Editor changes autosave when closing the form, switching states, or returning to the public atlas.
- The full public state list was removed from normal page flow.
- Recent/latest memories were removed from the public page.
- City/metro and national park map layers were restored as subtle zoom-dependent outlines.
- City/park labels and public map layer toggles were removed, keeping the default map uncluttered.
- Alaska and Hawaii are atlas-style clickable SVG mini-map insets instead of distorted map geometry.
- The public edit affordance is now a compact wrench icon instead of a text button.
- The header scale and palette were tuned toward a brighter pastel road-atlas style.

## Remaining

- Exact `/states-edit/` is not deployed yet. The current editor URL is `/states/#/edit`; a separate `/states-edit/` Pages deployment can be added later if desired.
- The MapLibre bundle is large for a small personal site. A future pass can lazy-load the map route or split vendor chunks.
- Existing metro and park outline data are simplified visual footprints, not official/legal boundaries. They should be replaced later with Census TIGER/Line Urban Area data and official NPS boundary data if accuracy becomes a priority.
- City/park outlines are limited to selected places that already have local simplified geometry. Saved custom cities and parks still appear textually in state details, but they do not create new map shapes.
- The curated city dropdown data is not exhaustive. It is meant as a practical travel starter list.
- National park dropdown data includes official "National Park" units only, not every NPS unit.
- City/park outlines are intentionally subtle and zoom-dependent. Persistent labels remain disabled to avoid overlap; selected places are described in the detail panel instead.
- Alaska and Hawaii are represented as clickable inset mini maps rather than full geographic placement.
- Long badge/city/park lists are functional and mobile-safe, but could be made more elegant with a custom compact picker later.
