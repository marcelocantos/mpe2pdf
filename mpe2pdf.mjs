#!/usr/bin/env node

// Copyright 2026 Marcelo Cantos
// SPDX-License-Identifier: Apache-2.0

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import * as mume from "@shd101wyy/mume";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
const { version: VERSION } = require("./package.json");

// mume's ESM build doesn't auto-detect its own resource directory,
// so styles/dependencies fail to load without this.
const mumeOut = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve("@shd101wyy/mume"))),
  "..",
);
mume.utility.setExtentensionDirectoryPath(mumeOut);

let mumeInitialised = false;

async function ensureMumeInit() {
  if (!mumeInitialised) {
    await mume.init();
    mumeInitialised = true;
  }
}

async function convertOne(inputPath, outputPath) {
  await ensureMumeInit();

  const engine = new mume.MarkdownEngine({
    filePath: inputPath,
    config: {
      princeExePath: "prince",
      enableScriptExecution: true,
      breakOnSingleNewLine: false,
    },
  });

  await engine.princeExport({ openFileAfterGeneration: false });

  // mume writes the PDF next to the source file with .pdf extension.
  // Move it to the desired output path if different.
  const mumeOutput = inputPath.replace(/\.md$/, ".pdf");
  if (mumeOutput !== outputPath) {
    fs.renameSync(mumeOutput, outputPath);
  }

  return outputPath;
}

// --------------- MCP server mode ---------------

async function runMcpServer() {
  const { McpServer, StdioServerTransport } = await import(
    "@modelcontextprotocol/server"
  );
  const { z } = await import("zod");

  const server = new McpServer({
    name: "mpe2pdf",
    version: VERSION,
  });

  server.registerTool(
    "convert",
    {
      title: "Convert Markdown to PDF",
      description:
        "Convert one or more Markdown files to PDF using Markdown Preview Enhanced styling via mume + Prince.",
      inputSchema: z.object({
        files: z
          .array(
            z.object({
              input: z.string().describe("Absolute path to a .md file"),
              output: z
                .string()
                .optional()
                .describe(
                  "Output PDF path (defaults to input with .pdf extension)",
                ),
            }),
          )
          .min(1)
          .describe("Files to convert"),
      }),
    },
    async ({ files }) => {
      const results = [];
      const errors = [];

      for (const { input, output } of files) {
        const inputPath = path.resolve(input);
        const outputPath = output
          ? path.resolve(output)
          : inputPath.replace(/\.md$/, ".pdf");

        if (!fs.existsSync(inputPath)) {
          errors.push(`File not found: ${inputPath}`);
          continue;
        }

        try {
          const result = await convertOne(inputPath, outputPath);
          results.push(result);
        } catch (err) {
          errors.push(`${inputPath}: ${err.message || err}`);
        }
      }

      const lines = [];
      if (results.length > 0) {
        lines.push(`Converted ${results.length} file(s):`);
        for (const r of results) lines.push(`  ${r}`);
      }
      if (errors.length > 0) {
        lines.push(`Errors:`);
        for (const e of errors) lines.push(`  ${e}`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        isError: errors.length > 0 && results.length === 0,
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`mpe2pdf MCP server v${VERSION} running on stdio`);
}

// --------------- CLI mode ---------------

function usage(stream = process.stdout) {
  stream.write(`Usage: mpe2pdf [options] <input.md...> [output.pdf]

Convert Markdown to PDF using mume (Markdown Preview Enhanced engine) + Prince.

Options:
  --help          Show this help message
  --help-agent    Show help text and agent guide
  --mcp           Run as an MCP (Model Context Protocol) server on stdio
  --version       Show version number

Multiple input files can be specified; each produces a .pdf alongside the source.
An explicit output path is only allowed with a single input file.

Requires Prince (https://www.princexml.com/) to be installed and on PATH.
`);
}

function helpAgent() {
  usage();
  const guide = fs.readFileSync(path.join(__dirname, "agents-guide.md"), "utf8");
  process.stdout.write("\n" + guide);
}

const args = process.argv.slice(2);

if (args.includes("--help")) {
  usage();
  process.exit(0);
}

if (args.includes("--help-agent")) {
  helpAgent();
  process.exit(0);
}

if (args.includes("--version")) {
  console.log(VERSION);
  process.exit(0);
}

if (args.includes("--mcp")) {
  runMcpServer().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
} else {
  const positional = args.filter((a) => !a.startsWith("-"));

  if (positional.length < 1) {
    usage(process.stderr);
    process.exit(1);
  }

  // Determine input files and optional explicit output path.
  // If the last positional arg ends in .pdf and there are at least 2 args,
  // treat it as an explicit output path (single-input mode only).
  let inputPaths;
  let explicitOutput = null;

  if (
    positional.length >= 2 &&
    positional[positional.length - 1].endsWith(".pdf")
  ) {
    if (positional.length > 2) {
      console.error(
        "Error: explicit output path is only allowed with a single input file",
      );
      process.exit(1);
    }
    inputPaths = [path.resolve(positional[0])];
    explicitOutput = path.resolve(positional[1]);
  } else {
    inputPaths = positional.map((p) => path.resolve(p));
  }

  for (const p of inputPaths) {
    if (!fs.existsSync(p)) {
      console.error(`Error: file not found: ${p}`);
      process.exit(1);
    }
  }

  (async () => {
    for (const inputPath of inputPaths) {
      const outputPath =
        explicitOutput || inputPath.replace(/\.md$/, ".pdf");
      const result = await convertOne(inputPath, outputPath);
      console.log(result);
    }
    process.exit(0);
  })().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
