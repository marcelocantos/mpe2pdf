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

## Examples

```bash
mpe2pdf report.md                    # produces report.pdf
mpe2pdf report.md output.pdf         # explicit output path
```

## Security note

mpe2pdf runs with `enableScriptExecution: true` in the mume engine,
which allows embedded scripts in Markdown files to execute. Only convert
trusted Markdown files.
