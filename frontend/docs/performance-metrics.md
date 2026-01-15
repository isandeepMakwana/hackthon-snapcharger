# Performance Metrics

## Baseline (before refactor)

Build command: `npm run build` (from `FrontEnd/`)

- `dist/index.html`: 1.81 kB (gzip 0.90 kB)
- `dist/assets/index-BHOwN1y9.js`: 504.39 kB (gzip 125.39 kB)
- Warning: single chunk > 500 kB
- Note: `/index.css` missing at build time

## After optimization

Build command: `npm run build` (from `FrontEnd/`)

- `dist/index.html`: 0.99 kB (gzip 0.53 kB)
- `dist/assets/index-BTLCDv9A.js`: 195.85 kB (gzip 61.97 kB)
- Code-split chunks:
  - `dist/assets/leaflet-jBRwKcs2.js`: 149.58 kB (gzip 43.27 kB)
  - `dist/assets/genai-DIJy3oET.js`: 256.30 kB (gzip 51.00 kB)
  - `dist/assets/DriverView-1RMFkDuP.js`: 28.54 kB (gzip 7.56 kB)
  - `dist/assets/HostView-D_z3E1rz.js`: 7.19 kB (gzip 2.41 kB)
- Outcome: main bundle reduced by ~61% and heavy dependencies are now lazy-loaded.
