/**
 * @file AICS-001/index.ts
 * @description AICS-001 Reference
 * 
 * This module provides programmatic access to AICS-001 canonical specification.
 * The actual specification is located at:
 * docs/AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export const AICS001_VERSION = '1.0.0';
export const AICS001_PATH = 'docs/AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md';

export interface AICS001Reference {
  version: string;
  path: string;
  sections: {
    truthDomains: string;
    governanceTiers: string;
    certificationModes: string;
    separationOfPowers: string;
  };
}

export const AICS001_REFERENCE: AICS001Reference = {
  version: AICS001_VERSION,
  path: AICS001_PATH,
  sections: {
    truthDomains: 'Section 6.3',
    governanceTiers: 'Section 5.10',
    certificationModes: 'Section 7.6',
    separationOfPowers: 'Section 8.3'
  }
};

