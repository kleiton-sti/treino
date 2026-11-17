export type WorkoutId = 'superiorA' | 'inferiorA' | 'pump' | 'superiorB' | 'inferiorB';

/** Dia da semana (0 = domingo … 6 = sábado) para cada treino. */
export type Schedule = Record<WorkoutId, number>;

export type TimeKey =
  | 'wake'
  | 'yopro'
  | 'castanha'
  | 'almoco'
  | 'lanche'
  | 'saida'
  | 'treino'
  | 'posTreino'
  | 'jantar'
  | 'estudo'
  | 'dormir';

export type Times = Record<TimeKey, string>;
export type Sex = 'M' | 'F';

export interface PlanOverride {
  sets?: number;
  repMin?: number;
  repMax?: number;
}
export type PlanOverrides = Partial<Record<WorkoutId, Record<string, PlanOverride>>>;

export interface Profile {
  id: 'me';
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityFactor: number;
  deficitPct: number;
  /** Ajuste semanal acumulado (+/- 150 kcal). */
  kcalAdjust: number;
  runningEnabled: boolean;
  schedule: Schedule;
  /** Dias de faculdade (modo expresso e lembretes). Padrão: seg (1) e qua (3). */
  classDays: number[];
  /** Horário limite para sair da academia nos dias de faculdade. */
  leaveBy: string;
  times: Times;
  planOverrides: PlanOverrides;
  /** Data (AAAA-MM-DD) em que o usuário começou. Usada para calcular a semana do programa. */
  createdAt: string;
  /** Até esta data o treino roda em deload (metade das séries). */
  deloadUntil?: string;
  runWeek: number;
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export interface Measurement {
  date: string;
  neck?: number;
  waist?: number;
  abdomen?: number;
  chest?: number;
  armR?: number;
  armL?: number;
  thighR?: number;
  thighL?: number;
  hip?: number;
  /** Valor de balança de bioimpedância (opcional, baixa precisão). */
  bioFat?: number;
}

export interface SetRec {
  weight: number;
  reps: number;
  done: boolean;
}

export interface SessionExercise {
  /** Chave de histórico: id do exercício do plano ou "sub:<nome>" quando trocado. */
  key: string;
  exerciseId: string;
  name: string;
  compound: boolean;
  lower: boolean;
  tip: string;
  subs: string[];
  targetSets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  superset?: 'first' | 'second';
  timed: boolean;
  step: number;
  sets: SetRec[];
  lastText: string;
  suggestText: string;
}

export interface WorkoutSession {
  id?: number;
  date: string;
  workoutId: WorkoutId;
  express: boolean;
  status: 'active' | 'done';
  startedAt: number;
  finishedAt?: number;
  week: number;
  exercises: SessionExercise[];
  current: number;
  warmupDone: boolean;
  cardioDone: boolean;
  volume?: number;
  prs?: string[];
}

export interface Extra {
  label: string;
  protein: number;
}

export interface DayLog {
  date: string;
  checked: string[];
  extras: Extra[];
  water: number;
}

export interface SleepEntry {
  date: string;
  bed: string;
  wake: string;
}

export type Pose = 'front' | 'side' | 'back';

export interface Photo {
  id?: number;
  date: string;
  pose: Pose;
  blob: Blob;
}

export interface RunLog {
  id?: number;
  date: string;
  km: number;
  minutes: number;
  rpe: number;
  week: number;
}
