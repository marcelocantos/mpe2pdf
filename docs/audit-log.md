# Audit Log

Chronological record of audits, releases, documentation passes, and other
maintenance activities. Append-only — newest entries at the bottom.

## 2026-03-11 — /open-source mpe2pdf v0.1.0

- **Commit**: `332c6f0`
- **Outcome**: Open-sourced mpe2pdf. Audit: 10 findings (0 critical, 4 high, 4 medium, 2 low), all addressed. Added LICENSE, .gitignore, README, CLAUDE.md, STABILITY.md, agents-guide.md. Deduplicated version string. Released v0.1.0 (npm package, no compiled binaries).
- **Deferred**:
  - No tests (🎯T2)
  - No CI workflow
  - No `--no-scripts` opt-out flag
  - Output path edge case when input doesn't end in `.md`

## 2026-03-16 — /release v0.2.0

- **Commit**: `5bd99a3`
- **Outcome**: Released v0.2.0 (npm package). Fixed process hang after PDF generation. Fixed package.json bin path and repo URL. Added .npmignore.
- **Gates skipped**: tests-exist, ci-green, pr-workflow (same as v0.1.0)

## 2026-03-16 — /release v0.3.0

- **Commit**: `f8da162`
- **Outcome**: Released v0.3.0 (npm package). Added batch file conversion support.
- **Gates skipped**: tests-exist, ci-green, pr-workflow (same as v0.1.0)

## 2026-04-09 — /release v0.4.0

- **Commit**: `5962547`
- **Outcome**: Released v0.4.0 (npm package). Added MCP server mode (`--mcp`), paragraph reflow (`breakOnSingleNewLine: false`), 11 smoke tests with PDF content verification. Updated README and STABILITY.md.
- **Gates skipped**: ci-green, pr-workflow (no CI configured for npm package)
