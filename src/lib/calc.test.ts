import { describe, expect, it } from 'vitest';
import {
  bmr,
  epley,
  kcalAdjustSuggestion,
  macroGoals,
  movingAverage,
  navyBodyFat,
  needsDeload,
  paceText,
  progressionSuggestion,
  sleepHours,
  weeklyLossPct,
  windowAverage,
} from './calc';

describe('gasto e metas', () => {
  it('TMB (Mifflin-St Jeor) para homem', () => {
    // 10*72 + 6.25*169 - 5*27 + 5
    expect(bmr('M', 72, 169, 27)).toBeCloseTo(1646.25, 2);
  });

  it('metas: gasto −15%, proteína 2 g/kg, gordura 0,8 g/kg, carbo o restante', () => {
    const g = macroGoals({
      sex: 'M',
      weightKg: 72,
      heightCm: 169,
      age: 27,
      activityFactor: 1.5,
      deficitPct: 15,
      kcalAdjust: 0,
    });
    expect(g.tdee).toBe(2469);
    expect(g.kcal).toBe(2099);
    expect(g.protein).toBe(144);
    expect(g.fat).toBe(58);
    expect(g.carbs).toBe(250);
  });

  it('ajuste semanal entra nas calorias', () => {
    const base = macroGoals({ sex: 'M', weightKg: 72, heightCm: 169, age: 27, activityFactor: 1.5, deficitPct: 15, kcalAdjust: 0 });
    const up = macroGoals({ sex: 'M', weightKg: 72, heightCm: 169, age: 27, activityFactor: 1.5, deficitPct: 15, kcalAdjust: 150 });
    expect(up.kcal - base.kcal).toBe(150);
  });
});

describe('US Navy %G (estimativa)', () => {
  it('homem: pescoço 38, cintura 90, altura 169 → ~21,7%', () => {
    const v = navyBodyFat('M', 169, 38, 90);
    expect(v).not.toBeNull();
    expect(v!).toBeGreaterThan(21.5);
    expect(v!).toBeLessThan(21.9);
  });

  it('retorna null se cintura não for maior que pescoço', () => {
    expect(navyBodyFat('M', 169, 40, 40)).toBeNull();
  });
});

describe('força', () => {
  it('Epley: 100 kg × 5 reps ≈ 116,7 kg', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 1);
  });

  it('Epley com 1 rep devolve a própria carga', () => {
    expect(epley(80, 1)).toBe(80);
  });

  it('progressão dupla: bateu o topo em todas as séries → sobe carga e volta ao início', () => {
    const last = [
      { weight: 20, reps: 12, done: true },
      { weight: 20, reps: 12, done: true },
      { weight: 20, reps: 12, done: true },
    ];
    const s = progressionSuggestion(last, 8, 12, 2);
    expect(s).not.toBeNull();
    expect(s!.increased).toBe(true);
    expect(s!.weight).toBe(22);
    expect(s!.reps).toBe(8);
  });

  it('progressão dupla: se uma série não bateu o topo, mantém a carga', () => {
    const last = [
      { weight: 20, reps: 12, done: true },
      { weight: 20, reps: 10, done: true },
    ];
    const s = progressionSuggestion(last, 8, 12, 2);
    expect(s!.increased).toBe(false);
    expect(s!.weight).toBe(20);
  });

  it('progressão ignora séries não feitas', () => {
    expect(progressionSuggestion([{ weight: 10, reps: 8, done: false }], 8, 12, 2)).toBeNull();
  });

  it('deload: duas sessões seguidas com queda de volume', () => {
    expect(needsDeload([10, 9, 8])).toBe(true);
    expect(needsDeload([10, 9, 10])).toBe(false);
    expect(needsDeload([9, 8])).toBe(false);
  });
});

describe('ajuste semanal de calorias', () => {
  it('perda acima de 0,7% por semana → +150 kcal', () => {
    const loss = weeklyLossPct(72, 71.2); // ~1,1%
    expect(kcalAdjustSuggestion({ weeklyLossPct: loss, stalledWeeks: 0, waistDropping: true }).delta).toBe(150);
  });

  it('2 semanas paradas e cintura parada → −150 kcal', () => {
    expect(kcalAdjustSuggestion({ weeklyLossPct: 0, stalledWeeks: 2, waistDropping: false }).delta).toBe(-150);
  });

  it('ritmo saudável → sem mudança', () => {
    const loss = weeklyLossPct(72, 71.5); // ~0,7%
    expect(kcalAdjustSuggestion({ weeklyLossPct: 0.5, stalledWeeks: 0, waistDropping: true }).delta).toBe(0);
    expect(loss).toBeCloseTo(0.69, 1);
  });
});

describe('séries temporais', () => {
  it('média móvel de 7 dias', () => {
    const pts = [
      { date: '2026-03-01', value: 70 },
      { date: '2026-03-02', value: 72 },
      { date: '2026-03-03', value: 74 },
    ];
    const out = movingAverage(pts, 7);
    expect(out[2].avg).toBe(72);
    expect(out[0].avg).toBe(70);
  });

  it('média móvel ignora dias fora da janela', () => {
    const pts = [
      { date: '2026-03-01', value: 100 },
      { date: '2026-03-10', value: 70 },
    ];
    expect(movingAverage(pts, 7)[1].avg).toBe(70);
  });

  it('média da janela até uma data', () => {
    const pts = [
      { date: '2026-03-05', value: 70 },
      { date: '2026-03-07', value: 72 },
    ];
    expect(windowAverage(pts, '2026-03-07', 7)).toBe(71);
  });
});

describe('sono e ritmo', () => {
  it('sono atravessando a meia-noite', () => {
    expect(sleepHours('23:30', '06:00')).toBe(6.5);
  });

  it('ritmo em min/km', () => {
    expect(paceText(30, 5)).toBe('6:00 /km');
    expect(paceText(0, 0)).toBe('—');
  });
});
