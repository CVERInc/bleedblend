#!/usr/bin/env bash
# Single entry point — the deterministic checks .github/workflows/ci.yml runs.
# Runs anywhere (no browser needed): the pure + unit decision-logic suites and the
# shared release-readiness gate. The integration suite (test:auto) drives real
# Chrome over CDP; CI runs it on every push/PR and `prepublishOnly` runs it before
# publishing, but it is intentionally NOT part of this pre-push gate.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ deterministic decision-logic suites (pure + units)"
npm run test:ci

echo "→ release readiness"
node scripts/check-release-readiness.mjs

echo "✅ ALL GREEN"
