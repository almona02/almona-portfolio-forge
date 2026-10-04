/**
 * FP-028 / A2 — Typed blocking error when Apex lacks approved system authority.
 * Missing pack data must never be replaced with invented generics.
 */

export type ApexSystemAuthorityErrorCode =
  | 'INCOMPLETE_SYSTEM_PACK'
  | 'MISSING_FRAME_PROFILE'
  | 'MISSING_SASH_PROFILE'
  | 'GENERIC_PROFILE_FORBIDDEN'
  | 'MISSING_FABRICATION_RULES';

export class ApexSystemAuthorityError extends Error {
  readonly code: ApexSystemAuthorityErrorCode;
  readonly systemId: string | undefined;
  readonly missing: readonly string[];

  constructor(args: {
    code: ApexSystemAuthorityErrorCode;
    message: string;
    systemId?: string;
    missing?: string[];
  }) {
    super(args.message);
    this.name = 'ApexSystemAuthorityError';
    this.code = args.code;
    this.systemId = args.systemId;
    this.missing = args.missing ?? [];
  }
}
