// Cálculos do app. Tudo puro (sem DOM, sem banco) para poder ser testado com Vitest.
import type { Sex } from '../types';

const round = (x: number, casas: number) => {
  const f = 10 ** casas;
  return Math.round(x * f) / f;
};

// ---------- Gasto e metas ----------

/** Taxa metabólica basal, Mifflin-St Jeor. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'M' ? base + 5 : base - 161;
}

export interface GoalInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityFactor: number;
  deficitPct: number;
  kcalAdjust: number;
}

export interface Goals {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Calorias: gasto − déficit (padrão 15%) + ajuste semanal. Proteína 2 g/kg, gordura 0,8 g/kg, carbo o restante. */
export function macroGoals(i: GoalInput): Goals {
  const b = bmr(i.sex, i.weightKg, i.heightCm, i.age);
  const tdee = b * i.activityFactor;
  const kcal = Math.round(tdee * (1 - i.deficitPct / 100)) + i.kcalAdjust;
  const protein = Math.round(2 * i.weightKg);
  const fat = Math.round(0.8 * i.weightKg);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(b), tdee: Math.round(tdee), kcal, protein, fat, carbs };
}

// ---------- Composição corporal ----------

/**
 * % de gordura estimado pelo método US Navy (cm). Sempre é uma ESTIMATIVA.
 * Homens: pescoço e cintura. Mulheres: também quadril.
 */
export function navyBodyFat(
  sex: Sex,
  heightCm: number,
  neckCm: number,
  waistCm: number,
  hipCm?: number,
): number | null {
  if (sex === 'M') {
    const diff = waistCm - neckCm;
    if (diff <= 0) return null;
    const v = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450;
    return round(v, 1);
  }
  if (hipCm === undefined) return null;
  const diff = waistCm + hipCm - neckCm;
  if (diff <= 0) return null;
  const v = 495 / (1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(heightCm)) - 450;
  return round(v, 1);
}

// ---------- Força ----------

/** 1RM estimado (Epley). */
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export interface SetLike {
  weight: number;
  reps: number;
  done: boolean;
}

export interface Suggestion {
  weight: number;
  reps: number;
  increased: boolean;
  text: string;
}

/** Incremento de carga: +2,5 kg em compostos de membro inferior, +2 kg no resto. */
export function incrementFor(compound: boolean, lower: boolean): number {
  return compound && lower ? 2.5 : 2;
}

/**
 * Progressão dupla: se TODAS as séries bateram o topo da faixa de reps,
 * sobe a carga e volta para o início da faixa. Senão mantém a carga.
 */
export function progressionSuggestion(
  last: SetLike[],
  repMin: number,
  repMax: number,
  increment: number,
): Suggestion | null {
  const done = last.filter((s) => s.done);
  if (done.length === 0) return null;
  const weight = done[done.length - 1].weight;
  const allTop = done.every((s) => s.reps >= repMax);
  if (allTop) {
    const next = round(weight + increment, 2);
    return {
      weight: next,
      reps: repMin,
      increased: true,
      text: `Você bateu ${repMax} reps em todas as séries. Suba para ${next} kg e comece em ${repMin} reps.`,
    };
  }
  return {
    weight,
    reps: done[done.length - 1].reps,
    increased: false,
    text: `Mantenha ${weight} kg e busque subir as reps até ${repMax}.`,
  };
}

/** Deload: se as duas últimas sessões do mesmo treino regrediram em volume. */
export function needsDeload(volumesOldestFirst: number[]): boolean {
  const n = volumesOldestFirst.length;
  if (n < 3) return false;
  const [a, b, c] = volumesOldestFirst.slice(n - 3);
  return c < b && b < a;
}

export function volumeOf(sets: SetLike[]): number {
  return round(
    sets.filter((s) => s.done).reduce((acc, s) => acc + s.weight * s.reps, 0),
    1,
  );
}

// ---------- Ajuste semanal de calorias ----------

export function weeklyLossPct(prevAvg: number, currAvg: number): number {
  return ((prevAvg - currAvg) / prevAvg) * 100;
}

export function kcalAdjustSuggestion(input: {
  weeklyLossPct: number;
  stalledWeeks: number;
  waistDropping: boolean;
}): { delta: number; reason: string } {
  if (input.weeklyLossPct > 0.7) {
    return {
      delta: 150,
      reason: 'Você perdeu mais de 0,7% do peso por semana. Sugiro +150 kcal para não perder massa.',
    };
  }
  if (input.stalledWeeks >= 2 && !input.waistDropping) {
    return {
      delta: -150,
      reason: 'Peso parado há 2 semanas e a cintura não diminuiu. Sugiro −150 kcal.',
    };
  }
  return { delta: 0, reason: 'Ritmo dentro da faixa (0,3–0,7% por semana). Mantenha.' };
}

// ---------- Séries temporais ----------

export interface Point {
  date: string;
  value: number;
}

/** Número de dias desde a época (sem fuso/horário de verão). */
export function dayNum(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Média móvel: para cada dia, média dos valores dos últimos `windowDays` dias (incluindo ele). */
export function movingAverage(points: Point[], windowDays = 7): Array<Point & { avg: number }> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const pd = dayNum(p.date);
    const win = sorted.filter((q) => {
      const d = pd - dayNum(q.date);
      return d >= 0 && d < windowDays;
    });
    return { ...p, avg: round(mean(win.map((w) => w.value)) ?? p.value, 2) };
  });
}

/** Média dos valores dos últimos `days` dias até `endKey` (inclusive). */
export function windowAverage(points: Point[], endKey: string, days = 7): number | null {
  const end = dayNum(endKey);
  const vals = points.filter((p) => {
    const d = end - dayNum(p.date);
    return d >= 0 && d < days;
  });
  const m = mean(vals.map((v) => v.value));
  return m === null ? null : round(m, 2);
}

/** Horas de sono a partir de "HH:MM" de deitar e acordar (atravessa a meia-noite). */
export function sleepHours(bed: string, wake: string): number {
  const toM = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const diff = (toM(wake) - toM(bed) + 1440) % 1440;
  return round(diff / 60, 1);
}

/** Ritmo em min/km a partir de minutos e km. */
export function paceText(minutes: number, km: number): string {
  if (km <= 0) return '—';
  const perKm = minutes / km;
  const m = Math.floor(perKm);
  const s = Math.round((perKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}
