#!/usr/bin/env node
/**
 * Emit JSON fingerprint from a tsc --pretty false log (or run tsc).
 * Usage:
 *   npx tsx scripts/ci-typecheck-emit-fingerprint.ts --from-log path.txt --out path.json --sha abc
 *   npx tsx scripts/ci-typecheck-emit-fingerprint.ts --run --out path.json
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseDiagnostics } from "./ci-typecheck-baseline-delta";

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const fromLog = flag("--from-log");
const out = flag("--out") ?? "typecheck-fingerprint.json";
const sha = flag("--sha") ?? process.env.GITHUB_SHA ?? "unknown";
const run = args.includes("--run");

let text: string;
if (fromLog) {
  text = fs.readFileSync(fromLog, "utf8");
} else if (run) {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsc", "-p", "tsconfig.app.json", "--noEmit", "--pretty", "false"],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === "win32",
      env: { ...process.env, FORCE_COLOR: "0" },
    },
  );
  text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if ((result.status ?? 1) !== 0 && !text.includes("error TS")) {
    console.error(text);
    console.error("tsc failed with no parsed diagnostics");
    process.exit(1);
  }
} else {
  console.error("Need --from-log <file> or --run");
  process.exit(2);
}

const parsed = parseDiagnostics(text);
const occurrences = Object.fromEntries(parsed.bySignature);
const payload = {
  sha,
  errorCount: parsed.errorCount,
  signatureCount: parsed.signatures.length,
  occurrences,
};
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${out}: errors=${payload.errorCount} signatures=${payload.signatureCount}`);
