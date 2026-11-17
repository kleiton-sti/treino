// Planejamento e regras da sessão de treino. Pura: não acessa o banco.
import { EXERCISES } from '../data/exercises';
import { WORKOUTS } from '../data/workouts';
import type { PlanOverrides, SessionExercise, SetRec, WorkoutId } from '../types';
import { epley, incrementFor, progressionSuggestion, type SetLike } from './calc';

export const SECONDS_PER_SET = 45;
export const SECONDS_PER_TIMED_SET = 40;
export const REST_SUPERSET_SEC = 90;

export function getWorkout(id: WorkoutId) {
  return WORKOUTS.find((w) => w.id === id);
}

export interface PlanInput {
  workoutId: WorkoutId;
  /** Semana do programa (1 = primeira). Semanas 1–2 são de readaptação (2 séries, RIR 3). */
  week: number;
  deload: boolean;
  overrides: PlanOverrides;
  /** Último registro de cada exercício (pela chave), para pré-preencher e sugerir progressão. */
  lastByKey: Record<string, SetLike[] | undefined>;
}

export function planSession(input: PlanInput): SessionExercise[] {
  const workout = getWorkout(input.workoutId);
  if (!workout) return [];
  const ov = input.overrides[input.workoutId] ?? {};

  return workout.entries.map((entry, idx) => {
    const ex = EXERCISES[entry.exercise];
    const o = ov[entry.exercise] ?? {};
    const sets = o.sets ?? entry.sets;
    const repMin = o.repMin ?? entry.repMin;
    const repMax = o.repMax ?? entry.repMax;

    let targetSets = sets;
    if (input.deload) targetSets = Math.max(1, Math.ceil(sets / 2));
    else if (input.week <= 2) targetSets = Math.min(2, sets);

    const prev = workout.entries[idx - 1];
    const superset: 'first' | 'second' | undefined = entry.superset
      ? 'first'
      : prev?.superset
        ? 'second'
        : undefined;

    const restBase = workout.restOverride ?? (ex.compound ? 150 : 75);
    const restSec = superset === 'first' ? 0 : superset === 'second' ? REST_SUPERSET_SEC : restBase;

    const key = entry.exercise;
    const last = input.lastByKey[key];
    const lastDone = last ? last.filter((s) => s.done) : [];
    const sug = last ? progressionSuggestion(last, repMin, repMax, incrementFor(ex.compound, ex.lower)) : null;
    const lastSet = lastDone[lastDone.length - 1];
    const weight = sug?.weight ?? lastSet?.weight ?? 0;
    const reps = sug?.reps ?? lastSet?.reps ?? repMin;

    const initialSets: SetRec[] = Array.from({ length: targetSets }, () => ({ weight, reps, done: false }));

    return {
      key,
      exerciseId: entry.exercise,
      name: ex.name,
      compound: ex.compound,
      lower: ex.lower,
      tip: ex.tip,
      subs: ex.subs,
      targetSets,
      repMin,
      repMax,
      restSec,
      superset,
      timed: !!entry.timed,
      step: ex.compound && ex.lower ? 2.5 : 1,
      sets: initialSets,
      lastText: lastDone.length
        ? `Última vez: ${lastDone
            .slice(0, 4)
            .map((s) => `${s.weight}×${s.reps}`)
            .join(' · ')}`
        : 'Primeira vez: escolha uma carga confortável.',
      suggestText: sug?.text ?? '',
    };
  });
}

/** Próximo exercício (a partir de `from`, com volta) que ainda tem séries pendentes. */
export function nextUndoneIndex(exs: SessionExercise[], from: number): number {
  for (let k = 0; k < exs.length; k++) {
    const i = (from + k) % exs.length;
    if (exs[i].sets.some((s) => !s.done)) return i;
  }
  return -1;
}

/** Tempo estimado (segundos) para terminar as séries pendentes, incluindo descanso. */
export function remainingSeconds(exs: SessionExercise[]): number {
  return exs.reduce((total, ex) => {
    const undone = ex.sets.filter((s) => !s.done).length;
    const work = ex.timed ? SECONDS_PER_TIMED_SET : SECONDS_PER_SET;
    return total + undone * (work + ex.restSec);
  }, 0);
}

export function sessionVolume(exs: SessionExercise[]): number {
  return Math.round(
    exs.reduce((acc, ex) => acc + ex.sets.filter((s) => s.done).reduce((a, s) => a + s.weight * s.reps, 0), 0) * 10,
  ) / 10;
}

/** Melhor 1RM estimado de um exercício nesta sessão. */
export function bestE1rm(ex: SessionExercise): number {
  return Math.max(0, ...ex.sets.filter((s) => s.done).map((s) => epley(s.weight, s.reps)));
}

/** Dica do "último exercício" a cortar quando o relógio de orçamento estoura: o último isolador pendente. */
export function cutCandidate(exs: SessionExercise[]): number {
  for (let i = exs.length - 1; i >= 0; i--) {
    if (!exs[i].compound && exs[i].sets.some((s) => !s.done)) return i;
  }
  return -1;
}
