import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { usePublicCopy } from '@/hooks/usePublicCopy';

export interface TutorialStep {
  title: string;
  points: string[];
  reference?: string;
}

export interface TutorialModule {
  title: string;
  steps: TutorialStep[];
}

interface TutorialSlidesProps {
  modules: TutorialModule[];
  personaTitle?: string;
  notice?: string;
  language?: string;
  symptom?: string | null;
  onAsk?: (topic: string) => void;
  onClose?: () => void;
}

export function TutorialSlides({ modules, personaTitle, notice, language, symptom, onAsk, onClose }: TutorialSlidesProps) {
  const copy = usePublicCopy();
  const screens = modules.flatMap((module, moduleIndex) => module.steps.map(step => ({ ...step, moduleTitle: module.title, moduleIndex })));
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Set<number>>(() => new Set());
  const [answer, setAnswer] = useState<'correct' | 'incorrect' | null>(null);
  const screen = screens[index];
  if (!screen) return null;
  const complete = reviewed.size === screens.length && answer === 'correct';
  const rtl = language === 'ar';

  return (
    <section aria-label={personaTitle || copy('Guided review')} dir={rtl ? 'rtl' : 'ltr'} className="rounded-xl border border-cyan-500/30 bg-slate-900 text-slate-100 p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-cyan-300">AIM 7510 · {copy('Guided review')}</p>
          <h2 className="text-xl font-semibold mt-1">{personaTitle}</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} className="text-sm text-slate-300 underline">{copy('Return to chat')}</button>}
      </div>
      <p className="text-sm text-amber-200 border-s-2 border-amber-400 ps-3">{notice || copy('Review with an authorized operator and the installed machine manual.')}</p>
      {symptom && <p className="text-sm bg-slate-800 rounded-lg p-3 whitespace-pre-wrap" dir="auto">{symptom}</p>}
      <nav aria-label={copy('Guide topics')} className="flex flex-wrap gap-2">
        {modules.map((module, i) => (
          <button key={`${module.title}-${i}`} type="button" aria-pressed={screen.moduleIndex === i}
            onClick={() => setIndex(screens.findIndex(item => item.moduleIndex === i))}
            className={`px-3 py-2 text-sm rounded-lg border ${screen.moduleIndex === i ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`}>
            {module.title}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300" role="status">
        <span>{copy('Screen')} {index + 1} / {screens.length}</span>
        <span>{reviewed.size} / {screens.length} {copy('screens reviewed')}</span>
      </div>
      <div role="progressbar" aria-label={copy('Review progress')} aria-valuemin={0} aria-valuemax={screens.length} aria-valuenow={reviewed.size} className="h-1.5 rounded bg-slate-700 overflow-hidden">
        <div className="h-full bg-cyan-400 transition-all" style={{ width: `${reviewed.size / screens.length * 100}%` }} />
      </div>
      <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-slate-800/70 border border-slate-700 p-4 md:p-6 min-h-52">
        <p className="text-xs text-cyan-300 mb-2">{screen.moduleTitle}</p>
        <h3 className="text-lg font-semibold mb-4" dir="auto">{screen.title}</h3>
        <ul className="list-disc ps-5 space-y-3 text-sm leading-relaxed">
          {screen.points.map((point, i) => <li key={i} dir="auto">{point}</li>)}
        </ul>
        {screen.reference && <p className="text-xs text-slate-400 mt-5">{copy('Reading reference')}: {screen.reference}</p>}
      </motion.div>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">
          <ArrowLeft aria-hidden="true" className="inline h-4 w-4 mx-1 rtl:rotate-180" />{copy('Previous')}
        </button>
        <button type="button" onClick={() => setReviewed(previous => new Set(previous).add(index))} disabled={reviewed.has(index)} className="rounded-lg bg-cyan-700 hover:bg-cyan-600 px-4 py-2 text-sm disabled:opacity-60">
          {reviewed.has(index) ? <><Check aria-hidden="true" className="inline h-4 w-4 mx-1" />{copy('Reviewed')}</> : copy('Mark reviewed')}
        </button>
        <button type="button" onClick={() => setIndex(index + 1)} disabled={index === screens.length - 1} className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40">
          {copy('Next')}<ArrowRight aria-hidden="true" className="inline h-4 w-4 mx-1 rtl:rotate-180" />
        </button>
      </div>
      {index === screens.length - 1 && (
        <fieldset className="border border-slate-600 rounded-lg p-4 space-y-3">
          <legend className="text-sm px-2">{copy('Knowledge check')}</legend>
          <p className="text-sm">{copy('Does reviewing this guide authorize you to operate or repair the machine?')}</p>
          <div className="flex gap-3">
            <button type="button" aria-pressed={answer === 'incorrect'} onClick={() => setAnswer('incorrect')} className="border border-slate-500 rounded px-4 py-2">{copy('Yes')}</button>
            <button type="button" aria-pressed={answer === 'correct'} onClick={() => setAnswer('correct')} className="border border-slate-500 rounded px-4 py-2">{copy('No')}</button>
          </div>
          {answer && <p role="status" className="text-sm text-amber-200">{copy(answer === 'correct' ? 'Correct. Follow the approved procedure with an authorized operator.' : 'Review the boundary: this guide does not authorize operation or repair.')}</p>}
          {reviewed.size < screens.length && <p className="text-xs text-slate-400">{copy('Review every screen before finishing.')}</p>}
        </fieldset>
      )}
      {complete && <p role="status" className="rounded-lg bg-cyan-950 p-4 text-cyan-200"><BookOpen aria-hidden="true" className="inline h-4 w-4 mx-1" />{copy('Guide reviewed. This is not operator certification.')}</p>}
      <div className="flex flex-wrap gap-4 border-t border-slate-700 pt-4">
        {onAsk && <button type="button" onClick={() => onAsk(screen.title)} className="text-sm text-cyan-300 underline">{copy('Ask about this screen')}</button>}
        <button type="button" onClick={() => { setIndex(0); setReviewed(new Set()); setAnswer(null); }} className="text-sm text-slate-300 underline"><RotateCcw aria-hidden="true" className="inline h-3 w-3 mx-1" />{copy('Restart guide')}</button>
      </div>
    </section>
  );
}
