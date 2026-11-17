import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, DEFAULT_CLASS_DAYS } from '../data/workouts';
import { DEFAULT_TIMES } from '../data/meals';
import {
  baselineProtein,
  buildTimeline,
  currentItem,
  routineBaselineProtein,
  scheduleWarnings,
  workoutForWeekday,
  sumProtein,
} from './schedule';
import { buildIcs } from './ics';

const cfg = { schedule: DEFAULT_SCHEDULE, times: DEFAULT_TIMES, classDays: DEFAULT_CLASS_DAYS };

describe('agenda padrão', () => {
  it('seg = superior A, qua = inferior A, sex = pump, sáb = superior B, dom = inferior B', () => {
    expect(workoutForWeekday(1, DEFAULT_SCHEDULE)).toBe('superiorA');
    expect(workoutForWeekday(3, DEFAULT_SCHEDULE)).toBe('inferiorA');
    expect(workoutForWeekday(5, DEFAULT_SCHEDULE)).toBe('pump');
    expect(workoutForWeekday(6, DEFAULT_SCHEDULE)).toBe('superiorB');
    expect(workoutForWeekday(0, DEFAULT_SCHEDULE)).toBe('inferiorB');
    expect(workoutForWeekday(2, DEFAULT_SCHEDULE)).toBeNull();
  });

  it('não gera avisos com a agenda padrão', () => {
    expect(scheduleWarnings(DEFAULT_SCHEDULE)).toEqual([]);
  });

  it('avisa quando dois treinos do mesmo tipo ficam em dias seguidos', () => {
    const bad = { ...DEFAULT_SCHEDULE, superiorA: 1, superiorB: 2 };
    expect(scheduleWarnings(bad).length).toBeGreaterThan(0);
  });

  it('avisa quando dois treinos caem no mesmo dia', () => {
    const bad = { ...DEFAULT_SCHEDULE, pump: 1 };
    expect(scheduleWarnings(bad).some((w) => w.includes('mesmo dia'))).toBe(true);
  });
});

describe('linha do tempo', () => {
  it('proteína da rotina de base ≈ 110 g (YoPro + almoço + whey)', () => {
    // café 2 + YoPro 23 + almoço 40 + whey 44 = 109
    expect(routineBaselineProtein(cfg)).toBe(109);
  });

  it('o jantar é sugestão e não entra na base', () => {
    const items = buildTimeline({ ...cfg, weekday: 2, workoutId: null, classDay: false });
    expect(baselineProtein(items)).toBe(109);
    expect(sumProtein(items, ['jantar'])).toBe(35);
  });

  it('terça: lanche às 16:45 é "Agora" às 16:45', () => {
    const items = buildTimeline({ ...cfg, weekday: 2, workoutId: null, classDay: false });
    const now = 16 * 60 + 45;
    expect(currentItem(items, new Set(), now)?.id).toBe('lanche');
  });

  it('segunda (faculdade) traz o modo expresso e a saída até 18:45', () => {
    const items = buildTimeline({ ...cfg, weekday: 1, workoutId: 'superiorA', classDay: true });
    const treino = items.find((i) => i.id === 'treino');
    expect(treino?.tip).toContain('18:45');
    expect(items.some((i) => i.id === 'levar')).toBe(true);
  });

  it('todos os itens do dia ficam ordenados por horário', () => {
    const items = buildTimeline({ ...cfg, weekday: 5, workoutId: 'pump', classDay: false });
    const times = items.map((i) => i.time);
    expect([...times].sort()).toEqual(times);
  });
});

describe('exportação .ics', () => {
  it('gera eventos recorrentes semanais com alarme', () => {
    const ics = buildIcs({ ...cfg, leaveBy: '18:45' }, '2026-11-17');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
});
