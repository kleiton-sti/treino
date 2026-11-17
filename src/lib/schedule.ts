import { CREATINE_TIP } from '../data/meals';
import { WORKOUTS } from '../data/workouts';
import type { DayLog, Schedule, Times, WorkoutId } from '../types';
import { toMinutes, WEEKDAYS_LONG } from './dates';

export type ItemKind = 'food' | 'supp' | 'train' | 'routine' | 'study' | 'sleep';

export interface TimelineItem {
  id: string;
  time: string;
  label: string;
  tip?: string;
  /** Proteína estimada (g) do item conforme a rotina atual. */
  protein: number;
  /** Sugestão do app (não conta na proteína da rotina atual, só no dia com a sugestão feita). */
  suggested?: boolean;
  kind: ItemKind;
}

export interface RoutineConfig {
  schedule: Schedule;
  times: Times;
  classDays: number[];
  leaveBy?: string;
}

export interface DayContext extends RoutineConfig {
  weekday: number;
  workoutId: WorkoutId | null;
  classDay: boolean;
}

export function workoutForWeekday(weekday: number, schedule: Schedule): WorkoutId | null {
  const found = WORKOUTS.find((w) => schedule[w.id] === weekday);
  return found ? found.id : null;
}

export function buildTimeline(ctx: DayContext): TimelineItem[] {
  const { times: t, classDay } = ctx;
  const workout = WORKOUTS.find((w) => w.id === ctx.workoutId) ?? null;
  const leaveBy = ctx.leaveBy ?? '18:45';

  const items: TimelineItem[] = [
    {
      id: 'cafe',
      time: t.wake,
      label: 'Café + bolacha',
      tip: 'Sugestão: 2 ovos cozidos preparados na véspera, ou 1 banana + 1 copo de leite. Mantém a praticidade.',
      protein: 2,
      kind: 'food',
    },
  ];

  if (classDay) {
    items.push({
      id: 'levar',
      time: t.wake,
      label: 'Levar whey em pó no shaker + lanche',
      tip: 'Lanche da faculdade: fruta + castanha, ou sanduíche.',
      protein: 0,
      kind: 'routine',
    });
  }

  items.push(
    { id: 'yopro', time: t.yopro, label: 'YoPro 23 g', tip: 'Prefira o de 23 g.', protein: 23, kind: 'supp' },
    {
      id: 'castanha',
      time: t.castanha,
      label: 'Castanhas: porção de 30 g',
      tip: 'Castanha é muito calórica. Meça 30 g, não coma direto do pote.',
      protein: 0,
      kind: 'food',
    },
    {
      id: 'almoco',
      time: t.almoco,
      label: 'Almoço: arroz, feijão e carne (150–200 g)',
      tip: 'Prato: ½ salada ou legume, ¼ carne, ¼ arroz e feijão.',
      protein: 40,
      kind: 'food',
    },
    workout
      ? {
          id: 'lanche',
          time: t.lanche,
          label: 'Maçã antes do treino',
          tip: 'Se a proteína do dia estiver baixa, some iogurte ou YoPro.',
          protein: 0,
          kind: 'food',
        }
      : {
          id: 'lanche',
          time: t.lanche,
          label: 'Lanche da tarde',
          tip: 'Fruta + castanha, ou iogurte/YoPro se a proteína estiver baixa.',
          protein: 0,
          kind: 'food',
        },
    {
      id: 'saida',
      time: t.saida,
      label: workout ? 'Sair do trabalho rumo à academia' : 'Sair do trabalho: casa cedo',
      protein: 0,
      kind: 'routine',
    },
  );

  if (workout) {
    items.push({
      id: 'treino',
      time: t.treino,
      label: `Treino: ${workout.name}${workout.optional ? ' (opcional)' : ''}`,
      tip: classDay
        ? `Modo expresso (dia de faculdade): saia até ${leaveBy}. Esteira só no aquecimento.`
        : workout.focus,
      protein: 0,
      kind: 'train',
    });
  } else {
    items.push({
      id: 'caminhada',
      time: t.treino,
      label: 'Caminhada leve (opcional)',
      tip: 'Dia de descanso: chegue cedo em casa, estude e durma mais cedo.',
      protein: 0,
      kind: 'routine',
    });
  }

  items.push(
    {
      id: 'whey',
      time: t.posTreino,
      label: 'Whey: 2 scoops',
      tip: workout ? 'Pós-treino.' : 'Shake de proteína do dia.',
      protein: 44,
      kind: 'supp',
    },
    { id: 'creatina', time: t.posTreino, label: 'Creatina (3–5 g)', tip: CREATINE_TIP, protein: 0, kind: 'supp' },
    {
      id: 'jantar',
      time: t.jantar,
      label: 'Jantar de verdade: proteína + arroz/legume',
      tip: 'Se o whey for a única coisa da noite, o dia fecha com pouca comida.',
      protein: 35,
      suggested: true,
      kind: 'food',
    },
    { id: 'estudo', time: t.estudo, label: 'Estudo (até 23:00)', protein: 0, kind: 'study' },
    {
      id: 'dormir',
      time: t.dormir,
      label: 'Deitar (luz apagada até 23:15)',
      tip: 'Meta: 7 h de sono. Hoje a média é de cerca de 6 h.',
      protein: 0,
      kind: 'sleep',
    },
  );

  return items.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/** Soma a proteína dos itens marcados. */
export function sumProtein(items: TimelineItem[], checked: Iterable<string>): number {
  const set = new Set(checked);
  return items.reduce((acc, i) => (set.has(i.id) ? acc + i.protein : acc), 0);
}

/** Proteína da rotina "de base" (sem as sugestões do app). Usada no diagnóstico. */
export function baselineProtein(items: TimelineItem[]): number {
  return items.filter((i) => !i.suggested).reduce((acc, i) => acc + i.protein, 0);
}

/** Proteína de um dia: itens marcados + adições rápidas. */
export function proteinOfDay(log: DayLog | undefined, weekday: number, cfg: RoutineConfig): number {
  const items = buildTimeline({
    ...cfg,
    weekday,
    workoutId: workoutForWeekday(weekday, cfg.schedule),
    classDay: cfg.classDays.includes(weekday),
  });
  const extra = (log?.extras ?? []).reduce((acc, x) => acc + x.protein, 0);
  return sumProtein(items, log?.checked ?? []) + extra;
}

/** Item "Agora": o primeiro pendente a partir de 30 min antes do horário atual. */
export function currentItem(items: TimelineItem[], checked: Set<string>, nowMin: number): TimelineItem | null {
  const pending = items.filter((i) => !checked.has(i.id));
  if (pending.length === 0) return null;
  return pending.find((i) => toMinutes(i.time) >= nowMin - 30) ?? pending[pending.length - 1];
}

/** Avisos de combinação ruim de dias. */
export function scheduleWarnings(schedule: Schedule): string[] {
  const out: string[] = [];
  for (let i = 0; i < WORKOUTS.length; i++) {
    for (let j = i + 1; j < WORKOUTS.length; j++) {
      const a = WORKOUTS[i];
      const b = WORKOUTS[j];
      const da = schedule[a.id];
      const db = schedule[b.id];
      const diff = Math.abs(da - db);
      const gap = Math.min(diff, 7 - diff);
      if (gap === 0) {
        out.push(`${a.name} e ${b.name} caem no mesmo dia.`);
      } else if (gap === 1 && a.group === b.group && !a.optional && !b.optional) {
        out.push(
          `${a.name} e ${b.name} ficam em dias seguidos (${WEEKDAYS_LONG[da]} e ${WEEKDAYS_LONG[db]}). Deixe pelo menos 1 dia entre sessões do mesmo tipo.`,
        );
      }
    }
  }
  return out;
}

/** Proteína da rotina de base (um dia de treino típico). */
export function routineBaselineProtein(cfg: RoutineConfig): number {
  const items = buildTimeline({ ...cfg, weekday: 2, workoutId: 'superiorA', classDay: false });
  return baselineProtein(items);
}
