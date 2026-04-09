# Stability

## Stability commitment

Once mpe2pdf reaches 1.0, backwards compatibility becomes a binding contract.
Breaking changes to the CLI interface, MCP tool schema, output behaviour, or
configuration require a new product fork. The pre-1.0 period exists to get
these right.

## Interaction surface catalogue

Snapshot as of v0.4.0.

### CLI flags

| Flag | Type | Default | Stability |
|---|---|---|---|
| `--help` | boolean | — | **Stable** |
| `--help-agent` | boolean | — | **Stable** |
| `--mcp` | boolean | — | **Stable** |
| `--version` | boolean | — | **Stable** |

### Positional arguments

| Position | Meaning | Required | Stability |
|---|---|---|---|
| 1..N | Input `.md` file path(s) | Yes (at least one) | **Stable** |
| last | Output `.pdf` file path | No (only with single input; defaults to input with `.pdf` extension) | **Stable** |

### Output behaviour

| Behaviour | Stability |
|---|---|
| Prints output file path to stdout on success | **Stable** |
| Exit code 0 on success, 1 on error | **Stable** |
| Error messages to stderr | **Stable** |
| `breakOnSingleNewLine: false` — adjacent lines flow as paragraph | **Stable** |
| Script execution enabled in mume engine | **Needs review** — may want an opt-out flag |

### MCP server (`--mcp`)

| Surface | Value | Stability |
|---|---|---|
| Transport | stdio (JSON-RPC) | **Stable** |
| Server name | `mpe2pdf` | **Stable** |
| Protocol version | 2025-03-26 (SDK-determined) | **Needs review** |

### MCP tool: `convert`

| Field | Type | Required | Stability |
|---|---|---|---|
| `files` | array (min 1) | yes | **Stable** |
| `files[].input` | string | yes | **Stable** |
| `files[].output` | string | no | **Stable** |

### Dependencies

| Dependency | Role | Stability |
|---|---|---|
| `@shd101wyy/mume` | Markdown → HTML rendering | **Stable** (core engine) |
| `@modelcontextprotocol/server` | MCP server SDK | **Stable** |
| Prince (external) | HTML → PDF conversion | **Stable** (required) |

## Gaps and prerequisites

- **No `--no-scripts` flag**: `enableScriptExecution` is always true. Should offer opt-out before 1.0.
- **No tests**: CLI flag handling, MCP tool invocation, and error paths are untested.
- **Output path edge case**: If input doesn't end in `.md`, the `.pdf` replacement doesn't work correctly (e.g., `mpe2pdf README` would try to write `README` as the PDF).
- **No `-o`/`--output` flag**: Positional-only output path is less discoverable.
- **MCP protocol version**: Inherited from SDK. Decide whether to document as stable or SDK-dependent.

## Out of scope for 1.0

- Custom CSS/theme support
- Watch mode
- Non-Prince PDF backends
- Programmatic Node.js API
