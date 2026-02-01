import type { WindowUnit } from '@/types/fabricator';

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    defaultSystemPackId?: string;
    defaultGrid?: WindowUnit['grid'];
    category: 'residential' | 'commercial' | 'industrial';
    thumbnailUrl?: string; // Future use
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'res-standard-casement',
        name: 'Residential Standard Casement',
        description: 'Classic 2-panel window with one side hung sash.',
        category: 'residential',
        defaultSystemPackId: 'rock60', 
        defaultGrid: {
            rows: 1, cols: 2, cells: [
                { id: '0-0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
                { id: '0-1', row: 0, col: 1, type: 'fixed' },
            ]
        }
    },
    {
        id: 'res-sliding-2track',
        name: 'Residential Sliding 2-Track',
        description: 'Standard 2-panel sliding window.',
        category: 'residential',
        defaultSystemPackId: 's700', // Assuming a sliding system exists
        defaultGrid: {
             rows: 1, cols: 2, cells: [
                { id: '0-0', row: 0, col: 0, type: 'sliding', openingDirection: 'left' },
                { id: '0-1', row: 0, col: 1, type: 'sliding', openingDirection: 'right' },
            ]
        }
    },
    {
        id: 'com-curtain-wall-basic',
        name: 'Commercial Curtain Wall',
        description: 'Grid layout for facade sections.',
        category: 'commercial',
        defaultSystemPackId: 'f50', // Facade system
         defaultGrid: {
            rows: 2, cols: 3, cells: [
                { id: '0-0', row: 0, col: 0, type: 'fixed' },
                { id: '0-1', row: 0, col: 1, type: 'fixed' },
                { id: '0-2', row: 0, col: 2, type: 'fixed' },
                { id: '1-0', row: 1, col: 0, type: 'fixed' },
                { id: '1-1', row: 1, col: 1, type: 'sash', openingDirection: 'top' }, // Vent
                { id: '1-2', row: 1, col: 2, type: 'fixed' },
            ]
        }
    }
];
