import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loading, Page, Section, SafetyNote, Stepper } from '../components/ui';
import { EXERCISES } from '../data/exercises';
import { WORKOUTS, type Workout } from '../data/workouts';
import { db, historyOf } from '../db/db';
import { useProfile } from '../db/hooks';
import { epley } from '../lib/calc';
import { formatDateBR } from '../lib/dates';
import type { PlanOverride, Profile, WorkoutId } from '../types';

interface PlanRow {
  exercise: string;
  sets: number;
  repMin: number;
  repMax: number;
  timed: boolean;
  superset: boolean;
}

function rowsOf(w: Workout, overrides: Profile['planOverrides']): PlanRow[] {
  const ov = overrides[w.id] ?? {};
  return w.entries.map((e) => {
    const o: PlanOverride = ov[e.exercise] ?? {};
    return {
      exercise: e.exercise,
      sets: o.sets ?? e.sets,
      repMin: o.repMin ?? e.repMin,
      repMax: o.repMax ?? e.repMax,
      timed: !!e.timed,
      superset: !!e.superset,
    };
  });
}

export default function Plan() {
  const profile = useProfile();
  const [editing, setEditing] = useState<WorkoutId | null>(null);
  const [draft, setDraft] = useState<Record<string, PlanOverride>>({});
  const [exKey, setExKey] = useState('supino_reto');
  const history = useLiveQuery(() => historyOf(exKey), [exKey]);

  const exerciseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const w of WORKOUTS) for (const e of w.entries) seen.set(e.exercise, EXERCISES[e.exercise].name);
    return [...seen.entries()];
  }, []);

  if (!profile) return <Loading />;

  const chart = (history ?? []).map((s) => {
    const e = s.exercises.find((x) => x.key === exKey);
    const done = (e?.sets ?? []).filter((x) => x.done);
    return {
      date: formatDateBR(s.date).slice(0, 5),
      maxWeight: done.length ? Math.max(...done.map((x) => x.weight)) : 0,
      e1rm: done.length ? Math.round(Math.max(...done.map((x) => epley(x.weight, x.reps))) * 10) / 10 : 0,
    };
  });

  const startEdit = (w: Workout) => {
    const d: Record<string, PlanOverride> = {};
    for (const r of rowsOf(w, profile.planOverrides)) {
      d[r.exercise] = { sets: r.sets, repMin: r.repMin, repMax: r.repMax };
    }
    setDraft(d);
    setEditing(w.id);
  };

  const saveEdit = async (w: Workout) => {
    const valid = Object.values(draft).every((o) => (o.repMin ?? 1) <= (o.repMax ?? 1));
    if (!valid) {
      window.alert('Em cada exercício, a reps mínima não pode ser maior que a máxima.');
      return;
    }
    await db.profile.update('me', {
      planOverrides: { ...profile.planOverrides, [w.id]: draft },
    });
    setEditing(null);
  };

  const resetWorkout = async (w: Workout) => {
    const { [w.id]: _removed, ...rest } = profile.planOverrides;
    void _removed;
    await db.profile.update('me', { planOverrides: rest });
    setEditing(null);
  };

  return (
    <Page title="Plano" subtitle="Divisão, séries e faixas de repetição. Edite quando quiser.">
      {WORKOUTS.map((w) => {
        const rows = rowsOf(w, profile.planOverrides);
        const isEditing = editing === w.id;
        return (
          <Section key={w.id} title={`${w.name}${w.optional ? ' (opcional)' : ''}`} hint={w.focus}>
            <ol className="space-y-3">
              {rows.map((r) => (
                <li key={r.exercise} className="border-b border-zinc-100 pb-3 last:border-0 dark:border-zinc-800">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {EXERCISES[r.exercise].name}
                      {r.superset && <span className="ml-1 text-xs text-zinc-500">(supersérie)</span>}
                    </span>
                    {!isEditing && (
                      <span className="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                        {r.sets} × {r.repMin}–{r.repMax}
                        {r.timed ? ' s' : ''}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <details className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <summary className="cursor-pointer py-1">Dica e substitutos</summary>
                      <p>{EXERCISES[r.exercise].tip}</p>
                      <p>Substitutos: {EXERCISES[r.exercise].subs.join(', ')}.</p>
                    </details>
                  )}
                  {isEditing && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <span className="label">Séries</span>
                        <Stepper
                          label={`Séries de ${EXERCISES[r.exercise].name}`}
                          value={draft[r.exercise]?.sets ?? r.sets}
                          min={1}
                          onChange={(v) =>
                            setDraft((d) => ({ ...d, [r.exercise]: { ...d[r.exercise], sets: v } }))
                          }
                        />
                      </div>
                      <div>
                        <span className="label">Reps mín.</span>
                        <Stepper
                          label={`Reps mínimas de ${EXERCISES[r.exercise].name}`}
                          value={draft[r.exercise]?.repMin ?? r.repMin}
                          min={1}
                          onChange={(v) =>
                            setDraft((d) => ({ ...d, [r.exercise]: { ...d[r.exercise], repMin: v } }))
                          }
                        />
                      </div>
                      <div>
                        <span className="label">Reps máx.</span>
                        <Stepper
                          label={`Reps máximas de ${EXERCISES[r.exercise].name}`}
                          value={draft[r.exercise]?.repMax ?? r.repMax}
                          min={1}
                          onChange={(v) =>
                            setDraft((d) => ({ ...d, [r.exercise]: { ...d[r.exercise], repMax: v } }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary flex-1" onClick={() => saveEdit(w)}>
                  Salvar
                </button>
                <button type="button" className="btn-ghost" onClick={() => resetWorkout(w)}>
                  Restaurar padrão
                </button>
                <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" className="btn-ghost w-full" onClick={() => startEdit(w)}>
                Editar séries e faixas
              </button>
            )}
          </Section>
        );
      })}

      <Section title="Histórico por exercício" hint="Carga máxima e 1RM estimado (Epley) ao longo das sessões.">
        <label className="label" htmlFor="ex-select">Exercício</label>
        <select id="ex-select" className="w-full" value={exKey} onChange={(e) => setExKey(e.target.value)}>
          {exerciseOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {chart.length === 0 ? (
          <p className="muted">Ainda não há sessões concluídas com este exercício.</p>
        ) : (
          <div className="h-56 w-full" aria-label="Gráfico de carga e 1RM">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="maxWeight" name="Carga máx. (kg)" stroke="#047857" strokeWidth={2} dot />
                <Line type="monotone" dataKey="e1rm" name="1RM est. (kg)" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      <SafetyNote />
    </Page>
  );
}
