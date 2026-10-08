import { describe, expect, it } from "vitest";
import {
  diffOccurrences,
  parseDiagnostics,
  toPosixRepoPath,
} from "./ci-typecheck-baseline-delta";

describe("ci-typecheck-baseline-delta", () => {
  it("normalizes windows and absolute paths to posix repo paths", () => {
    expect(toPosixRepoPath("C:\\projects\\app\\src\\foo.ts")).toBe("src/foo.ts");
    expect(toPosixRepoPath("/home/runner/work/repo/src/foo.ts")).toBe("src/foo.ts");
    expect(toPosixRepoPath("src/foo.ts")).toBe("src/foo.ts");
  });

  it("parses diagnostics with occurrence counts", () => {
    const out = [
      "src/a.ts(1,1): error TS2322: Type 'x' is not assignable",
      "src/a.ts(2,1): error TS2322: Type 'y' is not assignable",
      "src/b.ts(1,1): error TS2339: Property missing",
    ].join("\n");
    const parsed = parseDiagnostics(out);
    expect(parsed.errorCount).toBe(3);
    expect(parsed.bySignature.get("src/a.ts:TS2322")).toBe(2);
    expect(parsed.bySignature.get("src/b.ts:TS2339")).toBe(1);
  });

  it("detects new signatures and occurrence increases", () => {
    const baseline = { "src/a.ts:TS2322": 1, "src/b.ts:TS2339": 1 };
    const current = new Map([
      ["src/a.ts:TS2322", 2],
      ["src/b.ts:TS2339", 1],
      ["src/c.ts:TS2304", 1],
    ]);
    const { newSignatures, occurrenceIncreases } = diffOccurrences(baseline, current);
    expect(newSignatures).toEqual(["src/c.ts:TS2304"]);
    expect(occurrenceIncreases).toEqual([
      { signature: "src/a.ts:TS2322", baseline: 1, current: 2 },
    ]);
  });

  it("treats zero parsed diagnostics as empty (caller fail-closes on exit)", () => {
    const parsed = parseDiagnostics("error TS5083: Cannot read file tsconfig.app.json");
    // Unparsed config lines that do not match file(line,col) form
    expect(parsed.errorCount).toBe(0);
  });
});
