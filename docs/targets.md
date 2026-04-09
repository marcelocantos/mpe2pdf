# Targets

## Active

(none)

## Achieved

### 🎯T1 mpe2pdf exposes an MCP server mode for AI agent integration
- **Value**: 8
- **Cost**: 5
- **Acceptance**:
  - Running `mpe2pdf --mcp` starts a stdio-based MCP server
  - The server exposes a convert tool that accepts markdown file path(s) and produces PDF(s)
  - The MCP server follows the MCP protocol (JSON-RPC over stdio)
  - Existing CLI mode is unaffected
- **Context**: AI agents (Claude Code, etc.) need to convert Markdown to PDF programmatically. An MCP server mode lets agents call mpe2pdf as a tool without shelling out.
- **Tags**: feature
- **Origin**: user request
- **Status**: Achieved
- **Discovered**: 2026-04-09
- **Achieved**: 2026-04-09
- **Actual-cost**: 3
