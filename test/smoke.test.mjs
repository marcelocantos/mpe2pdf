// Copyright 2026 Marcelo Cantos
// SPDX-License-Identifier: Apache-2.0

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import fs from "fs";
import path from "path";
import os from "os";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

async function extractText(pdfPath) {
  const doc = await getDocument(pdfPath).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n");
}

const execFileP = promisify(execFile);
const CLI = path.resolve("mpe2pdf.mjs");

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mpe2pdf-test-"));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---- CLI flag tests ----

describe("CLI flags", () => {
  it("--help exits 0 and prints usage", async () => {
    const { stdout } = await execFileP("node", [CLI, "--help"]);
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /--help/);
    assert.match(stdout, /--mcp/);
  });

  it("--version prints a semver string", async () => {
    const { stdout } = await execFileP("node", [CLI, "--version"]);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  it("--help-agent includes agent guide content", async () => {
    const { stdout } = await execFileP("node", [CLI, "--help-agent"]);
    assert.match(stdout, /Usage:/);
    assert.match(stdout, /Agent Guide/i);
  });

  it("exits 1 with usage on stderr when no args given", async () => {
    await assert.rejects(
      () => execFileP("node", [CLI]),
      (err) => {
        assert.equal(err.code, 1);
        assert.match(err.stderr, /Usage:/);
        return true;
      },
    );
  });

  it("exits 1 for a missing input file", async () => {
    await assert.rejects(
      () => execFileP("node", [CLI, "/nonexistent/file.md"]),
      (err) => {
        assert.equal(err.code, 1);
        assert.match(err.stderr, /file not found/i);
        return true;
      },
    );
  });
});

// ---- Conversion tests ----

describe("Markdown to PDF conversion", () => {
  it("converts a simple markdown file and produces valid PDF", async () => {
    const mdPath = path.join(tmpDir, "simple.md");
    const pdfPath = path.join(tmpDir, "simple.pdf");
    fs.writeFileSync(
      mdPath,
      "# Hello World\n\nThis is a test paragraph with **bold** and *italic* text.\n",
    );

    const { stdout } = await execFileP("node", [CLI, mdPath], {
      timeout: 30000,
    });
    assert.equal(stdout.trim(), pdfPath);
    assert.ok(fs.existsSync(pdfPath), "PDF file should exist");

    const text = await extractText(pdfPath);
    assert.match(text, /Hello World/);
    assert.match(text, /test paragraph/);
    assert.match(text, /bold/);
  });

  it("converts to an explicit output path", async () => {
    const mdPath = path.join(tmpDir, "explicit.md");
    const pdfPath = path.join(tmpDir, "custom-output.pdf");
    fs.writeFileSync(mdPath, "# Custom Output\n\nContent here.\n");

    const { stdout } = await execFileP("node", [CLI, mdPath, pdfPath], {
      timeout: 30000,
    });
    assert.equal(stdout.trim(), pdfPath);
    assert.ok(fs.existsSync(pdfPath), "PDF at custom path should exist");

    const text = await extractText(pdfPath);
    assert.match(text, /Custom Output/);
  });

  it("batch-converts multiple files", async () => {
    const paths = ["batch1.md", "batch2.md"].map((name) =>
      path.join(tmpDir, name),
    );
    fs.writeFileSync(paths[0], "# First\n\nFile one.\n");
    fs.writeFileSync(paths[1], "# Second\n\nFile two.\n");

    const { stdout } = await execFileP("node", [CLI, ...paths], {
      timeout: 30000,
    });
    const outputLines = stdout.trim().split("\n");
    assert.equal(outputLines.length, 2);

    for (const line of outputLines) {
      assert.ok(fs.existsSync(line.trim()), `${line} should exist`);
    }

    const text1 = await extractText(paths[0].replace(/\.md$/, ".pdf"));
    assert.match(text1, /First/);
    assert.match(text1, /File one/);

    const text2 = await extractText(paths[1].replace(/\.md$/, ".pdf"));
    assert.match(text2, /Second/);
  });

  it("paragraph reflow: adjacent lines merge into one paragraph", async () => {
    const mdPath = path.join(tmpDir, "reflow.md");
    fs.writeFileSync(
      mdPath,
      "Line one of paragraph.\nLine two of paragraph.\nLine three of paragraph.\n",
    );

    await execFileP("node", [CLI, mdPath], { timeout: 30000 });

    const text = await extractText(path.join(tmpDir, "reflow.pdf"));
    // All three lines should appear as continuous text (no <br> breaks).
    // pdfjs extracts text with spaces between items, so they should be
    // on the same logical line or separated only by spaces.
    assert.match(text, /Line one.*Line two.*Line three/s);
  });
});

// ---- MCP server tests ----

describe("MCP server", () => {
  function sendJsonRpc(proc, obj) {
    proc.stdin.write(JSON.stringify(obj) + "\n");
  }

  function readResponses(proc, count, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const responses = [];
      let buf = "";
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${count} responses`)),
        timeout,
      );

      proc.stdout.on("data", (chunk) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (line.trim()) {
            responses.push(JSON.parse(line));
            if (responses.length >= count) {
              clearTimeout(timer);
              resolve(responses);
            }
          }
        }
      });

      proc.stdout.on("end", () => {
        clearTimeout(timer);
        if (responses.length >= count) resolve(responses);
        else reject(new Error(`Stream ended with only ${responses.length}/${count} responses`));
      });
    });
  }

  it("initializes and lists the convert tool", async () => {
    const proc = spawn("node", [CLI, "--mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const responsePromise = readResponses(proc, 2);

    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const responses = await responsePromise;
    proc.kill();

    // Initialize response
    assert.equal(responses[0].id, 1);
    assert.equal(responses[0].result.serverInfo.name, "mpe2pdf");
    assert.ok(responses[0].result.capabilities.tools);

    // Tools list response
    assert.equal(responses[1].id, 2);
    const tools = responses[1].result.tools;
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "convert");
    assert.ok(tools[0].inputSchema.properties.files);
  });

  it("converts a file via the convert tool", async () => {
    const mdPath = path.join(tmpDir, "mcp-convert.md");
    fs.writeFileSync(mdPath, "# MCP Test\n\nConverted via MCP.\n");

    const proc = spawn("node", [CLI, "--mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const responsePromise = readResponses(proc, 2, 30000);

    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "convert",
        arguments: {
          files: [{ input: mdPath }],
        },
      },
    });

    const responses = await responsePromise;
    proc.kill();

    const callResult = responses[1];
    assert.equal(callResult.id, 2);
    assert.match(callResult.result.content[0].text, /Converted 1 file/);

    const pdfPath = mdPath.replace(/\.md$/, ".pdf");
    assert.ok(fs.existsSync(pdfPath), "PDF should be created via MCP");

    const text = await extractText(pdfPath);
    assert.match(text, /MCP Test/);
  });
});
