#!/usr/bin/env node
/**
 * CI type-check gate with app baseline-delta policy (fail-closed).
 *
 * - tsconfig.node.json: must be clean (any error fails).
 * - tsconfig.app.json: compared to docs/ci/typecheck-app-baseline.json.
 *   Fail closed if tsc crashes, exits non-zero with zero parsed diagnostics,
 *   or spawn fails.
 *   Regression = new file:TSxxxx signature OR higher occurrence count for any
 *   signature OR total errorCount increase. Passing ≠ type-clean.
 *
 * Usage:
 *   npx tsx scripts/ci-typecheck-baseline-delta.ts
 *   npx tsx scripts/ci-typecheck-baseline-delta.ts --write-baseline
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const WRITE_BASELINE = process.argv.includes("--write-baseline");

/** Prefer platform-specific baseline (linux CI vs win32 local), else shared file. */
function resolveBaselinePath(): string {
  const plat = process.platform === "win32" ? "win32" : "linux";
  const specific = path.join(ROOT, "docs/ci", `typecheck-app-baseline.${plat}.json`);
  if (fs.existsSync(specific)) return specific;
  return path.join(ROOT, "docs/ci/typecheck-app-baseline.json");
}

/** v2: occurrence counts per signature (hides fewer swap-in errors). */
export type AppBaseline = {
  version: 2;
  project: "tsconfig.app.json";
  generatedAt: string;
  headNote: string;
  errorCount: number;
  /** Sorted unique "relative/path.ts:TSxxxx" signatures */
  signatures: string[];
  /** Occurrence count per signature (must match sum → errorCount) */
  occurrences: Record<string, number>;
};

const DIAG_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+):/gm;

/** Normalize tsc file paths to stable repo-relative posix form. */
export function toPosixRepoPath(filePath: string): string {
  let file = filePath.replace(/\\/g, "/");
  const srcIdx = file.toLowerCase().indexOf("/src/");
  if (srcIdx !== -1) return file.slice(srcIdx + 1);
  const scriptsIdx = file.toLowerCase().indexOf("/scripts/");
  if (scriptsIdx !== -1) return file.slice(scriptsIdx + 1);
  if (/^[A-Za-z]:\//.test(file)) file = file.replace(/^[A-Za-z]:\//, "");
  if (file.startsWith("./")) file = file.slice(2);
  if (file.startsWith("src/") || file.startsWith("scripts/")) return file;
  return file.replace(/^\/+/, "");
}

export function parseDiagnostics(output: string): {
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
    const rel = toPosixRepoPath(match[1]);
    const sig = `${rel}:${match[4]}`;
    bySignature.set(sig, (bySignature.get(sig) ?? 0) + 1);
  }
  const signatures = [...bySignature.keys()].sort((a, b) => a.localeCompare(b));
  return { errorCount, signatures, bySignature };
}

export type OccurrenceRegression = {
  signature: string;
  baseline: number;
  current: number;
};

/** Compare occurrence maps; returns new signatures and occurrence increases. */
export function diffOccurrences(
  baselineOcc: Record<string, number>,
  current: Map<string, number>,
): { newSignatures: string[]; occurrenceIncreases: OccurrenceRegression[] } {
  const newSignatures: string[] = [];
  const occurrenceIncreases: OccurrenceRegression[] = [];
  for (const [sig, count] of current) {
    const base = baselineOcc[sig];
    if (base === undefined) {
      newSignatures.push(sig);
    } else if (count > base) {
      occurrenceIncreases.push({ signature: sig, baseline: base, current: count });
    }
  }
  newSignatures.sort((a, b) => a.localeCompare(b));
  occurrenceIncreases.sort((a, b) => a.signature.localeCompare(b.signature));
  return { newSignatures, occurrenceIncreases };
}

function runTsc(project: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnError: string | null;
} {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tsc", "-p", project, "--noEmit", "--pretty", "false"],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === "win32",
      env: { ...process.env, FORCE_COLOR: "0" },
    },
  );
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    spawnError: result.error ? String(result.error.message ?? result.error) : null,
  };
}

function normalizeSignature(s: string): string {
  const lastColon = s.lastIndexOf(":TS");
  if (lastColon === -1) return toPosixRepoPath(s);
  return `${toPosixRepoPath(s.slice(0, lastColon))}${s.slice(lastColon)}`;
}

function loadBaseline(): AppBaseline {
  const BASELINE_PATH = resolveBaselinePath();
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`❌ Missing baseline: ${BASELINE_PATH}`);
    console.error("   Run: npx tsx scripts/ci-typecheck-baseline-delta.ts --write-baseline");
    process.exit(2);
  }
  console.log(`   baseline file: ${path.relative(ROOT, BASELINE_PATH)}`);
  const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as Partial<AppBaseline> & {
    version?: number;
    signatures?: string[];
    errorCount?: number;
    occurrences?: Record<string, number>;
  };

  if (!Array.isArray(raw.signatures) || typeof raw.errorCount !== "number") {
    console.error(`❌ Invalid baseline format: ${BASELINE_PATH}`);
    process.exit(2);
  }

  // v1 → v2: unique signatures only (count 1) undercounts multiples — refuse silent soften.
  if (raw.version === 1 || raw.occurrences === undefined) {
    console.error(`❌ Baseline is v1 / missing occurrences: ${BASELINE_PATH}`);
    console.error("   Occurrence fingerprints are required (fail-closed). Refresh on Linux/CI:");
    console.error("   npm run type-check:baseline");
    process.exit(2);
  }

  if (raw.version !== 2) {
    console.error(`❌ Unsupported baseline version ${String(raw.version)}: ${BASELINE_PATH}`);
    process.exit(2);
  }

  const occurrences: Record<string, number> = {};
  for (const [sig, n] of Object.entries(raw.occurrences)) {
    const key = normalizeSignature(sig);
    if (typeof n !== "number" || n < 1) {
      console.error(`❌ Invalid occurrence for ${sig}: ${String(n)}`);
      process.exit(2);
    }
    occurrences[key] = (occurrences[key] ?? 0) + n;
  }

  const signatures = Object.keys(occurrences).sort((a, b) => a.localeCompare(b));
  const occSum = Object.values(occurrences).reduce((a, b) => a + b, 0);
  if (occSum !== raw.errorCount) {
    console.error(
      `❌ Baseline inconsistency: errorCount=${raw.errorCount} but occurrences sum=${occSum}`,
    );
    process.exit(2);
  }

  return {
    version: 2,
    project: "tsconfig.app.json",
    generatedAt: raw.generatedAt ?? "",
    headNote: raw.headNote ?? "",
    errorCount: raw.errorCount,
    signatures,
    occurrences,
  };
}

function writeBaseline(parsed: ReturnType<typeof parseDiagnostics>): void {
  const occurrences: Record<string, number> = {};
  for (const [sig, n] of parsed.bySignature) {
    occurrences[normalizeSignature(sig)] = n;
  }
  const signatures = Object.keys(occurrences).sort((a, b) => a.localeCompare(b));
  const baseline: AppBaseline = {
    version: 2,
    project: "tsconfig.app.json",
    generatedAt: new Date().toISOString(),
    headNote:
      `v2 baseline with per-signature occurrence counts (generated on ${process.platform}). ` +
      `Prefer regenerating on Linux/CI (npm run type-check:baseline). Not type-clean.`,
    errorCount: parsed.errorCount,
    signatures,
    occurrences,
  };
  const plat = process.platform === "win32" ? "win32" : "linux";
  const targets = [
    path.join(ROOT, "docs/ci", `typecheck-app-baseline.${plat}.json`),
    path.join(ROOT, "docs/ci/typecheck-app-baseline.json"),
  ];
  for (const BASELINE_PATH of targets) {
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    console.log(`✅ Wrote baseline → ${path.relative(ROOT, BASELINE_PATH)}`);
  }
  console.log(
    `   errorCount=${baseline.errorCount} uniqueSignatures=${baseline.signatures.length}`,
  );
}

function main(): void {
  console.log("🔍 CI type-check (node clean + app baseline-delta, fail-closed)");
  console.log("=".repeat(60));

  // 1) Node project — must be clean
  console.log("\n1️⃣  tsc -p tsconfig.node.json --noEmit");
  const node = runTsc("tsconfig.node.json");
  if (node.spawnError) {
    console.error(`❌ FAIL: could not spawn tsc (node): ${node.spawnError}`);
    process.exit(1);
  }
  if (node.exitCode !== 0) {
    const combined = `${node.stdout}\n${node.stderr}`.trim();
    console.error(combined || "(no tsc output)");
    console.error("\n❌ FAIL: tsconfig.node.json has type errors (must be clean).");
    process.exit(1);
  }
  console.log("   ✅ node project clean");

  // 2) App project — fail-closed parse, then baseline delta
  console.log("\n2️⃣  tsc -p tsconfig.app.json --noEmit");
  const app = runTsc("tsconfig.app.json");
  if (app.spawnError) {
    console.error(`❌ FAIL: could not spawn tsc (app): ${app.spawnError}`);
    process.exit(1);
  }

  const combined = `${app.stdout}\n${app.stderr}`;
  const parsed = parseDiagnostics(combined);

  // Fail closed: non-zero exit with zero recognized diagnostics = crash / config / unparsed
  if (app.exitCode !== 0 && parsed.errorCount === 0) {
    console.error(combined.trim() || "(no tsc output)");
    console.error(
      "\n❌ FAIL: app tsc exited non-zero but produced zero parsed diagnostics (fail-closed).",
    );
    console.error(`   exitCode=${app.exitCode}`);
    process.exit(1);
  }

  // Unexpected: clean exit but we parsed errors (should not happen with tsc)
  if (app.exitCode === 0 && parsed.errorCount > 0) {
    console.error(
      `\n❌ FAIL: app tsc exit 0 but parsed ${parsed.errorCount} diagnostics (inconsistent).`,
    );
    process.exit(1);
  }

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

  // Type-clean app
  if (app.exitCode === 0 && parsed.errorCount === 0) {
    console.log("\n✅ PASS: app + node type-clean.");
    process.exit(0);
  }

  const baseline = loadBaseline();
  const { newSignatures, occurrenceIncreases } = diffOccurrences(
    baseline.occurrences,
    parsed.bySignature,
  );
  const countDelta = parsed.errorCount - baseline.errorCount;

  console.log(`   current errors:  ${parsed.errorCount}`);
  console.log(
    `   baseline errors: ${baseline.errorCount} (delta ${countDelta >= 0 ? "+" : ""}${countDelta})`,
  );
  console.log(`   current unique signatures:  ${parsed.signatures.length}`);
  console.log(`   baseline unique signatures: ${baseline.signatures.length}`);
  console.log(`   new signatures vs baseline: ${newSignatures.length}`);
  console.log(`   occurrence increases:       ${occurrenceIncreases.length}`);

  const countRegressed = parsed.errorCount > baseline.errorCount;
  const signatureRegressed = newSignatures.length > 0;
  const occurrenceRegressed = occurrenceIncreases.length > 0;

  if (countRegressed || signatureRegressed || occurrenceRegressed) {
    console.error("\n❌ FAIL: app type-check regressed vs baseline (not requiring type-clean).");
    if (countRegressed) {
      console.error(
        `   Error count ${parsed.errorCount} > baseline ${baseline.errorCount} (+${parsed.errorCount - baseline.errorCount}).`,
      );
    }
    if (signatureRegressed) {
      console.error(`   New file:code signatures (${newSignatures.length}):`);
      for (const sig of newSignatures.slice(0, 40)) {
        console.error(`     + ${sig} (×${parsed.bySignature.get(sig) ?? 1})`);
      }
      if (newSignatures.length > 40) {
        console.error(`     … and ${newSignatures.length - 40} more`);
      }
    }
    if (occurrenceRegressed) {
      console.error(`   Higher occurrence counts (${occurrenceIncreases.length}):`);
      for (const row of occurrenceIncreases.slice(0, 40)) {
        console.error(
          `     + ${row.signature}: ${row.baseline} → ${row.current} (+${row.current - row.baseline})`,
        );
      }
      if (occurrenceIncreases.length > 40) {
        console.error(`     … and ${occurrenceIncreases.length - 40} more`);
      }
    }
    console.error("\n   Fix new errors, or intentionally refresh on Linux/CI:");
    console.error("   npm run type-check:baseline");
    process.exit(1);
  }

  console.log(
    `\n✅ PASS: no new app errors vs baseline (count ${parsed.errorCount} ≤ ${baseline.errorCount}; occurrences held). Not type-clean.`,
  );
  process.exit(0);
}

const invokedAsCli =
  typeof process.argv[1] === "string" &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsCli) {
  main();
}
