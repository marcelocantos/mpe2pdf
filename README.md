# mpe2pdf

Convert Markdown to PDF using the
[Markdown Preview Enhanced](https://shd101wyy.github.io/markdown-preview-enhanced/)
engine ([mume](https://github.com/shd101wyy/mume)) and
[Prince](https://www.princexml.com/).

The output matches what you see in VS Code's Markdown Preview Enhanced
extension — including Mermaid diagrams, KaTeX math, syntax-highlighted code
blocks, tables, task lists, and footnotes.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Prince](https://www.princexml.com/) installed and on `PATH`

## Installation

```bash
npm install -g mpe2pdf
```

Or run directly with npx:

```bash
npx mpe2pdf input.md
```

## Usage

```bash
mpe2pdf input.md                # produces input.pdf
mpe2pdf input.md output.pdf     # explicit output path
```

### Options

| Flag | Description |
|---|---|
| `--help` | Show usage information |
| `--help-agent` | Show usage + agent integration guide |
| `--version` | Print version number |

## How it works

1. mume renders the Markdown to HTML with full GFM support, Mermaid diagrams,
   and math rendering — the same pipeline as VS Code Markdown Preview Enhanced.
2. Prince converts the HTML to a typeset PDF.

## Security

mpe2pdf runs with script execution enabled in the mume engine, so embedded
scripts in Markdown files will execute. Only convert files you trust.

## Agent integration

If you use an agentic coding tool, run `mpe2pdf --help-agent` or include
[`agents-guide.md`](agents-guide.md) in your project context.

## License

Apache 2.0 — see [LICENSE](LICENSE).
