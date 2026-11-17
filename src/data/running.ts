// Programa iniciante de 8 semanas até 5 km contínuos (intercalando corrida e caminhada).

export interface RunStep {
  kind: 'run' | 'walk';
  sec: number;
}

export interface RunWeek {
  week: number;
  title: string;
  steps: RunStep[];
}

const alternate = (blocks: number, runMin: number, walkMin: number): RunStep[] =>
  Array.from({ length: blocks }, () => [
    { kind: 'run' as const, sec: runMin * 60 },
    { kind: 'walk' as const, sec: walkMin * 60 },
  ]).flat();

export const RUN_PLAN: RunWeek[] = [
  { week: 1, title: '8 × (1 min correndo + 2 min caminhando)', steps: alternate(8, 1, 2) },
  { week: 2, title: '8 × (2 min correndo + 2 min caminhando)', steps: alternate(8, 2, 2) },
  { week: 3, title: '6 × (3 min correndo + 2 min caminhando)', steps: alternate(6, 3, 2) },
  { week: 4, title: '5 × (5 min correndo + 2 min caminhando)', steps: alternate(5, 5, 2) },
  { week: 5, title: '4 × (8 min correndo + 2 min caminhando)', steps: alternate(4, 8, 2) },
  { week: 6, title: '3 × (10 min correndo + 2 min caminhando)', steps: alternate(3, 10, 2) },
  { week: 7, title: '2 × (15 min correndo + 3 min caminhando)', steps: alternate(2, 15, 3) },
  { week: 8, title: '30 min contínuos', steps: [{ kind: 'run', sec: 30 * 60 }] },
];
