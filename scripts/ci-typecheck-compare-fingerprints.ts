#!/usr/bin/env node
import fs from "node:fs";
import { diffOccurrences } from "./ci-typecheck-baseline-delta";

type Fingerprint = {
  sha: string;
  errorCount: number;
  signatureCount: number;
  occurrences: Record<string, number>;
};

function load(p: string): Fingerprint {
  return JSON.parse(fs.readFileSync(p, "utf8")) as Fingerprint;
}

const args = process.argv.slice(2);
function flag(name: string): string {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1]) throw new Error(`missing ${name}`);
  return args[i + 1];
}

const base = load(flag("--base"));
const head = load(flag("--head"));
const out = args.includes("--out") ? flag("--out") : undefined;

const { newSignatures, occurrenceIncreases } = diffOccurrences(
  base.occurrences,
  new Map(Object.entries(head.occurrences)),
);

const report = {
  base: { sha: base.sha, errorCount: base.errorCount, signatureCount: base.signatureCount },
  head: { sha: head.sha, errorCount: head.errorCount, signatureCount: head.signatureCount },
  deltaErrors: head.errorCount - base.errorCount,
  newSignatures,
  occurrenceIncreases,
};

console.log(JSON.stringify(report, null, 2));
if (out) fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (
  newSignatures.length > 0 ||
  occurrenceIncreases.length > 0 ||
  head.errorCount > base.errorCount
) {
  console.error("\n❌ FAIL: head regressed vs base under this environment (not type-clean).");
  process.exit(1);
}

console.log("\n✅ PASS: no regression vs base (not type-clean).");
