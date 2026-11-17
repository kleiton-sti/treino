import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckRow, Loading, Page, Section, SafetyNote } from '../components/ui';
import { BACKUP_REMINDER_DAYS, QUICK_PROTEIN, WATER_GLASS_ML, WATER_GOAL_ML } from '../data/meals';
import { getWorkout } from '../lib/session';
import { db, patchDayLog, toggleChecked } from '../db/db';
import { useProfile } from '../db/hooks';
import { macroGoals, sleepHours } from '../lib/calc';
import { dateKey, nowMinutes, WEEKDAYS_LONG, weekdayOf } from '../lib/dates';
import { getLastBackup } from '../lib/device';
import { buildTimeline, currentItem, sumProtein, workoutForWeekday } from '../lib/schedule';

export default function Today() {
  const profile = useProfile();
  const navigate = useNavigate();
  const today = dateKey();
  const log = useLiveQuery(() => db.dayLogs.get(today), [today]);
  const sleep = useLiveQuery(() => db.sleep.get(today), [today]);

  // Re-renderiza a cada 30 s para o card "Agora" acompanhar o relógio.
  const [, setClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!profile) return <Loading />;

  const weekday = weekdayOf(today);
  const workoutId = workoutForWeekday(weekday, profile.schedule);
  const workout = workoutId ? getWorkout(workoutId) ?? null : null;
  const classDay = profile.classDays.includes(weekday);
  const items = buildTimeline({
    weekday,
    times: profile.times,
    schedule: profile.schedule,
    classDays: profile.classDays,
    leaveBy: profile.leaveBy,
    workoutId,
    classDay,
  });
  const checked = new Set(log?.checked ?? []);
  const extras = log?.extras ?? [];
  const protein = sumProtein(items, checked) + extras.reduce((a, x) => a + x.protein, 0);
  const goals = macroGoals({ ...profile, kcalAdjust: profile.kcalAdjust });
  const now = currentItem(items, checked, nowMinutes());
  const water = log?.water ?? 0;
  const lastBackup = getLastBackup();
  const backupDue =
    !lastBackup || (Date.now() - lastBackup.getTime()) / 86_400_000 > BACKUP_REMINDER_DAYS;
  const runToday = profile.runningEnabled && (weekday === 0 || weekday === 6);
  const sleepTotal = sleep?.bed && sleep?.wake ? sleepHours(sleep.bed, sleep.wake) : null;

  const addExtra = (label: string, p: number) =>
    patchDayLog(today, (d) => ({ ...d, extras: [...d.extras, { label, protein: p }] }));
  const undoExtra = () =>
    patchDayLog(today, (d) => ({ ...d, extras: d.extras.slice(0, -1) }));
  const setWater = (n: number) => patchDayLog(today, (d) => ({ ...d, water: Math.max(0, n) }));
  const setSleep = (patch: { bed?: string; wake?: string }) =>
    db.sleep.put({ date: today, bed: patch.bed ?? sleep?.bed ?? '', wake: patch.wake ?? sleep?.wake ?? '' });

  return (
    <Page title="Hoje" subtitle={`${capitalize(WEEKDAYS_LONG[weekday])} · ${today.split('-').reverse().join('/')}`}>
      {backupDue && (
        <button
          type="button"
          onClick={() => navigate('/ajustes')}
          className="w-full rounded-xl bg-sky-50 p-3 text-left text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
        >
          Faz tempo que você não exporta um backup. Toque aqui para salvar (Ajustes → Exportar).
        </button>
      )}

      <section aria-label="Agora" className="card border-emerald-600/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Agora</p>
        {now ? (
          <>
            <p className="mt-1 text-xl font-bold">
              <span className="font-mono">{now.time}</span> · {now.label}
            </p>
            {now.tip && <p className="muted mt-1">{now.tip}</p>}
          </>
        ) : (
          <p className="mt-1 text-lg font-semibold">Tudo feito por hoje. Bom descanso.</p>
        )}
      </section>

      <Section title="Proteína do dia">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold tabular-nums">
            {protein}
            <span className="text-base font-medium text-zinc-500"> / {goals.protein} g</span>
          </p>
          <p className="muted">Calorias alvo: {goals.kcal} kcal</p>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={goals.protein}
          aria-valuenow={Math.min(protein, goals.protein)}
          aria-label="Proteína do dia"
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, (protein / goals.protein) * 100)}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROTEIN.map((q) => (
            <button key={q.label} type="button" className="btn-ghost text-sm" onClick={() => addExtra(q.label, q.protein)}>
              {q.label}
            </button>
          ))}
          {extras.length > 0 && (
            <button type="button" className="btn-ghost text-sm" onClick={undoExtra}>
              Desfazer último
            </button>
          )}
        </div>
      </Section>

      <Section title="Rotina de hoje" hint="Marque conforme for fazendo.">
        <ul className="-mx-2 space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <CheckRow
                checked={checked.has(it.id)}
                onToggle={() => toggleChecked(today, it.id)}
                title={it.label}
                time={it.time}
                sub={it.tip}
                right={
                  it.protein > 0 ? (
                    <span className="shrink-0 rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-zinc-800">
                      {it.protein} g{it.suggested ? ' (sugestão)' : ''}
                    </span>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={workout ? `Treino de hoje: ${workout.name}` : 'Descanso'} hint={workout ? workout.focus : undefined}>
        {workout ? (
          <>
            {workout.optional && <p className="muted">Opcional. Pular não atrapalha o plano.</p>}
            {classDay && (
              <p className="muted">
                Dia de faculdade: modo expresso. Saia da academia até <strong>{profile.leaveBy}</strong>.
              </p>
            )}
            <button type="button" className="btn-primary w-full" onClick={() => navigate(`/treino/${workout.id}`)}>
              Iniciar treino
            </button>
          </>
        ) : (
          <p className="muted">Dia de descanso. Chegue cedo em casa, estude e durma mais cedo. Caminhada leve é opcional.</p>
        )}
        {runToday && (
          <button type="button" className="btn-ghost w-full" onClick={() => navigate('/corrida')}>
            Ver corrida de hoje
          </button>
        )}
      </Section>

      <Section title="Sono">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="bed">Deitei às</label>
            <input
              id="bed"
              type="time"
              className="w-full"
              value={sleep?.bed ?? ''}
              onChange={(e) => setSleep({ bed: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="wake">Acordei às</label>
            <input
              id="wake"
              type="time"
              className="w-full"
              value={sleep?.wake ?? ''}
              onChange={(e) => setSleep({ wake: e.target.value })}
            />
          </div>
        </div>
        {sleepTotal !== null && (
          <p className="muted">
            {sleepTotal} h de sono. Meta: 7 h ou mais.
          </p>
        )}
      </Section>

      <Section title="Água">
        <div className="flex items-center justify-between gap-3">
          <p className="tabular-nums">
            <span className="text-2xl font-bold">{water * WATER_GLASS_ML}</span>
            <span className="muted"> / {WATER_GOAL_ML} ml ({WATER_GLASS_ML} ml por copo)</span>
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" aria-label="Remover um copo" onClick={() => setWater(water - 1)}>
              −
            </button>
            <button type="button" className="btn-primary" aria-label="Adicionar um copo" onClick={() => setWater(water + 1)}>
              + copo
            </button>
          </div>
        </div>
      </Section>

      <SafetyNote />
      <p className="text-center text-xs text-zinc-500">Dados guardados só neste aparelho.</p>
    </Page>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
