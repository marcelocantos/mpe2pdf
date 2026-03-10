# Stability

## Stability commitment

Once mpe2pdf reaches 1.0, backwards compatibility becomes a binding contract.
Breaking changes to the CLI interface, output behaviour, or configuration
require a new product fork. The pre-1.0 period exists to get these right.

## Interaction surface catalogue

Snapshot as of v0.1.0.

### CLI flags

| Flag | Type | Default | Stability |
|---|---|---|---|
| `--help` | boolean | — | **Stable** |
| `--help-agent` | boolean | — | **Stable** |
| `--version` | boolean | — | **Stable** |

### Positional arguments

| Position | Meaning | Required | Stability |
|---|---|---|---|
| 1 | Input `.md` file path | Yes | **Stable** |
| 2 | Output `.pdf` file path | No (defaults to input with `.pdf` extension) | **Stable** |

### Output behaviour

| Behaviour | Stability |
|---|---|
| Prints output file path to stdout on success | **Stable** |
| Exit code 0 on success, 1 on error | **Stable** |
| Error messages to stderr | **Stable** |
| Script execution enabled in mume engine | **Needs review** — may want an opt-out flag |

### Dependencies

| Dependency | Role | Stability |
|---|---|---|
| `@shd101wyy/mume` | Markdown → HTML rendering | **Stable** (core engine) |
| Prince (external) | HTML → PDF conversion | **Stable** (required) |

## Gaps and prerequisites

- **No `--no-scripts` flag**: `enableScriptExecution` is always true. Should offer opt-out before 1.0.
- **No tests**: CLI flag handling and error paths are untested.
- **Output path edge case**: If input doesn't end in `.md`, the `.pdf` replacement doesn't work correctly (e.g., `mpe2pdf README` would try to write `README` as the PDF).
- **No `-o`/`--output` flag**: Positional-only output path is less discoverable.

## Out of scope for 1.0

- Custom CSS/theme support
- Watch mode
- Batch conversion (multiple input files)
- Non-Prince PDF backends
