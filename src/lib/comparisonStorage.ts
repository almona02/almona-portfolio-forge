const COMPARISON_KEY = "saved_comparisons";

// Use the existing Machine type from the project
import type { Machine } from "@/types/index";

export const saveComparison = (machines: Machine[]) => {
  const existing = loadComparisons();
  const updated = [...existing, machines];
  localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated));
};

export const loadComparisons = (): Machine[][] => {
  // Optional browser state must not take down the public catalogue.
  try {
    const data = localStorage.getItem(COMPARISON_KEY);
    const parsed: unknown = data ? JSON.parse(data) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((group): group is Machine[] => Array.isArray(group) && group.every(machine =>
      machine && typeof machine === 'object' && typeof machine.id === 'string' && typeof machine.name === 'string'
    ));
  } catch {
    // Preserve the stored value: a read failure is not permission to delete it.
    return [];
  }
};

export const deleteComparison = (index: number) => {
  const existing = loadComparisons();
  const updated = existing.filter((_, i) => i !== index);
  localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated));
  return updated;
};

export const clearAllComparisons = () => {
  localStorage.removeItem(COMPARISON_KEY);
};

export const getComparisonCount = (): number => {
  return loadComparisons().length;
};
