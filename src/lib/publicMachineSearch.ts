import { intelligentSearch } from '@/constants/smartCategories';
import type { Machine } from '@/constants/yilmazMachines';

const normalizeArabic = (text: string) => text.toLowerCase()
  .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');

/** Search translated catalogue text without changing canonical machine records. */
export function searchPublicMachines(query: string, machines: Machine[], copy: (text: string) => string): Machine[] {
  if (!/[\u0600-\u06ff]/.test(query)) return intelligentSearch(query, machines);
  const words = normalizeArabic(query).trim().split(/\s+/);
  return machines.filter(machine => {
    const fields = [machine.name, machine.description, machine.type, machine.category, ...(machine.tags || [])];
    const text = normalizeArabic(fields.flatMap(value => [value, copy(value)]).join(' '));
    return words.every(word => text.includes(word));
  });
}
