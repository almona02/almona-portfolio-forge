/** Quote CSV cells and neutralize spreadsheet formula prefixes in untrusted text. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  const text = String(value ?? '')
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}
