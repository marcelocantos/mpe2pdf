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
