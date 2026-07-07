# OpenFL sample assets

The detached OpenFL branch currently stages binary sample assets from local clones into cache directories before `tools/reference` runs.

That bootstrap path is useful while the corpus is still being assembled, but the repository direction here is different:

- keep reference assets inside this repo once the set is curated
- avoid polluting the main Flight asset tree with static reference-only content
- keep upstream sample paths recognizable so ports stay close to source

The staged asset list from the detached branch is the right shortlist for what eventually needs a committed home in this repository.
