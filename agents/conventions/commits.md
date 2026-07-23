# Commit Messages

Read this before writing a commit.

## Format

```
type(scope): subject
```

Conventional Commits. The `type` is a small closed set. The `scope` is the package or area the change lives in. Subject is imperative, lowercase, no trailing period. Prefer single-line messages.

## Types

| type       | use for                                                    |
| ---------- | ---------------------------------------------------------- |
| `feat`     | a new capability or API                                    |
| `fix`      | a bug fix                                                  |
| `docs`     | documentation only — including `agents/**` and `CLAUDE.md` |
| `refactor` | restructure or rename with no behavior change              |
| `test`     | tests only                                                 |
| `perf`     | a performance change                                       |
| `build`    | manifests, dependencies, build targets                     |
| `ci`       | CI configuration and workflows                             |
| `style`    | formatting only                                            |
| `chore`    | maintenance that fits nothing above                        |
| `revert`   | a revert                                                   |

## Scope

Use the short package name or area. Examples:

```
feat(capture): add fingerprint comparison utility
fix(reference): correct vite alias for starling demos
refactor(content): rename openfl corpus directories
build(deps): bump oxlint to 1.73.0
ci: add pre-push typecheck hook
style: apply npm run fix
```

A repo-wide change takes no scope.

## Enforcement

These rules are enforced by `commitlint.config.js` via the husky `commit-msg` hook.
