# OpenFL sample assets

Binary sample assets are still staged from local `openfl-samples` and `openfl-samples-ts` clones, but in this standalone repo they should land under `reference/assets/public`, which is what the current reference app serves directly.

That keeps the reference corpus self-contained:

- committed reference assets live with the reference harness
- the staging script is only a bootstrap path while the asset set is still being curated
- upstream sample paths stay recognizable so ports can remain close to source

The detached branch's asset list is still the right shortlist for what should eventually get a stable, committed home here.
