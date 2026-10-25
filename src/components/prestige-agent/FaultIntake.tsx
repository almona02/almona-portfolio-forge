import { useState } from 'react';
import { usePublicCopy } from '@/hooks/usePublicCopy';

export function FaultIntake({ onSubmit, onCancel }: { onSubmit: (symptom: string) => void; onCancel: () => void }) {
  const copy = usePublicCopy();
  const [symptom, setSymptom] = useState('');
  const [alarm, setAlarm] = useState('');
  const [lastOperation, setLastOperation] = useState('');
  return (
    <form aria-label={copy('Fault details')} className="rounded-xl border border-amber-500/40 bg-slate-900 p-5 space-y-4"
      onSubmit={event => { event.preventDefault(); if (symptom.trim()) onSubmit([`${copy('Symptom')}: ${symptom.trim()}`, alarm.trim() && `${copy('Alarm code')}: ${alarm.trim()}`, lastOperation.trim() && `${copy('Last operation')}: ${lastOperation.trim()}`].filter(Boolean).join('\n')); }}>
      <h2 className="text-xl font-semibold">{copy('Describe the fault')}</h2>
      <p className="text-sm text-slate-300">{copy('Record what you observed. This review does not identify a confirmed cause or authorize a repair.')}</p>
      <label className="block text-sm">{copy('Symptom')}
        <textarea required maxLength={3000} value={symptom} onChange={event => setSymptom(event.target.value)} dir="auto" className="block mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">{copy('Alarm code')} ({copy('optional')})
          <input maxLength={100} value={alarm} onChange={event => setAlarm(event.target.value)} dir="auto" className="block mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white" />
        </label>
        <label className="block text-sm">{copy('Last operation')} ({copy('optional')})
          <input maxLength={1000} value={lastOperation} onChange={event => setLastOperation(event.target.value)} dir="auto" className="block mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-white" />
        </label>
      </div>
      <div className="flex gap-4">
        <button type="submit" disabled={!symptom.trim()} className="bg-amber-600 rounded-lg px-4 py-2 disabled:opacity-40">{copy('Review fault')}</button>
        <button type="button" onClick={onCancel} className="text-slate-300 underline">{copy('Cancel')}</button>
      </div>
    </form>
  );
}
