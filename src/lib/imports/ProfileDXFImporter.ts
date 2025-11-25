import { Profile } from '@/types/fabricator';

export interface ParsedProfileFromDXF {
  name: string;
  material?: Profile['material'];
  width?: number;
  height?: number;
  thickness?: number;
  notes?: string;
  specifications?: Record<string, any>;
}

/**
 * Basic DXF profile importer (Phase 1)
 * 
 * For now this does NOT try to fully parse geometry. It:
 * - Derives a profile name from the file name
 * - Marks the profile as DXF-sourced in specifications
 * - Stores lightweight metadata so we can enhance parsing later
 */
export async function parseProfileFromDXF(file: File): Promise<ParsedProfileFromDXF> {
  const baseName = file.name.replace(/\.dxf$/i, '');

  // Read content for future parsing (currently unused but kept for later algorithms)
  const text = await file.text();

  return {
    name: baseName || 'Imported DXF Profile',
    specifications: {
      dxfImported: true,
      dxfFileName: file.name,
      dxfFileSize: file.size,
      dxfPreviewSnippet: text.slice(0, 2000), // small snippet for debugging
      dxfImportedAt: new Date().toISOString(),
    },
  };
}


