#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Build and package the reference harness for release.

Options:
  --version VERSION   Version tag (default: read from tools/reference/package.json)
  --base PATH         Base URL path, e.g. /reference/ (default: /)
  --release           Create a GitHub release with the tarball
  -h, --help          Show this help

Examples:
  $(basename "$0")                                    # build with defaults
  $(basename "$0") --base /reference/                 # build for /reference/ subpath
  $(basename "$0") --base /reference/ --release       # build + create GitHub release
  $(basename "$0") --version 0.2.0 --base / --release # explicit version
EOF
  exit 0
}

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=""
VITE_BASE="/"
CREATE_RELEASE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --base)    VITE_BASE="$2"; shift 2 ;;
    --release) CREATE_RELEASE=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  VERSION=$(node -p "require('./tools/reference/package.json').version" 2>/dev/null || echo "")
  if [[ -z "$VERSION" ]]; then
    echo "error: could not read version from tools/reference/package.json" >&2
    exit 1
  fi
fi

TARBALL="reference-dist-${VERSION}.tgz"

echo "Building reference harness v${VERSION} (base: ${VITE_BASE})"
cd "$REPO_ROOT"
VITE_BASE="$VITE_BASE" npm run build

echo "Packaging ${TARBALL}"
tar -czf "$TARBALL" -C tools/reference/dist/ .
echo "Created ${TARBALL} ($(du -h "$TARBALL" | cut -f1))"

if $CREATE_RELEASE; then
  echo "Creating GitHub release ${VERSION}"
  gh release create "$VERSION" "$TARBALL" -t "$VERSION" --notes ""
  echo "Released ${VERSION}"
fi
