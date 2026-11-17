import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckRow, Loading, Page, RestTimer, SafetyNote, Section, Stepper } from '../components/ui';
import { WORKOUTS } from '../data/workouts';
import { activeSession, db, doneSessionsOf, historyOf, lastDoneSessionWith } from '../db/db';
import { useProfile } from '../db/hooks';
import { addDays, dateKey, fromMinutes, nowMinutes, programWeek, toMinutes, weekdayOf } from '../lib/dates';
import { requestWakeLock } from '../lib/device';
import { bestE1rm, cutCandidate, getWorkout, nextUndoneIndex, planSession, remainingSeconds, sessionVolume } from '../lib/session';
import { incrementFor, needsDeload, progressionSuggestion } from '../lib/calc';
import type { Profile, SessionExercise, SetRec, WorkoutId, WorkoutSession } from '../types';

interface Summary {
  session: WorkoutSession;
  suggestions: Array<{ name: string; text: string }>;
  deloadMsg?: string;
}

/** Próximo passo depois de concluir uma série: supersérie alterna os dois exercícios sem descanso. */
function afterComplete(exs: SessionExercise[], idx: number): { next: number; rest: number } {
  const ex = exs[idx];
  const undone = (i: number) => !!exs[i] && exs[i].sets.some((s) => !s.done);

  if (ex.superset === 'first' && exs[idx + 1]?.superset === 'second' && undone(idx + 1)) {
    return { next: idx + 1, rest: 0 };
  }
  if (ex.superset === 'second' && exs[idx - 1]?.superset === 'first' && undone(idx - 1)) {
    return { next: idx - 1, rest: ex.restSec };
  }
  if (undone(idx)) return { next: idx, rest: ex.restSec };
  const nxt = nextUndoneIndex(exs, idx + 1);
  return { next: nxt === -1 ? idx : nxt, rest: ex.restSec };
}

function lastTextOf(sets: SetRec[] | undefined): string {
  const done = (sets ?? []).filter((s) => s.done);
  return done.length
    ? `Última vez: ${done
        .slice(0, 4)
        .map((s) => `${s.weight}×${s.reps}`)
        .join(' · ')}`
    : 'Primeira vez: escolha uma carga confortável.';
}

/** Cria a sessão de hoje a partir do plano, com o último desempenho de cada exercício. */
async function startWorkout(workoutId: WorkoutId, profile: Profile): Promise<void> {
  const workout = getWorkout(workoutId);
  if (!workout) return;
  const today = dateKey();
  const week = programWeek(profile.createdAt, today);
  const deload = !!profile.deloadUntil && today <= profile.deloadUntil;

  const lastByKey: Record<string, SetRec[] | undefined> = {};
  for (const entry of workout.entries) {
    const last = await lastDoneSessionWith(entry.exercise);
    const found = last?.exercises.find((e) => e.key === entry.exercise);
    if (found) lastByKey[entry.exercise] = found.sets;
  }

  const exercises = planSession({ workoutId, week, deload, overrides: profile.planOverrides, lastByKey });
  await db.sessions.add({
    date: today,
    workoutId,
    express: profile.classDays.includes(weekdayOf(today)),
    status: 'active',
    startedAt: Date.now(),
    week,
    exercises,
    current: 0,
    warmupDone: false,
    cardioDone: false,
  });
}

/** Aplica uma mudança na sessão dentro de uma transação (evita que toques rápidos se atropelem). */
async function mutate(id: number, fn: (s: WorkoutSession) => void): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const cur = await db.sessions.get(id);
    if (!cur) return;
    const copy = structuredClone(cur);
    fn(copy);
    await db.sessions.put(copy);
  });
}

export default function Session() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const active = useLiveQuery(async () => (await activeSession()) ?? null, []);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timer, setTimer] = useState<{ endAt: number; label: string } | null>(null);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [, setClock] = useState(0);
  const startedFor = useRef<string | null>(null);

  // Relógio de orçamento e "saída estimada" atualizam a cada 30 s.
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Inicia o treino pedido pela URL (uma única vez).
  useEffect(() => {
    if (!profile || summary || active !== null || !workoutId) return;
    if (startedFor.current === workoutId || !getWorkout(workoutId as WorkoutId)) return;
    startedFor.current = workoutId;
    void startWorkout(workoutId as WorkoutId, profile);
  }, [profile, active, workoutId, summary]);

  // Tela ligada durante o treino (Wake Lock, quando o navegador permite).
  const inSession = !!active && !summary;
  useEffect(() => {
    if (!inSession) return;
    let lock: { release(): Promise<void> } | null = null;
    let alive = true;
    const acquire = async () => {
      const l = await requestWakeLock();
      if (!alive) void l?.release();
      else lock = l;
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [inSession]);

  if (!profile || active === undefined) return <Loading />;

  if (summary) return <SummaryView summary={summary} onDone={() => navigate('/')} />;

  if (active === null) {
    if (workoutId) return <Loading />;
    return <Picker onPick={(id) => navigate(`/treino/${id}`)} />;
  }

  const s = active;
  const id = s.id as number;
  const exs = s.exercises;
  const idx = Math.min(s.current, Math.max(0, exs.length - 1));
  const ex = exs[idx];
  const allDone = exs.every((e) => e.sets.every((x) => x.done));
  const remaining = remainingSeconds(exs);
  const leaveBy = toMinutes(profile.leaveBy);
  const endEst = nowMinutes() + remaining / 60;
  const overBy = s.express && !allDone ? Math.round(endEst - leaveBy) : 0;
  const cutIdx = overBy > 0 ? cutCandidate(exs) : -1;
  const deload = !!profile.deloadUntil && dateKey() <= profile.deloadUntil;
  const mismatch = !!workoutId && workoutId !== s.workoutId;

  const setField = (exI: number, setI: number, patch: Partial<SetRec>) =>
    mutate(id, (c) => {
      Object.assign(c.exercises[exI].sets[setI], patch);
    });

  const completeSet = async (exI: number, setI: number) => {
    let rest = 0;
    let label = '';
    await mutate(id, (c) => {
      c.exercises[exI].sets[setI].done = true;
      const r = afterComplete(c.exercises, exI);
      const finished = c.exercises.every((e) => e.sets.every((x) => x.done));
      c.current = r.next;
      rest = finished ? 0 : r.rest;
      const set = c.exercises[exI].sets;
      label = `${c.exercises[exI].name} · série ${setI + 1} de ${set.length}`;
    });
    if (rest > 0) setTimer({ endAt: Date.now() + rest * 1000, label: `Descanso · ${label}` });
  };

  const undoSet = (exI: number, setI: number) =>
    mutate(id, (c) => {
      c.exercises[exI].sets[setI].done = false;
      c.current = exI;
    });

  const goTo = (i: number) => mutate(id, (c) => { c.current = i; });

  const cut = (exI: number) =>
    mutate(id, (c) => {
      const e = c.exercises[exI];
      e.sets = e.sets.filter((x) => x.done);
      e.targetSets = e.sets.length;
      const nxt = nextUndoneIndex(c.exercises, exI);
      c.current = nxt === -1 ? exI : nxt;
    });

  const swap = async (exI: number, sub: string) => {
    const key = `sub:${sub}`;
    const last = await lastDoneSessionWith(key);
    const lastSets = last?.exercises.find((e) => e.key === key)?.sets;
    await mutate(id, (c) => {
      const e = c.exercises[exI];
      e.key = key;
      e.name = sub;
      e.tip = 'Substituto escolhido na hora.';
      e.lastText = lastTextOf(lastSets);
      e.suggestText = '';
    });
    setSwapFor(null);
  };

  const finish = async () => {
    const today = dateKey();
    const finishedAt = Date.now();
    const prs: string[] = [];

    for (const e of s.exercises) {
      const best = bestE1rm(e);
      if (best <= 0) continue;
      const hist = await historyOf(e.key);
      let prior = 0;
      for (const h of hist) {
        if (h.id === id) continue;
        const he = h.exercises.find((x) => x.key === e.key);
        if (he) prior = Math.max(prior, bestE1rm(he));
      }
      if (prior > 0 && best > prior) {
        prs.push(`${e.name}: ${Math.round(best * 10) / 10} kg de 1RM estimado`);
      }
    }

    const finished: WorkoutSession = {
      ...s,
      status: 'done',
      finishedAt,
      volume: sessionVolume(s.exercises),
      prs,
    };
    await db.sessions.put(finished);

    let deloadMsg: string | undefined;
    const sameWorkout = await doneSessionsOf(s.workoutId);
    if (needsDeload(sameWorkout.slice(-3).map((x) => x.volume ?? 0))) {
      await db.profile.update('me', { deloadUntil: addDays(today, 7) });
      deloadMsg =
        'Você regrediu em duas sessões seguidas. Os próximos 7 dias são de deload: metade das séries, para recuperar.';
    }

    const suggestions = s.exercises.map((e) => {
      const sug = progressionSuggestion(e.sets, e.repMin, e.repMax, incrementFor(e.compound, e.lower));
      return { name: e.name, text: sug ? sug.text : 'Sem séries feitas.' };
    });

    setTimer(null);
    setSummary({ session: finished, suggestions, deloadMsg });
  };

  const cancel = async () => {
    if (!window.confirm('Cancelar este treino? Os registros desta sessão serão apagados.')) return;
    await db.sessions.delete(id);
  };

  const warmupDone = s.warmupDone;
  const cardioDone = s.cardioDone;

  return (
    <Page
      title={s.workoutId ? WORKOUTS.find((w) => w.id === s.workoutId)?.name ?? 'Treino' : 'Treino'}
      subtitle={`Semana ${s.week}${s.week <= 2 ? ' · readaptação: 2 séries, RIR 3' : ' · RIR alvo 1–2'}${s.express ? ' · modo expresso' : ''}`}
      right={
        <button type="button" className="btn-ghost text-sm" onClick={cancel}>
          Cancelar
        </button>
      }
    >
      {mismatch && (
        <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Você tem um treino em andamento ({WORKOUTS.find((w) => w.id === s.workoutId)?.name}). Termine ou cancele
          antes de iniciar outro.
        </div>
      )}

      {deload && (
        <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          Semana de deload: metade das séries.
        </p>
      )}

      <Section title="Relógio do treino" hint={s.express ? `Dia de faculdade: saia até ${profile.leaveBy}.` : undefined}>
        <div className="flex items-center justify-between text-sm">
          <span className="muted">Tempo restante estimado</span>
          <span className="font-semibold tabular-nums">{Math.ceil(remaining / 60)} min</span>
        </div>
        {s.express && !allDone && (
          <p className="text-sm">
            Saída estimada: <strong className="tabular-nums">{fromMinutes(endEst)}</strong>
          </p>
        )}
        {overBy > 0 && (
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p>Atrasado cerca de {overBy} min. Sugestão: cortar o último isolador.</p>
            {cutIdx >= 0 && (
              <button type="button" className="btn-ghost mt-2 w-full" onClick={() => cut(cutIdx)}>
                Cortar {exs[cutIdx].name}
              </button>
            )}
          </div>
        )}
        <div className="space-y-1">
          <CheckRow
            checked={warmupDone}
            onToggle={() => mutate(id, (c) => { c.warmupDone = !c.warmupDone; })}
            title="Aquecimento: 5 min de esteira"
            sub="Depois, 1–2 séries leves do primeiro exercício."
          />
        </div>
      </Section>

      <nav aria-label="Exercícios" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {exs.map((e, i) => {
          const done = e.sets.length > 0 && e.sets.every((x) => x.done);
          return (
            <button
              key={`${i}-${e.key}`}
              type="button"
              aria-current={i === idx}
              onClick={() => goTo(i)}
              className={`min-h-[44px] shrink-0 rounded-xl px-3 text-sm font-semibold ${
                i === idx
                  ? 'bg-emerald-700 text-white'
                  : done
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            >
              {i + 1}{done ? ' ✓' : ''}
            </button>
          );
        })}
      </nav>

      {ex && (
        <section className="card space-y-3" aria-label={`Exercício ${idx + 1}`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Exercício {idx + 1} de {exs.length}
              {ex.superset === 'first' && ' · supersérie (sem descanso até o próximo)'}
              {ex.superset === 'second' && ' · fim da supersérie'}
            </p>
            <h2 className="text-2xl font-bold leading-tight">{ex.name}</h2>
            <p className="muted mt-1">{ex.tip}</p>
          </div>

          <p className="text-sm">
            <strong>{ex.targetSets} séries</strong> · {ex.repMin}–{ex.repMax} {ex.timed ? 'segundos' : 'reps'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{ex.lastText}</p>
          {ex.suggestText && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              Sugestão: {ex.suggestText}
            </p>
          )}

          <ol className="space-y-3">
            {ex.sets.map((set, i) => (
              <li
                key={i}
                className={`rounded-2xl border p-3 ${
                  set.done
                    ? 'border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Série {i + 1}{set.done ? ' · feita ✓' : ''}</span>
                  {set.done && (
                    <button type="button" className="btn-ghost text-sm" onClick={() => undoSet(idx, i)}>
                      Desfazer
                    </button>
                  )}
                </div>
                <div className={`grid gap-3 ${ex.timed ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {!ex.timed && (
                    <div>
                      <span className="label">Carga (kg)</span>
                      <Stepper
                        big
                        label={`Carga, série ${i + 1}`}
                        value={set.weight}
                        step={ex.step}
                        onChange={(v) => setField(idx, i, { weight: v })}
                      />
                    </div>
                  )}
                  <div>
                    <span className="label">{ex.timed ? 'Segundos' : 'Reps'}</span>
                    <Stepper
                      big
                      label={`${ex.timed ? 'Segundos' : 'Reps'}, série ${i + 1}`}
                      value={set.reps}
                      step={ex.timed ? 5 : 1}
                      onChange={(v) => setField(idx, i, { reps: v })}
                    />
                  </div>
                </div>
                {!set.done && (
                  <button type="button" className="btn-primary mt-3 w-full text-lg" onClick={() => completeSet(idx, i)}>
                    Concluir série
                  </button>
                )}
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn-ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
              ← Anterior
            </button>
            <button type="button" className="btn-ghost" onClick={() => setSwapFor(idx)}>
              Trocar
            </button>
            <button type="button" className="btn-ghost" disabled={idx >= exs.length - 1} onClick={() => goTo(idx + 1)}>
              Próximo →
            </button>
          </div>
        </section>
      )}

      {allDone && (
        <Section title="Final">
          {!s.express && (
            <CheckRow
              checked={cardioDone}
              onToggle={() => mutate(id, (c) => { c.cardioDone = !c.cardioDone; })}
              title="Esteira inclinada: 10 min"
              sub="Inclinação 8–12%, cerca de 5 km/h."
            />
          )}
          <button type="button" className="btn-primary w-full" onClick={finish}>
            Encerrar treino
          </button>
        </Section>
      )}

      {!allDone && (
        <button type="button" className="btn-ghost w-full" onClick={finish}>
          Encerrar mais cedo
        </button>
      )}

      <SafetyNote />

      {swapFor !== null && exs[swapFor] && (
        <div role="dialog" aria-label="Trocar exercício" className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setSwapFor(null)}>
          <div
            className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),20px)] dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Trocar {exs[swapFor].name}</h3>
            <p className="muted">Substitutos para quando o aparelho estiver ocupado:</p>
            {exs[swapFor].subs.map((sub) => (
              <button key={sub} type="button" className="btn-ghost w-full justify-start" onClick={() => swap(swapFor, sub)}>
                {sub}
              </button>
            ))}
            <button type="button" className="btn-primary w-full" onClick={() => setSwapFor(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {timer && (
        <RestTimer
          endAt={timer.endAt}
          label={timer.label}
          onExtend={(sec) => setTimer((t) => (t ? { ...t, endAt: t.endAt + sec * 1000 } : t))}
          onClose={() => setTimer(null)}
        />
      )}
    </Page>
  );
}

function Picker({ onPick }: { onPick: (id: WorkoutId) => void }) {
  const profile = useProfile();
  const today = dateKey();
  const todayId = profile ? WORKOUTS.find((w) => profile.schedule[w.id] === weekdayOf(today))?.id : undefined;
  return (
    <Page title="Treino" subtitle="Escolha o treino de hoje ou outro qualquer.">
      <div className="space-y-3">
        {WORKOUTS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onPick(w.id)}
            className="card flex w-full items-center justify-between text-left"
          >
            <span>
              <span className="block font-semibold">
                {w.name}
                {w.id === todayId ? ' · hoje' : ''}
                {w.optional ? ' · opcional' : ''}
              </span>
              <span className="muted">{w.focus}</span>
            </span>
            <span aria-hidden className="text-2xl text-zinc-400">›</span>
          </button>
        ))}
      </div>
    </Page>
  );
}

function SummaryView({ summary, onDone }: { summary: Summary; onDone: () => void }) {
  const s = summary.session;
  const minutes = s.finishedAt && s.startedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
  const doneSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
  const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  return (
    <Page title="Treino concluído" subtitle={`${WORKOUTS.find((w) => w.id === s.workoutId)?.name ?? ''} · ${minutes} min`}>
      <Section title="Resumo">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
            <dt className="text-zinc-500">Volume total</dt>
            <dd className="text-xl font-bold tabular-nums">{s.volume ?? 0} kg</dd>
          </div>
          <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
            <dt className="text-zinc-500">Séries feitas</dt>
            <dd className="text-xl font-bold tabular-nums">{doneSets}/{totalSets}</dd>
          </div>
        </dl>
        {s.prs && s.prs.length > 0 ? (
          <div>
            <p className="font-semibold">Recordes pessoais</p>
            <ul className="list-disc pl-5 text-sm">
              {s.prs.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted">Sem recordes desta vez. Consistência vale mais que um dia perfeito.</p>
        )}
        {summary.deloadMsg && <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">{summary.deloadMsg}</p>}
      </Section>

      <Section title="Próxima vez">
        <ul className="space-y-2 text-sm">
          {summary.suggestions.map((g) => (
            <li key={g.name}>
              <span className="font-semibold">{g.name}:</span> {g.text}
            </li>
          ))}
        </ul>
      </Section>

      <button type="button" className="btn-primary w-full" onClick={onDone}>
        Voltar para Hoje
      </button>
    </Page>
  );
}
