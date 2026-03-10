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

function usage(stream = process.stdout) {
  stream.write(`Usage: mpe2pdf [options] <input.md> [output.pdf]

Convert Markdown to PDF using mume (Markdown Preview Enhanced engine) + Prince.

Options:
  --help          Show this help message
  --help-agent    Show help text and agent guide
  --version       Show version number

If output.pdf is omitted, it defaults to the input filename with a .pdf extension.

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

const positional = args.filter((a) => !a.startsWith("-"));

if (positional.length < 1) {
  usage(process.stderr);
  process.exit(1);
}

const inputPath = path.resolve(positional[0]);
const outputPath = positional[1]
  ? path.resolve(positional[1])
  : inputPath.replace(/\.md$/, ".pdf");

if (!fs.existsSync(inputPath)) {
  console.error(`Error: file not found: ${inputPath}`);
  process.exit(1);
}

async function main() {
  await mume.init();

  const engine = new mume.MarkdownEngine({
    filePath: inputPath,
    config: {
      princeExePath: "prince",
      enableScriptExecution: true,
    },
  });

  await engine.princeExport({ openFileAfterGeneration: false });

  // mume writes the PDF next to the source file with .pdf extension.
  // Move it to the desired output path if different.
  const mumeOutput = inputPath.replace(/\.md$/, ".pdf");
  if (mumeOutput !== outputPath) {
    fs.renameSync(mumeOutput, outputPath);
  }

  console.log(outputPath);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
