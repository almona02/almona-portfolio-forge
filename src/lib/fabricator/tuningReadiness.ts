export function allProfilesExplicitlyTuned(profiles: ReadonlyArray<{ id: string }> | undefined, tuned: ReadonlySet<string>): boolean {
  return Boolean(profiles?.length && profiles.every(profile => Boolean(profile.id) && tuned.has(profile.id)));
}
