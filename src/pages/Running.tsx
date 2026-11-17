import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Loading, Page, Section, SafetyNote } from '../components/ui';
import { RUN_PLAN, type RunStep } from '../data/running';
import { db } from '../db/db';
import { useProfile } from '../db/hooks';
import { paceText } from '../lib/calc';
import { dateKey, formatDateBR } from '../lib/dates';
import { beep, requestWakeLock, unlockAudio, vibrate } from '../lib/device';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Running() {
  const profile = useProfile();
  const runs = useLiveQuery(() => db.runs.orderBy('date').reverse().toArray(), []) ?? [];
  const [timer, setTimer] = useState(false);
  const [km, setKm] = useState('');
  const [minutes, setMinutes] = useState('');
  const [rpe, setRpe] = useState(6);
  const [error, setError] = useState('');

  if (!profile) return <Loading />;

  const week = RUN_PLAN.find((w) => w.week === profile.runWeek) ?? RUN_PLAN[0];
  const today = dateKey();
  const thisWeekLogs = runs.filter((r) => r.week === profile.runWeek).length;

  const setWeek = (n: number) =>
    db.profile.update('me', { runWeek: Math.min(8, Math.max(1, n)) });

  const logRun = async () => {
    const k = Number(km.replace(',', '.'));
    const m = Number(minutes.replace(',', '.'));
    if (!(k > 0) || !(m > 0)) {
      setError('Informe a distância (km) e o tempo (minutos).');
      return;
    }
    setError('');
    await db.runs.add({ date: today, km: k, minutes: m, rpe, week: profile.runWeek });
    setKm('');
    setMinutes('');
  };

  if (timer) return <IntervalTimer steps={week.steps} title={`Semana ${week.week}`} onExit={() => setTimer(false)} />;

  return (
    <Page title="Corrida" subtitle="Programa de 8 semanas até 5 km contínuos, intercalando corrida e caminhada.">
      <Section title={`Semana ${profile.runWeek} de 8`} hint={week.title}>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            unlockAudio();
            setTimer(true);
          }}
        >
          Iniciar sessão com cronômetro
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost" disabled={profile.runWeek <= 1} onClick={() => setWeek(profile.runWeek - 1)}>
            ← Semana anterior
          </button>
          <button type="button" className="btn-ghost" disabled={profile.runWeek >= 8} onClick={() => setWeek(profile.runWeek + 1)}>
            Próxima semana →
          </button>
        </div>
        <p className="muted">
          {thisWeekLogs > 0
            ? `Você já registrou ${thisWeekLogs} sessão(ões) nesta semana. Avance quando se sentir pronto.`
            : 'Recomendado: 1 a 2 sessões por fim de semana. Avance quando completar a semana com conforto.'}
        </p>
        <p className="muted">
          Regra: se correr no mesmo dia do Inferior, corra leve e depois do treino, ou em outro dia.
        </p>
      </Section>

      <Section title="Programa completo">
        <ol className="space-y-2 text-sm">
          {RUN_PLAN.map((w) => (
            <li key={w.week} className={w.week === profile.runWeek ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''}>
              Semana {w.week}: {w.title}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Registrar corrida" hint="Distância, tempo, pace calculado e percepção de esforço (1 a 10).">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="run-km">Distância (km)</label>
            <input id="run-km" inputMode="decimal" className="w-full" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="run-min">Tempo (min)</label>
            <input id="run-min" inputMode="decimal" className="w-full" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="run-rpe">Esforço percebido (1 a 10)</label>
          <select id="run-rpe" className="w-full" value={rpe} onChange={(e) => setRpe(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        {km && minutes && Number(km.replace(',', '.')) > 0 && (
          <p className="text-sm">
            Pace: <strong>{paceText(Number(minutes.replace(',', '.')), Number(km.replace(',', '.')))}</strong>
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="button" className="btn-primary w-full" onClick={logRun}>Salvar corrida</button>
      </Section>

      <Section title="Histórico">
        {runs.length === 0 ? (
          <p className="muted">Nenhuma corrida registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {runs.map((r) => (
              <li key={r.id} className="flex justify-between py-2 text-sm">
                <span>{formatDateBR(r.date)} · {r.km.toString().replace('.', ',')} km em {r.minutes} min</span>
                <span className="text-zinc-500 tabular-nums">{paceText(r.minutes, r.km)} · esforço {r.rpe}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <SafetyNote />
    </Page>
  );
}

/** Cronômetro de intervalos (corre/caminha) com bipes. Mantém a tela ligada quando o navegador permite. */
function IntervalTimer({ steps, title, onExit }: { steps: RunStep[]; title: string; onExit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(steps[0].sec);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = steps.reduce((a, s) => a + s.sec, 0);
  const elapsed = steps.slice(0, idx).reduce((a, s) => a + s.sec, 0) + (steps[idx].sec - left);

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      if (left > 1) {
        setLeft(left - 1);
        if (left - 1 <= 3) beep(1, 660);
        return;
      }
      if (idx < steps.length - 1) {
        const n = idx + 1;
        setIdx(n);
        setLeft(steps[n].sec);
        beep(2, steps[n].kind === 'run' ? 980 : 520);
        return;
      }
      setRunning(false);
      setFinished(true);
      beep(3, 1200);
      vibrate(400);
    }, 1000);
    return () => clearTimeout(id);
  }, [running, left, idx, steps]);

  useEffect(() => {
    if (!running) return;
    let lock: { release(): Promise<void> } | null = null;
    let alive = true;
    void requestWakeLock().then((l) => {
      if (!alive) void l?.release();
      else lock = l;
    });
    return () => {
      alive = false;
      void lock?.release().catch(() => undefined);
    };
  }, [running]);

  const step = steps[idx];
  return (
    <Page title={title} subtitle="Cronômetro de intervalos">
      <section className="card space-y-4 text-center" aria-live="polite">
        <p className="text-sm uppercase tracking-wide text-zinc-500">{finished ? 'Concluído' : step.kind === 'run' ? 'Corra' : 'Caminhe'}</p>
        <p className="font-mono text-7xl font-bold tabular-nums">{mmss(finished ? 0 : left)}</p>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden>
          <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} />
        </div>
        <p className="muted">Passo {idx + 1} de {steps.length} · {mmss(elapsed)} de {mmss(total)}</p>
        <div className="grid grid-cols-2 gap-3">
          {!finished && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                unlockAudio();
                setRunning((r) => !r);
              }}
            >
              {running ? 'Pausar' : 'Começar'}
            </button>
          )}
          <button type="button" className={finished ? 'btn-primary col-span-2' : 'btn-ghost'} onClick={onExit}>
            {finished ? 'Voltar' : 'Sair'}
          </button>
        </div>
      </section>
    </Page>
  );
}
