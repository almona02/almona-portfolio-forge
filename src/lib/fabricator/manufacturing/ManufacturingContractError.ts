export type ManufacturingContractErrorCode =
  | 'INVALID_IDENTITY'
  | 'INVALID_REVISION'
  | 'INVALID_DIMENSION'
  | 'INVALID_QUANTITY'
  | 'INVALID_CELL'
  | 'INCONSISTENT_GEOMETRY'
  | 'UNAPPROVED_SYSTEM'
  | 'UNAPPROVED_PROFILE'
  | 'UNAPPROVED_RULE'
  | 'INVALID_GLAZING'
  | 'INVALID_HARDWARE'
  | 'INVALID_SERIALIZED_CONTRACT';

export class ManufacturingContractError extends Error {
  readonly blocking = true;

  constructor(
    readonly code: ManufacturingContractErrorCode,
    readonly field: string,
    message: string
  ) {
    super(message);
    this.name = 'ManufacturingContractError';
  }
}
