Committed public assets are served from this directory (Vite's public directory) and are broken up by framework. Each framework owns a top-level folder that maps directly to its URL prefix:

- `openfl/` — served under `/openfl/` (e.g. `openfl/assets/…`, `openfl/openfl.png`)
- `starling/` — served under `/starling/`
- `awayjs/` — served under `/awayjs/`

Reference a framework's assets by its prefix (e.g. `openfl/assets/wabbit_alpha.png`).
