import { WORKOUTS } from '../data/workouts';
import type { Schedule } from '../types';
import { WEEKDAYS, WEEKDAYS_LONG } from '../lib/dates';
import { scheduleWarnings } from '../lib/schedule';

export function ScheduleEditor({
  schedule,
  onChange,
  classDays,
  onClassDaysChange,
}: {
  schedule: Schedule;
  onChange: (s: Schedule) => void;
  classDays: number[];
  onClassDaysChange: (days: number[]) => void;
}) {
  const warnings = scheduleWarnings(schedule);

  const toggleClass = (d: number) => {
    const next = classDays.includes(d) ? classDays.filter((x) => x !== d) : [...classDays, d].sort();
    onClassDaysChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="label">Dia de cada treino</p>
        {WORKOUTS.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-3">
            <label htmlFor={`day-${w.id}`} className="min-w-0 flex-1">
              <span className="block font-medium">{w.name}{w.optional ? ' (opcional)' : ''}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{w.focus}</span>
            </label>
            <select
              id={`day-${w.id}`}
              className="w-32"
              value={schedule[w.id]}
              onChange={(e) => onChange({ ...schedule, [w.id]: Number(e.target.value) })}
            >
              {WEEKDAYS_LONG.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {warnings.map((w) => (
            <li key={w}>⚠ {w}</li>
          ))}
        </ul>
      )}

      <div>
        <p className="label">Dias de faculdade (modo expresso)</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((name, i) => {
            const on = classDays.includes(i);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggleClass(i)}
                className={`min-h-[44px] min-w-[44px] rounded-xl px-3 font-medium ${
                  on ? 'bg-emerald-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
