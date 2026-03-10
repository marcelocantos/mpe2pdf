# mpe2pdf

Node.js CLI tool that converts Markdown to PDF via mume + Prince.

## Architecture

Single-file CLI (`mpe2pdf.mjs`) — no build step. Uses ES modules.

- **mume** — Markdown Preview Enhanced rendering engine (Markdown → HTML)
- **Prince** — HTML → PDF conversion (external binary, must be on PATH)

## Key files

| File | Purpose |
|---|---|
| `mpe2pdf.mjs` | CLI entry point and conversion logic |
| `agents-guide.md` | Agent integration guide (read by `--help-agent`) |
| `package.json` | Single source of truth for version |

## Development

```bash
npm install
node mpe2pdf.mjs --help
```

## Delivery

Merged to master.

## TODOs

`docs/TODO.md`
