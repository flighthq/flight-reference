# OpenFL sample assets

Binary sample assets are still staged from local `openfl-samples` and `openfl-samples-ts` clones, but in this standalone repo they should land under `reference/assets/public/openfl`.

That keeps the reference corpus self-contained:

- committed reference assets live with the reference harness, namespaced under `openfl/`
- the staging script is only a bootstrap path while the asset set is still being curated
- upstream sample paths stay recognizable so ports can remain close to source

The detached branch's asset list is still the right shortlist for what should eventually get a stable, committed home here.

One extra committed asset still sits outside the two upstream sample repos: `assets/nyancat.png` is retained for the Flight-side Nyan Cat parity port, while the upstream OpenFL sample itself continues to load `assets/library.swf`.
