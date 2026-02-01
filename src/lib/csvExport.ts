/**
 * CSV Export Utility
 * 
 * Provides functions to export data to CSV format
 */

/**
 * Converts an array of objects to CSV format
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Create header row
  const headerRow = headers.map(h => escapeCSVValue(h.label)).join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return headers.map(header => {
      const value = item[header.key];
      return escapeCSVValue(value != null ? String(value) : '');
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escapes CSV values (handles commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (value == null) return '';
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Downloads CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export profile roles to CSV
 */
export function exportProfileRolesToCSV(
  profiles: Array<{ id: string; name?: string; fileName?: string; widthMm?: number; heightMm?: number }>,
  roles: Record<string, string | undefined>
): void {
  const data = profiles.map(profile => ({
    profileName: profile.name || profile.fileName || 'Unknown',
    profileId: profile.id,
    dimensions: profile.widthMm && profile.heightMm 
      ? `${profile.widthMm} × ${profile.heightMm} mm`
      : 'N/A',
    role: roles[profile.id] || 'Not Assigned',
  }));
  
  const headers = [
    { key: 'profileName' as const, label: 'Profile Name' },
    { key: 'profileId' as const, label: 'Profile ID' },
    { key: 'dimensions' as const, label: 'Dimensions (mm)' },
    { key: 'role' as const, label: 'Profile Role' },
  ];
  
  const csv = arrayToCSV(data, headers);
  downloadCSV(csv, `profile-roles-${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Export accessory roles to CSV
 */
export function exportAccessoryRolesToCSV(
  accessories: Array<{
    id: string;
    name: string;
    type?: string;
    category?: string;
    sku?: string;
    supplier?: string;
    role?: string;
  }>
): void {
  const data = accessories.map(accessory => ({
    accessoryName: accessory.name,
    accessoryId: accessory.id,
    type: accessory.type || 'N/A',
    category: accessory.category || 'N/A',
    sku: accessory.sku || 'N/A',
    supplier: accessory.supplier || 'N/A',
    role: accessory.role || 'Not Assigned',
  }));
  
  const headers = [
    { key: 'accessoryName' as const, label: 'Accessory Name' },
    { key: 'accessoryId' as const, label: 'Accessory ID' },
    { key: 'type' as const, label: 'Type' },
    { key: 'category' as const, label: 'Category' },
    { key: 'sku' as const, label: 'SKU' },
    { key: 'supplier' as const, label: 'Supplier' },
    { key: 'role' as const, label: 'Accessory Role' },
  ];
  
  const csv = arrayToCSV(data, headers);
  downloadCSV(csv, `accessory-roles-${new Date().toISOString().split('T')[0]}.csv`);
}

