import Dexie, { type Table } from 'dexie';
import type {
  DayLog,
  Measurement,
  Photo,
  Profile,
  RunLog,
  SleepEntry,
  WeightEntry,
  WorkoutId,
  WorkoutSession,
} from '../types';

// Todos os registros e fotos ficam no IndexedDB do próprio aparelho. Nada sai daqui.
export class TreinoDB extends Dexie {
  profile!: Table<Profile, string>;
  weights!: Table<WeightEntry, string>;
  measurements!: Table<Measurement, string>;
  sessions!: Table<WorkoutSession, number>;
  dayLogs!: Table<DayLog, string>;
  sleep!: Table<SleepEntry, string>;
  photos!: Table<Photo, number>;
  runs!: Table<RunLog, number>;

  constructor(name = 'treino') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      weights: 'date',
      measurements: 'date',
      sessions: '++id, date, workoutId, status',
      dayLogs: 'date',
      sleep: 'date',
      photos: '++id, date, pose',
      runs: '++id, date',
    });
  }
}

export const db = new TreinoDB();

export function emptyDayLog(date: string): DayLog {
  return { date, checked: [], extras: [], water: 0 };
}

/** Atualiza o registro do dia com uma função pura, dentro de uma transação. */
export async function patchDayLog(date: string, fn: (d: DayLog) => DayLog): Promise<void> {
  await db.transaction('rw', db.dayLogs, async () => {
    const current = (await db.dayLogs.get(date)) ?? emptyDayLog(date);
    await db.dayLogs.put(fn(current));
  });
}

export function toggleChecked(date: string, id: string): Promise<void> {
  return patchDayLog(date, (d) => {
    const set = new Set(d.checked);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    return { ...d, checked: [...set] };
  });
}

export function activeSession(): Promise<WorkoutSession | undefined> {
  return db.sessions.where('status').equals('active').first();
}

/** Última sessão concluída que tem este exercício (exclui uma sessão, se informada). */
export function lastDoneSessionWith(key: string, excludeId?: number): Promise<WorkoutSession | undefined> {
  return db.sessions
    .orderBy('id')
    .reverse()
    .filter((s) => s.status === 'done' && s.id !== excludeId && s.exercises.some((e) => e.key === key))
    .first();
}

/** Sessões concluídas de um treino, da mais antiga para a mais nova. */
export async function doneSessionsOf(workoutId: WorkoutId): Promise<WorkoutSession[]> {
  const all = await db.sessions.where('workoutId').equals(workoutId).toArray();
  return all.filter((s) => s.status === 'done').sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

/** Todas as sessões concluídas que contêm o exercício, em ordem cronológica. */
export async function historyOf(key: string): Promise<WorkoutSession[]> {
  const all = await db.sessions.toArray();
  return all
    .filter((s) => s.status === 'done' && s.exercises.some((e) => e.key === key))
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}
