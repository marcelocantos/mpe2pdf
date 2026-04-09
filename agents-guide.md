# mpe2pdf Agent Guide

mpe2pdf converts GitHub-flavoured Markdown to PDF with full support for:

- Mermaid diagrams (` ```mermaid ` code blocks)
- KaTeX/MathJax math (`$...$` and `$$...$$`)
- Syntax-highlighted code blocks
- Tables, task lists, footnotes
- All standard GFM features

The rendering engine is @shd101wyy/mume — the same engine used by the
VS Code "Markdown Preview Enhanced" extension. Prince handles HTML-to-PDF
conversion, producing high-quality typeset output.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Prince](https://www.princexml.com/) installed and on PATH

## CLI Examples

```bash
mpe2pdf report.md                    # produces report.pdf
mpe2pdf report.md output.pdf         # explicit output path
mpe2pdf ch1.md ch2.md ch3.md         # batch: produces ch1.pdf, ch2.pdf, ch3.pdf
```

## MCP Server Mode

Run `mpe2pdf --mcp` to start a stdio-based MCP server. This allows AI
agents to invoke PDF conversion as a tool over the Model Context Protocol.

### Configuration

Add to your Claude Code MCP config (`.mcp.json` or `~/.claude.json`):

```json
{
  "mcpServers": {
    "mpe2pdf": {
      "command": "mpe2pdf",
      "args": ["--mcp"]
    }
  }
}
```

### Tool: `convert`

Converts one or more Markdown files to PDF.

**Parameters:**

| Field          | Type   | Required | Description                                      |
|----------------|--------|----------|--------------------------------------------------|
| `files`        | array  | yes      | Array of file objects to convert                  |
| `files[].input`  | string | yes    | Absolute path to a `.md` file                    |
| `files[].output` | string | no     | Output PDF path (defaults to input with `.pdf`)  |

**Example call:**

```json
{
  "files": [
    { "input": "/path/to/report.md" },
    { "input": "/path/to/notes.md", "output": "/tmp/notes.pdf" }
  ]
}
```

## Security note

mpe2pdf runs with `enableScriptExecution: true` in the mume engine,
which allows embedded scripts in Markdown files to execute. Only convert
trusted Markdown files.
