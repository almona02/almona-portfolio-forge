export interface Certification {
  id: string;
  name: string;
  description: string;
  issuingAuthority: string;
  validityPeriod?: number; // in years
}