import type { TutorialModule } from './TutorialSlides';

export interface GuidedContent {
  version: 1;
  kind: 'operation' | 'diagnosis' | 'applications';
  language: 'en' | 'ar' | 'tr' | 'ru';
  title: string;
  notice: string;
  symptom?: string | null;
  modules: TutorialModule[];
}

const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 8000;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Treat the additive API field as untrusted; malformed guides keep their text fallback. */
export function readGuidedContent(value: unknown): GuidedContent | undefined {
  if (!record(value) || value.version !== 1 || !['operation', 'diagnosis', 'applications'].includes(String(value.kind)) ||
      !['en', 'ar', 'tr', 'ru'].includes(String(value.language)) || !text(value.title) || !text(value.notice) ||
      (value.symptom != null && !text(value.symptom)) || !Array.isArray(value.modules) || !value.modules.length || value.modules.length > 20) return;
  let count = 0;
  for (const module of value.modules) {
    if (!record(module) || !text(module.title) || !Array.isArray(module.steps) || !module.steps.length) return;
    for (const step of module.steps) {
      count++;
      if (count > 100 || !record(step) || !text(step.title) || !Array.isArray(step.points) ||
          !step.points.length || step.points.length > 20 || !step.points.every(text) ||
          (step.reference !== undefined && !text(step.reference))) return;
    }
  }
  return value as unknown as GuidedContent;
}
