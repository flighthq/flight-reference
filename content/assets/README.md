# Assets

Reference assets are committed here on purpose.

- They belong to the reference corpus rather than the live Flight asset tree.
- They are expected to be relatively static.
- Keeping them local reduces churn and keeps licensing boundaries explicit.

`tools/reference` serves `reference/assets/public` as its Vite public directory.

The detached OpenFL branch currently stages binary sample assets from local clones into cache directories. That is useful for bootstrapping, but the preferred steady state for this repo is to land the curated corpus here once licensing and size tradeoffs are settled.
