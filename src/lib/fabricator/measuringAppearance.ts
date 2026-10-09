/**
 * Measuring appearance normalization — preserve unknowns; never silently replace.
 * AICS-001: deterministic allowlists only. Callers must collect human confirmation
 * before mapping hex/tint values onto catalog color / glazing enums.
 */

export const CATALOG_PROFILE_COLORS = [
  'Silver',
  'White',
  'Black',
  'Bronze',
  'Anthracite Grey',
] as const;

export const CATALOG_GLAZING_TYPES = ['single', 'double', 'triple'] as const;

export type CatalogProfileColor = (typeof CATALOG_PROFILE_COLORS)[number];
export type CatalogGlazingType = (typeof CATALOG_GLAZING_TYPES)[number];

export type AppearanceSuggestionKind = 'color' | 'glazingType';

export interface AppearanceSuggestion {
  kind: AppearanceSuggestionKind;
  /** Original stored value (preserved until confirmed). */
  raw: string;
  /** Suggested catalog value — applied only after confirmation. */
  suggested: string;
  reason: string;
}

export interface MeasuringAppearanceSeed {
  color: string;
  glazingType: string;
  glassColor: string;
  suggestions: AppearanceSuggestion[];
}

function matchCatalogColor(raw: string): CatalogProfileColor | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const byName = CATALOG_PROFILE_COLORS.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName;
  const hex = trimmed.toLowerCase().replace(/^#/, '');
  if (hex === 'fff' || hex === 'ffffff') return 'White';
  if (hex === '000' || hex === '000000') return 'Black';
  return undefined;
}

function matchCatalogGlazing(raw: string | undefined): CatalogGlazingType | undefined {
  const trimmed = (raw || '').trim().toLowerCase();
  if (!trimmed) return undefined;
  return CATALOG_GLAZING_TYPES.find((g) => g === trimmed);
}

/**
 * Seed measuring appearance from pose / defaults.
 * Preserves unknown color and demotes tint-like glazing.type to glassColor.
 * Suggestions require explicit confirmation before catalog enums are used.
 */
export function seedMeasuringAppearance(input: {
  color?: string;
  glazingType?: string;
  glassColor?: string;
  defaultColor?: string;
  defaultGlazingType?: string;
  defaultGlassColor?: string;
}): MeasuringAppearanceSeed {
  const suggestions: AppearanceSuggestion[] = [];
  const rawColor = (input.color || '').trim();
  const catalogColor = matchCatalogColor(rawColor);
  const defaultColor = matchCatalogColor(input.defaultColor || '') || 'White';

  let color: string;
  if (!rawColor) {
    color = defaultColor;
  } else if (catalogColor && catalogColor.toLowerCase() === rawColor.toLowerCase()) {
    color = catalogColor;
  } else if (catalogColor) {
    // Hex / casing variant: show catalog value in the Select, but require Confirm before save.
    color = catalogColor;
    suggestions.push({
      kind: 'color',
      raw: rawColor,
      suggested: catalogColor,
      reason: `Stored color "${rawColor}" maps to catalog "${catalogColor}". Confirm before save.`,
    });
  } else {
    // Truly unknown — preserve raw (Select may be empty until operator picks a catalog color).
    color = rawColor;
    suggestions.push({
      kind: 'color',
      raw: rawColor,
      suggested: defaultColor,
      reason: `Unknown color "${rawColor}" is not in the catalog. Confirm mapping to "${defaultColor}" or change it.`,
    });
  }

  const rawGlazing = (input.glazingType || '').trim();
  const catalogGlazing = matchCatalogGlazing(rawGlazing);
  const defaultGlazing = matchCatalogGlazing(input.defaultGlazingType) || 'double';

  let glazingType: string;
  let glassColor = (input.glassColor || '').trim() || input.defaultGlassColor || 'clear';

  if (catalogGlazing) {
    glazingType = catalogGlazing;
  } else if (rawGlazing) {
    // Legacy: tint stored as glazing.type (e.g. "clear")
    if (!input.glassColor) glassColor = rawGlazing;
    glazingType = defaultGlazing;
    suggestions.push({
      kind: 'glazingType',
      raw: rawGlazing,
      suggested: defaultGlazing,
      reason: `Stored glazing "${rawGlazing}" looks like a glass tint, not single/double/triple. Confirm "${defaultGlazing}" for catalog glazing.`,
    });
  } else {
    glazingType = defaultGlazing;
  }

  return { color, glazingType, glassColor, suggestions };
}

/** Resolve catalog enums after the operator confirms suggestions. */
export function applyAppearanceConfirmations(
  seed: Pick<MeasuringAppearanceSeed, 'color' | 'glazingType' | 'glassColor'>,
  suggestions: AppearanceSuggestion[],
  confirmedKinds: ReadonlySet<AppearanceSuggestionKind>,
): { color: string; glazingType: string; glassColor: string; blocked: AppearanceSuggestion[] } {
  let color = seed.color;
  let glazingType = seed.glazingType;
  const glassColor = seed.glassColor;
  const blocked: AppearanceSuggestion[] = [];

  for (const suggestion of suggestions) {
    if (!confirmedKinds.has(suggestion.kind)) {
      // Auto-suggested catalog value still needs acknowledgment (not a silent replace).
      blocked.push(suggestion);
      continue;
    }
    if (suggestion.kind === 'color') color = matchCatalogColor(color) || suggestion.suggested;
    if (suggestion.kind === 'glazingType') {
      glazingType = matchCatalogGlazing(glazingType) || suggestion.suggested;
    }
  }

  if (!matchCatalogColor(color)) {
    blocked.push({
      kind: 'color',
      raw: color,
      suggested: 'White',
      reason: `Color "${color}" is still not a catalog value.`,
    });
  }
  if (!matchCatalogGlazing(glazingType)) {
    blocked.push({
      kind: 'glazingType',
      raw: glazingType,
      suggested: 'double',
      reason: `Glazing "${glazingType}" is still not single/double/triple.`,
    });
  }

  return {
    color: matchCatalogColor(color) || color,
    glazingType: matchCatalogGlazing(glazingType) || glazingType,
    glassColor,
    blocked,
  };
}
