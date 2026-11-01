import { readFile } from 'node:fs/promises';

// Run npm run lint:report first, or pass another ESLint JSON report path.
const report = JSON.parse(await readFile(process.argv[2] ?? '.eslint-report.json', 'utf8'));
if (!Array.isArray(report) || report.some(file =>
  typeof file.filePath !== 'string' || !Array.isArray(file.messages) ||
  !Number.isInteger(file.errorCount) || !Number.isInteger(file.warningCount)
)) {
  throw new Error('Expected an ESLint JSON results array');
}
const rules = new Map();
for (const file of report) {
  for (const message of file.messages) {
    const rule = message.ruleId ?? '(parser/configuration)';
    rules.set(rule, (rules.get(rule) ?? 0) + 1);
  }
}
const errors = report.reduce((sum, file) => sum + file.errorCount, 0);
const warnings = report.reduce((sum, file) => sum + file.warningCount, 0);
const relative = path => path.replaceAll('\\', '/').replace(`${process.cwd().replaceAll('\\', '/')}/`, '');
console.log(JSON.stringify({
  files: report.length,
  errors,
  warnings,
  rules: Object.fromEntries([...rules].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  nextFiles: report.filter(file => file.errorCount + file.warningCount > 0)
    .sort((a, b) => b.errorCount - a.errorCount || b.warningCount - a.warningCount || a.filePath.localeCompare(b.filePath))
    .slice(0, 20)
    .map(file => ({ path: relative(file.filePath), errors: file.errorCount, warnings: file.warningCount })),
}, null, 2));
process.exitCode = errors > 0 ? 1 : 0;
