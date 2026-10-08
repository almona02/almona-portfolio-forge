#!/usr/bin/env node
/**
 * CI type-check gate with app baseline-delta policy.
 *
 * - tsconfig.node.json: must be clean (any error fails).
 * - tsconfig.app.json: compared to docs/ci/typecheck-app-baseline.json.
 *   Fails only when error count increases OR a new file:TSxxxx signature appears.
 *   Count ≤ baseline with no new signatures → pass (not a type-clean claim).
 *
 * Usage:
 *   npx tsx scripts/ci-typecheck-baseline-delta.ts
 *   npx tsx scripts/ci-typecheck-baseline-delta.ts --write-baseline
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, "docs/ci/typecheck-app-baseline.json");
const WRITE_BASELINE = process.argv.includes("--write-baseline");

/** Stable fingerprint: posix path + error code (line/col ignored). */
export type AppBaseline = {
  version: 1;
  project: "tsconfig.app.json";
  generatedAt: string;
  headNote: string;
  errorCount: number;
  /** Sorted unique "relative/path.ts:TSxxxx" signatures */
  signatures: string[];
};

const DIAG_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+):/gm;

function runTsc(project: string): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsc", "-p", project, "--noEmit"],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === "win32",
    },
  );
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseDiagnostics(output: string): {
  errorCount: number;
  signatures: string[];
  bySignature: Map<string, number>;
} {
  const bySignature = new Map<string, number>();
  let errorCount = 0;
  DIAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DIAG_RE.exec(output)) !== null) {
    errorCount += 1;
    const file = match[1].replace(/\\/g, "/");
    // Prefer repo-relative paths (strip absolute prefixes if present)
    const rel = file.includes("/src/")
      ? file.slice(file.indexOf("src/"))
      : file.includes("/scripts/")
        ? file.slice(file.indexOf("scripts/"))
        : file.replace(/^[A-Za-z]:\//, "");
    const sig = `${rel}:${match[4]}`;
    bySignature.set(sig, (bySignature.get(sig) ?? 0) + 1);
  }
  const signatures = [...bySignature.keys()].sort((a, b) => a.localeCompare(b));
  return { errorCount, signatures, bySignature };
}

function loadBaseline(): AppBaseline {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`❌ Missing baseline: ${BASELINE_PATH}`);
    console.error("   Run: npx tsx scripts/ci-typecheck-baseline-delta.ts --write-baseline");
    process.exit(2);
  }
  const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as AppBaseline;
  if (raw.version !== 1 || !Array.isArray(raw.signatures) || typeof raw.errorCount !== "number") {
    console.error(`❌ Invalid baseline format: ${BASELINE_PATH}`);
    process.exit(2);
  }
  return raw;
}

function writeBaseline(parsed: ReturnType<typeof parseDiagnostics>): void {
  const baseline: AppBaseline = {
    version: 1,
    project: "tsconfig.app.json",
    generatedAt: new Date().toISOString(),
    headNote:
      "Baseline for CI delta gate. Not a type-clean claim. Reduce over time; refresh with --write-baseline after intentional debt paydown.",
    errorCount: parsed.errorCount,
    signatures: parsed.signatures,
  };
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`✅ Wrote baseline → ${path.relative(ROOT, BASELINE_PATH)}`);
  console.log(`   errorCount=${baseline.errorCount} uniqueSignatures=${baseline.signatures.length}`);
}

function main(): void {
  console.log("🔍 CI type-check (node clean + app baseline-delta)");
  console.log("=".repeat(60));

  // 1) Node project — must be clean
  console.log("\n1️⃣  tsc -p tsconfig.node.json --noEmit");
  const node = runTsc("tsconfig.node.json");
  if (node.exitCode !== 0) {
    const combined = `${node.stdout}\n${node.stderr}`.trim();
    console.error(combined || "(no tsc output)");
    console.error("\n❌ FAIL: tsconfig.node.json has type errors (must be clean).");
    process.exit(1);
  }
  console.log("   ✅ node project clean");

  // 2) App project — baseline delta
  console.log("\n2️⃣  tsc -p tsconfig.app.json --noEmit");
  const app = runTsc("tsconfig.app.json");
  const combined = `${app.stdout}\n${app.stderr}`;
  const parsed = parseDiagnostics(combined);

  if (WRITE_BASELINE) {
    writeBaseline(parsed);
    if (parsed.errorCount === 0 && app.exitCode === 0) {
      console.log("\n✅ App is type-clean; baseline written with errorCount=0.");
    } else {
      console.log(
        `\n⚠️  Baseline recorded with ${parsed.errorCount} errors (not type-clean). CI will fail only on regressions.`,
      );
    }
    process.exit(0);
  }

  const baseline = loadBaseline();
  const baselineSet = new Set(baseline.signatures);
  const newSignatures = parsed.signatures.filter((s) => !baselineSet.has(s));
  const countDelta = parsed.errorCount - baseline.errorCount;

  console.log(`   current errors:  ${parsed.errorCount}`);
  console.log(`   baseline errors: ${baseline.errorCount} (delta ${countDelta >= 0 ? "+" : ""}${countDelta})`);
  console.log(`   current unique signatures:  ${parsed.signatures.length}`);
  console.log(`   baseline unique signatures: ${baseline.signatures.length}`);
  console.log(`   new signatures vs baseline: ${newSignatures.length}`);

  const countRegressed = parsed.errorCount > baseline.errorCount;
  const signatureRegressed = newSignatures.length > 0;

  if (countRegressed || signatureRegressed) {
    console.error("\n❌ FAIL: app type-check regressed vs baseline (not requiring type-clean).");
    if (countRegressed) {
      console.error(
        `   Error count ${parsed.errorCount} > baseline ${baseline.errorCount} (+${parsed.errorCount - baseline.errorCount}).`,
      );
    }
    if (signatureRegressed) {
      console.error(`   New file:code signatures (${newSignatures.length}):`);
      for (const sig of newSignatures.slice(0, 40)) {
        console.error(`     + ${sig}`);
      }
      if (newSignatures.length > 40) {
        console.error(`     … and ${newSignatures.length - 40} more`);
      }
    }
    console.error("\n   Fix new errors, or intentionally refresh:");
    console.error("   npx tsx scripts/ci-typecheck-baseline-delta.ts --write-baseline");
    process.exit(1);
  }

  if (parsed.errorCount === 0) {
    console.log("\n✅ PASS: app + node type-clean.");
  } else {
    console.log(
      `\n✅ PASS: no new app errors vs baseline (count ${parsed.errorCount} ≤ ${baseline.errorCount}). Not type-clean.`,
    );
  }
  process.exit(0);
}

main();
