import type { CompleteBOM } from '../PresetAwareBOMGenerator';
export function groupProfileCuts(profile: CompleteBOM['profiles'][number]) {
    const groups = new Map<string, {
        length: number;
        angle: number;
        count: number;
    }>();
    for (const [index, length] of (profile.cuttingLengths ?? []).entries()) {
        const angle = profile.angles?.[index] ?? 0;
        const key = JSON.stringify([length, angle]);
        const existing = groups.get(key);
        if (existing)
            existing.count += 1;
        else
            groups.set(key, { length, angle, count: 1 });
    }
    return [...groups.values()];
}
