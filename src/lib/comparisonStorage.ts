const COMPARISON_KEY = "saved_comparisons";

// Use the existing Machine type from the project
import type { Machine } from "@/types/index";

export const saveComparison = (machines: Machine[]) => {
  const existing = loadComparisons();
  const updated = [...existing, machines];
  localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated));
};

export const loadComparisons = (): Machine[][] => {
  const data = localStorage.getItem(COMPARISON_KEY);
  return data ? JSON.parse(data) : [];
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
