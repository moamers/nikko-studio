#!/bin/bash
# SessionStart hook — prepares a Claude Code on the web session.
#
# Today this repo is documentation-only: there are no dependency manifests,
# so there is nothing to install and the hook is close to a no-op.
#
# It is written ahead of the Astro site (roadmap task 0.6, docs/12-roadmap.md)
# so that the moment site/package.json lands, dependencies install
# automatically with no further setup. Safe to run repeatedly.
set -euo pipefail

# Only run in the remote (web) environment; local dev machines manage themselves.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

echo "[session-start] preparing $PROJECT_DIR"

# ---------------------------------------------------------------------------
# Node dependencies — activates once the Astro site is scaffolded under site/.
# `npm install` (not `ci`) so the container's cached state is reused.
# ---------------------------------------------------------------------------
installed_any=false
for manifest in package.json site/package.json; do
  if [ -f "$manifest" ]; then
    dir="$(dirname "$manifest")"
    echo "[session-start] installing node dependencies in ${dir}"
    ( cd "$dir" && npm install --no-audit --no-fund )
    installed_any=true
  fi
done

if [ "$installed_any" = false ]; then
  echo "[session-start] no dependency manifests yet — documentation-only repo"
fi

# ---------------------------------------------------------------------------
# Verify the tooling the current checks rely on.
# ---------------------------------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "[session-start] WARNING: python3 not found — docs link check unavailable" >&2
fi

echo "[session-start] ready"
