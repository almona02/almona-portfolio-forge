/** Standard registration warranty covers installation dates within the past year. */
export function isWithinStandardWarranty(installationDate: string, now = new Date()): boolean {
  if (!installationDate) return false;
  const installed = new Date(`${installationDate}T00:00:00`);
  if (Number.isNaN(installed.getTime())) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const earliest = new Date(today);
  earliest.setFullYear(earliest.getFullYear() - 1);
  return installed >= earliest && installed <= today;
}
