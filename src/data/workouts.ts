import type { Schedule, WorkoutId } from '../types';

export interface WorkoutEntry {
  /** Id em EXERCISES. */
  exercise: string;
  sets: number;
  repMin: number;
  repMax: number;
  timed?: boolean;
  /** Este exercício e o próximo formam uma supersérie. */
  superset?: boolean;
}

export interface Workout {
  id: WorkoutId;
  name: string;
  focus: string;
  group: 'upper' | 'lower' | 'pump';
  optional?: boolean;
  /** Descanso fixo (usado no pump, que é mais curto). */
  restOverride?: number;
  entries: WorkoutEntry[];
}

const e = (
  exercise: string,
  sets: number,
  repMin: number,
  repMax: number,
  extra: Partial<WorkoutEntry> = {},
): WorkoutEntry => ({ exercise, sets, repMin, repMax, ...extra });

export const WORKOUTS: Workout[] = [
  {
    id: 'superiorA',
    name: 'Superior A',
    focus: 'Foco peito',
    group: 'upper',
    entries: [
      e('supino_reto', 3, 6, 10),
      e('puxada_frontal', 3, 8, 12),
      e('supino_inclinado', 3, 8, 12),
      e('remada_baixa', 3, 8, 12),
      e('elevacao_lateral', 3, 12, 20),
      e('triceps_corda', 2, 10, 15, { superset: true }),
      e('rosca_direta', 2, 10, 15),
    ],
  },
  {
    id: 'inferiorA',
    name: 'Inferior A',
    focus: 'Foco quadríceps',
    group: 'lower',
    entries: [
      e('agachamento', 3, 6, 10),
      e('stiff', 3, 8, 10),
      e('cadeira_extensora', 2, 10, 15),
      e('mesa_flexora', 2, 10, 15),
      e('panturrilha_pe', 3, 10, 15),
      e('prancha', 2, 30, 45, { timed: true }),
    ],
  },
  {
    id: 'pump',
    name: 'Pump',
    focus: 'Peito, ombro lateral e braços (40 min)',
    group: 'pump',
    optional: true,
    restOverride: 45,
    entries: [
      e('crucifixo_maquina', 2, 12, 15),
      e('elevacao_lateral', 2, 12, 15),
      e('crucifixo_inverso', 2, 12, 15),
      e('rosca_martelo', 2, 12, 15),
      e('triceps_corda', 2, 12, 15),
      e('abdominal_polia', 2, 12, 15),
    ],
  },
  {
    id: 'superiorB',
    name: 'Superior B',
    focus: 'Foco ombro, costas e braços',
    group: 'upper',
    entries: [
      e('desenvolvimento_halter', 3, 6, 10),
      e('remada_curvada', 3, 8, 12),
      e('crucifixo_maquina', 3, 10, 15),
      e('puxada_neutra', 2, 8, 12),
      e('elevacao_lateral', 3, 12, 20),
      e('rosca_inclinada', 3, 10, 15, { superset: true }),
      e('triceps_frances', 3, 10, 15),
    ],
  },
  {
    id: 'inferiorB',
    name: 'Inferior B',
    focus: 'Foco posterior, glúteo e core',
    group: 'lower',
    entries: [
      e('leg_press', 3, 8, 12),
      e('hip_thrust', 3, 8, 12),
      e('afundo_bulgaro', 2, 8, 12),
      e('mesa_flexora', 2, 10, 15),
      e('panturrilha_sentado', 3, 12, 20),
      e('abdominal_polia', 3, 10, 15),
    ],
  },
];

/** Dias padrão: seg superior A, qua inferior A, sex pump (opcional), sáb superior B, dom inferior B. */
export const DEFAULT_SCHEDULE: Schedule = {
  superiorA: 1,
  inferiorA: 3,
  pump: 5,
  superiorB: 6,
  inferiorB: 0,
};

export const DEFAULT_CLASS_DAYS = [1, 3];
