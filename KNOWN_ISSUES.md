# Known Issues

- Firebase migration is wired in source, but Firestore rules/functions must be deployed before the editor can write.
- Supabase backup JSON files are local and ignored. Keep a copy until Firebase import is verified.
- City/park pins only appear for selected places that have local coordinates.
- Existing city/park coordinate data are approximate and not official boundaries.
- The curated city dropdown data is intentionally not exhaustive.
- Alaska and Hawaii use simplified clickable inset mini maps rather than full geographic placement.
- The MapLibre/Firebase bundle is large; a future pass can split vendor chunks.
