# Entropy audit — mpe2pdf (2026-08-22)

Full-mode audit (entropy + hygiene). Comparison appendix omitted (no prior entropy report).

## Executive summary

- **Snapshot:** `/Users/marcelo/work/github.com/marcelocantos/mpe2pdf`, branch `master`, HEAD `f04e70d9f6cc5a1242039e460df7249b0b086b5e` (`push/move targets yaml to bullseye yaml (#1)`, 2026-07-11). Initial dirty state (user-owned, left untouched): `?? .claude/`, `?? test/sample.md`. Date: 2026-08-22.
- **Scope:** tracked product sources, tests, manifests, docs, GitHub settings, and the local `npm test` / `npm audit` / `npm pack` paths. **Excluded:** `node_modules/` (11k+ vendored files; sampled only `@shd101wyy/mume` `princeExport` and `@modelcontextprotocol/server` stdio framing), untracked `.claude/` and `test/sample.md`.
- **Headline mechanism:** a 237-line single-file CLI that is topologically sound, but **re-derives mume’s PDF output path with a narrower `/\.md$/` rule and then `renameSync`s that guess** — so non-`.md` inputs plus an explicit output path rename the source file to the destination and report success. Around that hub, documentation and work-tracking still assert “no tests” after eleven shipped-path smokes exist, and the public npm package has **no CI, no Dependabot, and no hygiene.yaml**.
- **Highest-consequence findings:** ENT-001 (source-file clobber on non-`.md` + explicit output), ENT-002 (no remote oracle), ENT-003 (unratcheted mume transitive vulns).
- **Unverified residue:** exploitability of `request`/`form-data` on the Prince export path; live `npm install -g mpe2pdf` vs local `node mpe2pdf.mjs`; Mermaid/KaTeX/footnote rendering; MCP clients that speak a newer protocol than the tests’ `2025-03-26`.

## Scope and exclusions

| In scope | Out of scope |
|---|---|
| `mpe2pdf.mjs`, `package.json`, `package-lock.json`, `test/smoke.test.mjs` | `node_modules/**` except targeted reads of mume `princeExport` and MCP `ReadBuffer` |
| `README.md`, `STABILITY.md`, `agents-guide.md`, `CLAUDE.md`, `docs/*`, `bullseye.yaml`, `.gitignore`, `.npmignore`, `LICENSE` | Untracked `.claude/settings.local.json`, untracked `test/sample.md` (user-owned) |
| GitHub repo settings reachable via `gh` | Other repositories; Jevons |

No generated source tree. No `AGENTS.md`. No `.github/`. No `hygiene.yaml`.

Languages judged: JavaScript/Node ESM only (`package.json` `"type": "module"`, `"engines": { "node": ">=18" }`). No Python/Go/C++/Rust/SQL/Bash sources. Not a web-frontend app (HTML is an internal mume artifact). `journeys.md` applied when classifying the smoke suite vs owner-visible E2E.

## Commands run

| Command | Version / identity | Exit | Shipped vs auxiliary | Notes |
|---|---|---|---|---|
| `git rev-parse --abbrev-ref HEAD`; `git rev-parse HEAD`; `git status --porcelain=v1 -b` | git | 0 | provenance | Initial: `master`, `f04e70d9…`, dirty `?? .claude/` `?? test/sample.md`, `master...origin/master` with no ahead/behind |
| `node --version`; `npm --version`; `prince --version` | Node v26.7.0, npm 11.19.0, Prince 16.2 (non-commercial) | 0 | environment | Prince is the HTML→PDF backend; required on PATH |
| `npm test` (`node --test 'test/**/*.test.mjs'`) | Node built-in test runner | 0 | **shipped path** | 11/11 pass, 0 fail, ~5.2s. Spawns `node mpe2pdf.mjs`, real mume+Prince, `pdfjs-dist` text extract |
| `npm audit --json` | npm 11.19.0 audit v2 | 1 | auxiliary (advisory DB) | 28 vulns: 2 critical, 21 high, 5 moderate. Counts are locators, not exploit proofs |
| `npm ls --depth=0` | npm | 0 | auxiliary | Direct: `@cfworker/json-schema@4.1.1`, `@modelcontextprotocol/server@2.0.0-alpha.2`, `@shd101wyy/mume@0.7.9`, `zod@4.3.6`, `pdfjs-dist@5.6.205` (dev) |
| `npm pack --dry-run` | npm | 0 | **shipped pack path** (local tree) | Would include untracked `.claude/settings.local.json` and tracked `bullseye.yaml` |
| `npm view mpe2pdf@0.4.0` + tarball listing | registry.npmjs.org | 0 | published artifact | Published tarball is only `LICENSE`, `README.md`, `agents-guide.md`, `mpe2pdf.mjs`, `package.json` |
| `~/.claude/skills/hygiene/hygiene_check.py` | uv-run script, pyyaml, no `--version` | 1 | auxiliary | `FileNotFoundError: hygiene.yaml`. Posture **not declared** |
| `gh api repos/marcelocantos/mpe2pdf` | gh | 0 | auxiliary | `default_branch=master`, public, secret scanning + push protection enabled, Dependabot security updates **disabled** |
| `gh api …/actions/workflows` | gh | 0 (empty) | auxiliary | No workflows |
| `gh api …/dependabot/alerts` | gh | 403 | auxiliary | “Dependabot alerts are disabled for this repository” |
| `gh api …/code-scanning/alerts` | gh | 404 | auxiliary | No analysis |
| Temp-dir CLI probes under `/tmp/mpe2pdf-audit-*` | `node mpe2pdf.mjs` | 0 | **shipped path** | Non-`.md` + explicit output: source renamed, stdout path is not a PDF (ENT-001) |
| `node -e 'import("@modelcontextprotocol/server")…'` | SDK 2.0.0-alpha.2 | 0 | auxiliary | `LATEST_PROTOCOL_VERSION=2025-11-25`, `DEFAULT_NEGOTIATED=2025-03-26` |

**Limitations:** `npm audit` does not prove the Prince export path loads `request`. Code-scanning/dependabot APIs need extra scopes; disabled-alerts 403 is still evidence of the setting. Hygiene validator has no graceful undeclared mode. No clone detector / eslint / coverage tool is configured; none were installed.

## Observed architecture

Single deployable: the `mpe2pdf` bin (`package.json` `bin.mpe2pdf` → `mpe2pdf.mjs`). No build step. Runtime graph:

```
argv
 ├─ --help / --help-agent / --version  → stdout, exit 0
 ├─ --mcp → dynamic import @modelcontextprotocol/server + zod
 │           registerTool("convert") → convertOne
 └─ positional .md/.pdf args → convertOne
                                  ├─ mume.init (once)
                                  ├─ MarkdownEngine { princeExePath: "prince", enableScriptExecution: true }
                                  └─ engine.princeExport → (ignored return) → renameSync(guess, output)
```

**Declared rules that agree with code**

- CLAUDE.md: single-file CLI, mume + Prince, `package.json` is version SSoT (`mpe2pdf.mjs` reads it via `createRequire`).
- README / agents-guide: CLI flags, batch conversion, MCP `convert` tool, script-execution warning.
- STABILITY.md: CLI flags and MCP field names match `usage()` and `registerTool`.

**Observed rules inferred from code (not documented as architecture)**

- MCP SDK is loaded only in `--mcp` (dynamic `import`), but it is still a production `dependencies` entry, so every install pays for it.
- `convertOne` does not use `princeExport`’s returned path; it re-implements output naming.
- Unknown `-*` flags are dropped (`args.filter((a) => !a.startsWith("-"))`) rather than rejected.
- Process is force-exited after CLI conversion (`process.exit(0)`), matching commit `fc1bfb4` (“Fix process hang after PDF generation”).

**Contradictions**

- STABILITY.md and `docs/TODO.md` still say CLI/MCP tests do not exist; `test/smoke.test.mjs` and `docs/audit-log.md` (v0.4.0) say they do.
- STABILITY.md marks `@modelcontextprotocol/server` **Stable** while `package.json` pins `^2.0.0-alpha.2`.
- STABILITY.md documents MCP protocol `2025-03-26`; the installed SDK’s latest is `2025-11-25` (default negotiated still `2025-03-26`).
- `.npmignore` still assumes targets live under `docs/`; `bullseye.yaml` is now at repo root and would ship on the next pack.

**Unknown intent (owner judgment)**

- Whether `enableScriptExecution: true` must remain the 1.0 default (STABILITY: “Needs review”).
- Whether MCP protocol should be documented as SDK-dependent or pinned.
- Whether T2 (“tests”) was dropped from bullseye because it was achieved, or lost in the `docs/targets.yaml` → `bullseye.yaml` rename.

```
CLI flags ─┐
MCP tool  ─┴→ convertOne → @shd101wyy/mume → Prince binary
                              │
                     (pdfjs-dist only in tests)
```

No package cycles. No layering to violate. The fan-in hub is `convertOne` (two callers: CLI loop, MCP handler).

## Dimension vector

| Dimension | State | Evidence summary | Change from baseline |
|---|---|---|---|
| Architecture topology | healthy | One bin, two modes, shared `convertOne`, dynamic MCP import, no cycles | n/a (first full audit) |
| Redundancy / sources of truth | concern | Output path derived three times and disagrees with mume; STABILITY/TODO vs tests; README ↔ agents-guide ↔ `usage()` | n/a |
| Change amplification | concern | Flag/schema/docs/STABILITY move together; bounded by repo size | n/a |
| Local code quality | healthy | 237-line linear CLI; hang workaround is historically justified; silent unknown flags are the main local defect | n/a |
| Correctness / verification | concern | 11 shipped-path smokes green locally; no CI; ENT-001 untested; advertised Mermaid/KaTeX have no oracle | n/a |
| Security / dependencies | concern | Script execution hardcoded on; 28 npm audit issues via mume; Dependabot off; no `files` whitelist | n/a |
| Build / release / operations | concern | No workflows; releases recorded as skipping `ci-green`; pack ignore list drifted after bullseye move | n/a |
| Documentation / governance | concern | STABILITY/TODO stale; no AGENTS.md/hygiene.yaml; bullseye T1 achieved, T2 only in TODO/audit-log | n/a |

Do not collapse this vector to a score.

## Findings

### ENT-001: `convertOne` discards mume’s PDF path and `renameSync`s a `/\.md$/` guess

- **Priority:** P1
- **Dimensions:** Architecture topology (local path rule vs engine), Correctness / verification, Change amplification
- **Status:** observed fact
- **Evidence:**
  - `mpe2pdf.mjs:47-54` awaits `engine.princeExport` and ignores its return; then `inputPath.replace(/\.md$/, ".pdf")` + `fs.renameSync`.
  - Same replace at `mpe2pdf.mjs:101-103` (MCP default output) and `mpe2pdf.mjs:227-228` (CLI default output).
  - mume `princeExport` (vendored `node_modules/@shd101wyy/mume/out/esm/index.mjs`, function starting `async princeExport`) does `s=this.filePath; l=I.extname(s); s=s.replace(new RegExp(l+"$"),".pdf")` and **returns `s`**.
  - Temp probe, `.markdown` + explicit output: source `note.markdown` **gone**; `out.pdf` is ASCII markdown (`# Title…`); real PDF left at `note.pdf`; CLI printed `out.pdf` and exited 0.
  - Temp probe, extensionless `README`: CLI printed `…/README` (the source); PDF written to `README.pdf`.
  - STABILITY.md:31-34 marks “Prints output file path to stdout on success” **Stable**; STABILITY.md:68 describes a milder “edge case” than the rename.
  - `test/smoke.test.mjs` only uses `*.md` paths (e.g. lines 85-86, 105-106, 120-121, 244-245).
- **Mechanism:** two authorities for “where the PDF is”. mume uses `path.extname`; mpe2pdf uses a suffix that only matches lowercase `.md`. When they differ and the caller asked for another destination, `renameSync` moves the **source markdown** (the failed guess) onto the output path. Callers then treat a markdown file named `.pdf` as success.
- **Blast radius:** CLI explicit output, MCP `files[].output`, any agent passing `.markdown`/`.MD`/no-extension paths. Default `.md` inputs are fine (11 tests). `.gitignore` ignores `*.pdf`, so a leftover sibling PDF is easy to miss in git.
- **Counterevidence checked:** advertised usage is `<input.md…>` (README, `usage()`). STABILITY already lists the edge case as a 1.0 gap — but it does not mention source clobber. MCP schema text says “Absolute path to a `.md` file” (`mpe2pdf.mjs:82`) without enforcing it.
- **Smallest coherent remediation:** use the string `princeExport` already returns as `mumeOutput`; `renameSync` only if that path exists, is not the input, and differs from the requested output. Share one helper for the CLI/MCP *default* when the caller omitted output. Refuse or normalize non-markdown inputs if that is the product rule.
- **Verification:** tests that would fail on regression: (1) `note.markdown` + explicit `out.pdf` leaves source intact, `out.pdf` is `%PDF`, no stray `note.pdf` unless requested; (2) extensionless input: stdout path exists and is a PDF; (3) `.md` explicit-output test remains green.
- **Ratchet candidate:** those three cases in `test/smoke.test.mjs` under `npm test` (and CI once ENT-002 exists).

### ENT-002: Tests exist on the shipped path but nothing remote ever runs them

- **Priority:** P1
- **Dimensions:** Correctness / verification, Build / release / operations
- **Status:** observed fact
- **Evidence:**
  - `package.json:15` `"test": "node --test 'test/**/*.test.mjs'"`.
  - `npm test` → 11 pass / 0 fail (CLI flags, conversion, MCP initialize+convert).
  - No `.github/` in `git ls-files`; `gh api repos/marcelocantos/mpe2pdf/contents/.github` → 404; workflows list empty.
  - `docs/audit-log.md:31-33` (v0.4.0): “Gates skipped: ci-green, pr-workflow (no CI configured for npm package)”. Same skip at v0.1.0–v0.3.0.
  - Smoke tests need Prince on PATH (README prerequisites; this host has Prince 16.2). That is a CI image requirement, not a reason to have zero workflows.
- **Mechanism:** the only executable product oracle is a local command. Releases and PRs cannot fail on a broken convert/MCP path. ENT-001 survived because the suite never left `.md`.
- **Blast radius:** npm consumers of `mpe2pdf@0.4.0`; future edits to `convertOne` or MCP framing.
- **Counterevidence checked:** local suite is real (spawns the CLI, talks JSON-RPC NDJSON which the SDK `ReadBuffer` frames on `\n` — `node_modules/@modelcontextprotocol/server/dist/src-IKPjmxu7.mjs:2908-2920`). That is a thin owner-visible slice (CLI + MCP + Prince), not a hermetic stub. It is **unwired** to any standing remote gate, so it decays as a release oracle (`journeys.md`: unwired journeys decay).
- **Smallest coherent remediation:** one GitHub Actions workflow: install Node 18+, install Prince, `npm ci`, `npm test`. Do not skip `ci-green` on the next release.
- **Verification:** a workflow file that exists and a job that runs `npm test`; a deliberate fail (e.g. assert `false` in a smoke) must red the job.
- **Ratchet candidate:** `ci_job` in a future `hygiene.yaml`; `gh_setting` that the workflow is required if branch protection is adopted.

### ENT-003: Public package depends on mume’s fat, unpinned-CVE tree with no scan gate

- **Priority:** P1
- **Dimensions:** Security / dependencies, Build / release / operations
- **Status:** observed fact (advisory inventory); inference (exploitability on the Prince path)
- **Evidence:**
  - `npm audit`: 28 issues (2 critical, 21 high, 5 moderate). Critical: `form-data` GHSA-fjxv-7rqg-78g4, `request` GHSA-p8p7-x288-28g6 (severity tagged critical in npm’s tree because `request` is deprecated/unmaintained; advisory itself is moderate SSRF).
  - `npm ls`: `request@2.88.2` → `form-data@2.3.3` and `puppeteer-core@21.11.0` hang off `@shd101wyy/mume@0.7.9`. `markdown-it` is also flagged and **is** on the parse path.
  - Suggested `npm audit fix --force` installs **older** `@shd101wyy/mume@0.7.7` (semver-major downgrade).
  - STABILITY.md:60 marks mume **Stable (core engine)**.
  - GitHub: Dependabot security updates disabled; dependabot alerts API 403 “disabled”; no code scanning.
  - `pdfjs-dist` high (GHSA-hq66-cqwq-w95j) is a **devDependency** used only to read PDFs in tests — not shipped (`npm view` tarball has no `node_modules`).
- **Mechanism:** the product froze a Markdown engine that pulls browser-export and HTTP stacks mpe2pdf does not call (`princeExport` vs puppeteer/chrome export). With Dependabot and CI audit both off, the advisory set can only grow. “Stable engine” plus `npm audit fix --force` downgrade means there is no safe mechanical bump.
- **Blast radius:** anyone who `npm install`s mpe2pdf gets the tree. Reachable attack surface on the Prince path is **not proven** for `request`/`form-data` (those show up in mume eBook image download). `markdown-it` ReDoS and `enableScriptExecution` (ENT-004) are the more plausible shipped-path issues. Untrusted Markdown is already a stated trust boundary (README Security).
- **Counterevidence checked:** published tarball is source-only (5 files). Prince path does not instantiate puppeteer in `mpe2pdf.mjs`. Audit counts alone are not a P0.
- **Smallest coherent remediation:** (1) `npm audit` (or `osv-scanner`) in CI as a non-zero gate or an explicit allowlist file; (2) enable Dependabot alerts; (3) document which mume subtrees are accepted risk vs which must move. Do not `--force` downgrade mume.
- **Verification:** CI job that fails on new critical/high outside an allowlist; a newly added vulnerable direct dep must fail.
- **Ratchet candidate:** hygiene `scanner: {tool: npm-audit, invoked: ci}` plus `gh_setting` Dependabot.

### ENT-004: Script execution is hardcoded on; unknown flags are silently dropped

- **Priority:** P2
- **Dimensions:** Security / dependencies, Local code quality
- **Status:** observed fact
- **Evidence:**
  - `mpe2pdf.mjs:40-44` `enableScriptExecution: true` with no CLI/MCP override. mume’s own default in the ESM bundle is `enableScriptExecution:!1` (false).
  - README.md:75-78 and agents-guide.md:73-75 document the trust requirement.
  - STABILITY.md:38 “Needs review”; STABILITY.md:66 “No `--no-scripts` flag … before 1.0”.
  - `mpe2pdf.mjs:189` `positional = args.filter((a) => !a.startsWith("-"))`.
  - Temp probe: `mpe2pdf --no-scripts x.md` exits 0 and writes `x.pdf` (flag ignored).
- **Mechanism:** the engine default is off; this product turns it on to match VS Code Markdown Preview Enhanced. MCP mode then exposes `convert` over stdio to whatever agent attached, still with scripts on. A user or agent who passes `--no-scripts` is not protected — the flag is not an error.
- **Blast radius:** local RCE on untrusted Markdown (documented). Wider in `--mcp` than in a human-typed CLI. Not network-exposed by default.
- **Counterevidence checked:** matching VS Code MPE is the selling point (README). This is a local CLI trust model, not an unauthenticated service. Deliberate, but still open on the 1.0 checklist.
- **Smallest coherent remediation:** reject unknown flags; add `--no-scripts` (and MCP equivalent) defaulting however 1.0 decides; do not no-op a security-shaped flag.
- **Verification:** `mpe2pdf --no-scripts` either disables execution or exits 1 with usage; `mpe2pdf --not-a-flag` exits 1.
- **Ratchet candidate:** CLI tests for unknown flags; a fenced-code-chunk fixture that fails under `--no-scripts` and runs under the default if default stays on.

### ENT-005: Stability/TODO still assert “no tests” after the suite shipped

- **Priority:** P2
- **Dimensions:** Redundancy / sources of truth, Documentation / governance
- **Status:** observed fact
- **Evidence:**
  - STABILITY.md:67 “**No tests**: CLI flag handling, MCP tool invocation, and error paths are untested.” `git blame` attributes that line to `5962547` — the same commit that added `test/smoke.test.mjs` (292 lines) and `package.json` `scripts.test`.
  - `docs/TODO.md:3` “Add tests for CLI flag handling (🎯T2)”.
  - `docs/audit-log.md:31` “Added … 11 smoke tests with PDF content verification”.
  - `bullseye.yaml` has only T1 (MCP mode, achieved). No T2.
- **Mechanism:** three ledgers (STABILITY gaps, TODO, bullseye) plus an audit log. The commit that added tests updated STABILITY’s MCP rows but left the “No tests” bullet, so the 1.0 checklist cannot be trusted.
- **Blast radius:** a later `/release` or 1.0 review will skip work that is done and miss work that is not (ENT-001, CI).
- **Counterevidence checked:** some STABILITY gaps are still true (`--no-scripts`, `-o`, MCP protocol ownership). Only the tests bullet is false. CLI error paths for missing files *are* tested (`test/smoke.test.mjs:69-78`).
- **Smallest coherent remediation:** delete the “No tests” bullet; replace with remaining holes (non-`.md` paths, unknown flags, Mermaid/KaTeX). Delete or rewrite `docs/TODO.md` (global instruction: TODO files are not the work ledger). If T2 was achieved, record it in bullseye on the commit that says so — do not invent that here.
- **Verification:** a docs grep that STABILITY.md no longer contains `No tests` while `package.json` still has `"test"`.
- **Ratchet candidate:** test or `file` evidence in hygiene that `scripts.test` exists and STABILITY does not claim otherwise (brittle — better to fix the sentence).

### ENT-006: CLI/MCP/help surfaces are copied, not generated

- **Priority:** P2
- **Dimensions:** Redundancy / sources of truth, Change amplification
- **Status:** observed fact
- **Evidence:**
  - Flag table: `mpe2pdf.mjs:142-157` `usage()`, README.md:39-44, STABILITY.md:16-21, agents-guide.md CLI examples.
  - MCP config JSON duplicated in README.md:54-63 and agents-guide.md:37-46.
  - Tool schema: `mpe2pdf.mjs:72-93`, agents-guide.md:48-69, STABILITY.md:48-54.
  - Co-change: `mpe2pdf.mjs` appears in 5 commits; `STABILITY.md` 5, `README.md` 4, `agents-guide.md` 3 — batch conversion (`c4d62f5`) and MCP (`52fe209`) each touched code + multiple docs.
- **Mechanism:** adding a flag or MCP field is shotgun surgery across four human-edited texts plus tests. Drift already happened (ENT-005).
- **Blast radius:** agents that read `--help-agent` vs humans that read README vs STABILITY’s 1.0 contract.
- **Counterevidence checked:** `--help-agent` reads `agents-guide.md` from disk (`mpe2pdf.mjs:160-164`) — that file is a real runtime surface, not dead docs. Some duplication is deliberate (npm README vs in-binary guide). Version is **not** duplicated: `package.json` is SSoT.
- **Smallest coherent remediation:** keep `usage()` and `agents-guide.md` as the two live surfaces; make README refer to `--help` / `--help-agent` for flag/schema tables; keep STABILITY as the compatibility contract only (no second flag encyclopedia).
- **Verification:** a change to `registerTool` inputSchema that updates agents-guide but not README should be acceptable; STABILITY vs `usage()` flag names should match in a small test or snapshot.
- **Ratchet candidate:** smoke already checks `--help` contains `--mcp` (`test/smoke.test.mjs:40-45`). Extend to flag names listed in STABILITY, or generate the table.

### ENT-007: Publish ignore list did not follow `bullseye.yaml` (and does not ignore `.claude/`)

- **Priority:** P2
- **Dimensions:** Build / release / operations, Security / dependencies
- **Status:** observed fact
- **Evidence:**
  - `.npmignore` lists `CLAUDE.md`, `STABILITY.md`, `docs/`, `test/`, `.DS_Store`, `*.db`. No `bullseye.yaml`, no `.claude/`.
  - `.gitignore`: `node_modules/`, `*.pdf`, `.DS_Store` only. `git check-ignore` does not ignore `.claude/settings.local.json`.
  - `npm pack --dry-run` on this tree: includes `292B .claude/settings.local.json` and `705B bullseye.yaml`.
  - Published `mpe2pdf@0.4.0` tarball (registry) does **not** include those files (packaged before the bullseye move; `.claude/` was not present at publish).
  - `package.json` has no `"files"` whitelist.
- **Mechanism:** npm packs untracked files unless ignored. `docs/targets.yaml` was covered by `docs/`; the rename to root `bullseye.yaml` (`f04e70d`) dropped that protection. `.claude/` is a credentials/permissions magnet.
- **Blast radius:** next `npm publish` from a dirty agent checkout. This tree’s `.claude/settings.local.json` keys are only `permissions` (no tokens observed); that is luck, not a control.
- **Counterevidence checked:** published 0.4.0 is clean. `.npmignore` already exists (commit `9ebe4fc`) — the gap is drift, not absence of the idea.
- **Smallest coherent remediation:** `files` whitelist in `package.json` (`mpe2pdf.mjs`, `package.json`, `README.md`, `LICENSE`, `agents-guide.md`) **or** add `bullseye.yaml` / `.claude/` to `.npmignore` and `.claude/` to `.gitignore`.
- **Verification:** `npm pack --dry-run` file list equals the published 0.4.0 set (plus any deliberate adds). Fail if `.claude` or `bullseye.yaml` appears.
- **Ratchet candidate:** `command: npm pack --dry-run` plus a test that parses the tarball list.

### ENT-008: MCP SDK is an alpha, marked Stable, with a newer LATEST than STABILITY

- **Priority:** P2
- **Dimensions:** Build / release / operations, Documentation / governance
- **Status:** observed fact (pin + labels); inference (future protocol break)
- **Evidence:**
  - `package.json:23` `"@modelcontextprotocol/server": "^2.0.0-alpha.2"` (caret on alpha).
  - STABILITY.md:62 SDK **Stable**; STABILITY.md:46 protocol `2025-03-26` “Needs review”.
  - Installed SDK: `LATEST_PROTOCOL_VERSION='2025-11-25'`, `DEFAULT_NEGOTIATED_PROTOCOL_VERSION='2025-03-26'`, supported includes both.
  - Tests initialize with `2025-03-26` (`test/smoke.test.mjs:212,257`) and pass.
- **Mechanism:** a caret range on a `2.0.0-alpha.*` tag can float to another alpha. STABILITY calls the dependency Stable while the protocol row admits SDK ownership is undecided.
- **Blast radius:** `--mcp` consumers (Claude Code config in README). CLI-only users still install the SDK.
- **Counterevidence checked:** tests pass against this exact alpha; NDJSON framing matches `ReadBuffer`. Default negotiated version matches the docs. Not a current break.
- **Smallest coherent remediation:** pin without caret (`2.0.0-alpha.2` or a later chosen exact version); document protocol as “SDK-negotiated, tested at 2025-03-26”; or wait for a non-alpha and re-test.
- **Verification:** lockfile + `npm ls` version equals the pin; MCP initialize test still green after any bump.
- **Ratchet candidate:** `npm ls --json` assertion in CI; STABILITY protocol row updated in the same commit as an SDK bump.

### ENT-009: Direct dependency `@cfworker/json-schema` has no product import

- **Priority:** P3
- **Dimensions:** Redundancy / sources of truth, Security / dependencies
- **Status:** observed fact
- **Evidence:** added in `52fe209` (“Add MCP server mode”) next to the SDK and zod. Grep of `*.mjs` / docs: only `package.json` / lockfile. `mpe2pdf.mjs` never imports it. The SDK exports `CfWorkerJsonSchemaValidator` for its own use (transitive).
- **Mechanism:** leftover direct dep enlarges the audit surface and freeze-thinks a transitive validator into a first-class dependency.
- **Blast radius:** `npm ls`, audit noise, future accidental import.
- **Counterevidence checked:** MCP server lockfile subtree also depends on `@cfworker/json-schema@^4.1.1` — removing the direct entry should keep it transitive until the SDK drops it.
- **Smallest coherent remediation:** remove from `package.json` `dependencies` and refresh the lockfile.
- **Verification:** `npm ls --depth=0` no longer lists it as a direct child; `npm test` MCP cases still pass.
- **Ratchet candidate:** none required; optional `depcheck` later.

### ENT-010: Followable work is split across TODO, audit-log, and bullseye

- **Priority:** P3
- **Dimensions:** Documentation / governance
- **Status:** observed fact
- **Evidence:**
  - `bullseye.yaml`: only T1, status `achieved`.
  - `docs/TODO.md`: T2 tests + `-o` flag.
  - `docs/audit-log.md:10-14` deferred T2, CI, `--no-scripts`, output-path edge case.
  - CLAUDE.md:31-33 “TODOs: `docs/TODO.md`”.
  - Global AGENTS.md: TODO files are banned; bullseye is the work ledger.
- **Mechanism:** T2 is cited but not a bullseye target. CI and the output-path bug live only in prose. Agents reading CLAUDE.md go to a stale TODO.
- **Blast radius:** duplicate or dropped 1.0 work.
- **Counterevidence checked:** T1 acceptance matches `--mcp` + tests. Audit-log is an honest historical record (keep it).
- **Smallest coherent remediation:** stop pointing CLAUDE.md at `docs/TODO.md`; promote remaining 1.0 gaps to bullseye targets on a later build commit (not this audit).
- **Verification:** `docs/TODO.md` gone or reduced to a pointer; CLAUDE.md “TODOs” section removed or replaced with bullseye.
- **Ratchet candidate:** hygiene `absent: {file: docs/TODO.md}` if the owner adopts that rule here.

### ENT-011: Advertised MPE features have no content oracle

- **Priority:** P3
- **Dimensions:** Correctness / verification
- **Status:** observed fact (coverage hole); not a demonstrated defect
- **Evidence:** README.md:7-10 and agents-guide.md:3-9 promise Mermaid, KaTeX/MathJax, tables, task lists, footnotes. Conversion tests (`test/smoke.test.mjs:83-159`) use headings, bold/italic, paragraph reflow. PDF text extract would not catch a missing diagram image.
- **Mechanism:** the product’s differentiator vs `pandoc`/`markdown-pdf` is untested. A mume bump could drop Mermaid and `npm test` would still pass.
- **Blast radius:** users converting the featured syntax.
- **Counterevidence checked:** simple Markdown→PDF is verified with pdfjs on the shipped binary. Prince is live. This is a hole, not a known break.
- **Smallest coherent remediation:** one fixture with a fenced `mermaid` block and a `$x$` inline, asserting PDF page count ≥ 1 and (if feasible) non-empty XObject/image or the words around the diagram. Keep it thin.
- **Verification:** that fixture fails if mermaid rendering is disabled.
- **Ratchet candidate:** additional case in `test/smoke.test.mjs`.

## Redundancy and competing-source-of-truth inventory

| Fact | Authorities | Drift already? |
|---|---|---|
| Version | `package.json` only (read by CLI) | No — healthy SSoT |
| PDF output path | mume `princeExport` return; `convertOne` `/\.md$/`; CLI default; MCP default | **Yes** — ENT-001 |
| “Do tests exist?” | STABILITY.md:67; docs/TODO.md:3; docs/audit-log.md:31; `test/smoke.test.mjs`; `package.json` scripts | **Yes** — ENT-005 |
| CLI flags | `usage()`, README, STABILITY, agents-guide | Names currently match; shotgun — ENT-006 |
| MCP `convert` schema | `registerTool` zod; agents-guide table; STABILITY table | Currently match |
| MCP protocol version | STABILITY `2025-03-26`; SDK LATEST `2025-11-25`; tests `2025-03-26` | Label drift — ENT-008 |
| 1.0 remaining work | STABILITY gaps; docs/TODO.md; audit-log deferred; bullseye (T1 only) | **Yes** — ENT-010 |
| npm contents | `.npmignore`; missing `"files"`; historically `docs/targets.yaml` | **Yes** after bullseye move — ENT-007 |

Deliberate duplication: README vs `agents-guide.md` (human vs `--help-agent` runtime). Coupling them into one generated blob is optional, not required.

## Healthy structure and deliberate exceptions

- **Single-file CLI** as declared in CLAUDE.md: one bin, no bundler, ES modules. Failed to find a boundary that would improve by splitting CLI/MCP into packages at this size.
- **Version SSoT:** `const { version: VERSION } = require("./package.json")` (`mpe2pdf.mjs:16`). `--version` test asserts semver (`test/smoke.test.mjs:47-50`).
- **Shared `convertOne`** for CLI and MCP — the right hub. The defect is inside it (ENT-001), not a second converter.
- **Shipped-path smokes:** 11 tests spawn the real binary, require Prince, parse PDF text, speak MCP JSON-RPC. That is the correct oracle shape for this product.
- **Hang workaround:** `process.exit(0)` after CLI success (`mpe2pdf.mjs:232`) from `fc1bfb4`. Suite completes in ~5s; treating this as a smell would ignore the recorded defect.
- **License / identity:** Apache-2.0 `LICENSE`; SPDX in `mpe2pdf.mjs:3-4`; GitHub secret scanning + push protection enabled.
- **Trust documentation:** script execution is not silent (README, agents-guide, STABILITY).
- **Published 0.4.0 tarball is minimal** (5 files). The ignore-list drift has not yet shipped.

## Hygiene posture

`hygiene.yaml` is **absent**. Posture is **not declared**. The file was not created.

Validator invocation (mandatory explicit run after entropy):

```
$ /Users/marcelo/.claude/skills/hygiene/hygiene_check.py
```

Exit 1. Full output:

```
Traceback (most recent call last):
  File "/Users/marcelo/.claude/skills/hygiene/hygiene_check.py", line 331, in <module>
    sys.exit(main())
  File "/Users/marcelo/.claude/skills/hygiene/hygiene_check.py", line 283, in main
    rep = check_repo(root, doc_path)
  File "/Users/marcelo/.claude/skills/hygiene/hygiene_check.py", line 237, in check_repo
    doc = yaml.safe_load(doc_path.read_text())
  File ".../pathlib/_local.py", line 546, in read_text
    ...
FileNotFoundError: [Errno 2] No such file or directory: '/Users/marcelo/work/github.com/marcelocantos/mpe2pdf/hygiene.yaml'
```

No per-dimension held tiers or floors (nothing to validate). No declared drift vs a floor. Reality that a later init would have to encode honestly:

| Dimension | What exists | Typical held-tier implication |
|---|---|---|
| correctness | local `npm test`, no CI | tests present, not blocking remotely |
| security | GitHub secret scanning + push protection; no Dependabot; no audit job | partial |
| quality | no lint/format config | floor 0 |
| deps | lockfile present; 28 audit hits; no scan job | lockfile only |
| release | npm package; STABILITY.md; gates skipped | present, unenforced |
| governance | LICENSE, README; no CODEOWNERS; TODO vs bullseye | baseline docs |
| build | no compile; `npm pack` | n/a |
| docs | README, agents-guide, STABILITY, CLAUDE.md | present, some stale |
| vcs | `.gitignore` incomplete for `.claude/` | |
| agent | `agents-guide.md` + `--help-agent` | stronger than many CLIs |

Overlap with entropy: ENT-002/003/007 are the items a `hygiene.yaml` would ratchet first. Do not initialize in this audit.

## Oracle coverage and residue

| Load-bearing property | Decided by |
|---|---|
| `--help` / `--version` / `--help-agent` / no-args / missing file | Shipped-path `npm test` (CLI flags) |
| `.md` → PDF exists, stdout path, pdfjs text, explicit output, batch, paragraph reflow | Shipped-path conversion tests (Prince live) |
| MCP initialize, `tools/list` has `convert`, `tools/call` writes a PDF | Shipped-path MCP tests (NDJSON / SDK `ReadBuffer`) |
| Process does not hang after convert | Implicit in `execFile` completing; `process.exit(0)` workaround |
| Non-`.md` input / explicit output does not clobber source | **Nothing** (ENT-001) |
| Unknown flags rejected; `--no-scripts` | **Nothing** (ENT-004) |
| Mermaid / KaTeX / tables / footnotes | **Nothing** (ENT-011); README claims |
| Prince missing → nonzero exit | **Nothing** (manual) |
| CI / Dependabot / npm audit gate | **Nothing** (ENT-002, ENT-003) |
| Published tarball file set | Auxiliary `npm pack --dry-run` / `npm view` this audit; not ratcheted |
| `request`/`form-data` reachable in `princeExport` | **Unverified** |
| Global `npm install -g` bin shim | **Unverified** (local `node mpe2pdf.mjs` only) |
| MCP client using protocol `2025-11-25` | **Unverified** (tests use `2025-03-26`) |

Failed/skipped checks: hygiene.yaml missing; Dependabot alerts API 403; code scanning 404; no eslint/depcheck/jscpd configured (not installed).

**Owner residue (intent only):**

1. Must `enableScriptExecution` stay default-on for 1.0, or is `--no-scripts` (default off or on) required?
2. Is MCP protocol a frozen product contract or SDK-negotiated?
3. Was 🎯T2 dropped as achieved, or lost in the bullseye rename?
4. Accept mume’s transitive CVE set until an upstream bump, or treat audit-high as a release blocker?

## Remediation sequence

1. **Repair the output-path seam (ENT-001).** Consume `princeExport`’s return value; add the three regression tests. This is the only current data-integrity bug.
2. **Wire the oracle (ENT-002).** GitHub Actions: Node + Prince + `npm ci` + `npm test`. Until this exists, ENT-001’s tests are local-only.
3. **Converge truths (ENT-005, ENT-010, ENT-008).** STABILITY “No tests” bullet; MCP alpha vs Stable; CLAUDE.md → TODO. Do not add hygiene.yaml until the sentences match the tree.
4. **Pack allowlist (ENT-007)** so the next publish cannot pick up `.claude/` or `bullseye.yaml`.
5. **Unknown flags + `--no-scripts` (ENT-004)** once 1.0 intent is chosen.
6. **Audit/Dependabot (ENT-003)** as a CI job with an explicit allowlist, not `npm audit fix --force`.
7. **Then** drop `@cfworker/json-schema` (ENT-009), slim docs (ENT-006), add one Mermaid/KaTeX fixture (ENT-011).
8. Re-run this audit on the same definitions. If hygiene is adopted, declare floors that match reality (do not set `correctness: 2` until CI exists).

No multi-package rewrite. The topology is already the right size.
