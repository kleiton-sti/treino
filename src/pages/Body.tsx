import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PhotoSection } from '../components/PhotoSection';
import { Loading, Page, Section, SafetyNote, Stepper } from '../components/ui';
import { db } from '../db/db';
import { useProfile } from '../db/hooks';
import {
  kcalAdjustSuggestion,
  mean,
  movingAverage,
  navyBodyFat,
  sleepHours,
  weeklyLossPct,
  windowAverage,
} from '../lib/calc';
import { addDays, dateKey, daysBetween, formatDateBR, weekdayOf } from '../lib/dates';
import { proteinOfDay } from '../lib/schedule';
import type { Measurement, Profile } from '../types';

const MEASURE_FIELDS: Array<{ key: keyof Measurement; label: string; hint: string }> = [
  { key: 'waist', label: 'Cintura (cm)', hint: 'Na altura do umbigo, relaxado, sem puxar a barriga.' },
  { key: 'abdomen', label: 'Abdômen (cm)', hint: 'Na parte mais saliente, relaxado.' },
  { key: 'neck', label: 'Pescoço (cm)', hint: 'Logo abaixo da laringe, reta, sem apertar.' },
  { key: 'chest', label: 'Peito (cm)', hint: 'Na altura dos mamilos, após expirar.' },
  { key: 'armR', label: 'Braço direito contraído (cm)', hint: 'No ponto mais alto do bíceps, contraído.' },
  { key: 'armL', label: 'Braço esquerdo contraído (cm)', hint: 'Mesma medida do lado esquerdo.' },
  { key: 'thighR', label: 'Coxa direita (cm)', hint: 'No meio da coxa, em pé, peso dos dois lados.' },
  { key: 'thighL', label: 'Coxa esquerda (cm)', hint: 'Mesma medida do lado esquerdo.' },
  { key: 'hip', label: 'Quadril (cm)', hint: 'Na parte mais larga dos glúteos.' },
];

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

export default function Body() {
  const profile = useProfile();
  const today = dateKey();
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), []) ?? [];
  const measurements = useLiveQuery(() => db.measurements.orderBy('date').toArray(), []) ?? [];
  const doneSessions = useLiveQuery(() => db.sessions.where('status').equals('done').toArray(), []) ?? [];
  const sleeps = useLiveQuery(() => db.sleep.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.dayLogs.toArray(), []) ?? [];

  if (!profile) return <Loading />;

  return (
    <Page title="Corpo" subtitle="Peso, medidas e fotos. O que vale é a tendência, não um dia isolado.">
      <WeightSection profile={profile} weights={weights} today={today} />
      <MeasureSection measurements={measurements} today={today} />
      <BodyFatSection profile={profile} measurements={measurements} />
      <Panel
        profile={profile}
        weights={weights}
        measurements={measurements}
        doneSessions={doneSessions}
        sleeps={sleeps}
        logs={logs}
        today={today}
      />
      <PhotoSection />
      <SafetyNote />
    </Page>
  );
}

// ---------- Peso ----------

function WeightSection({
  profile,
  weights,
  today,
}: {
  profile: Profile;
  weights: Array<{ date: string; kg: number }>;
  today: string;
}) {
  const todays = weights.find((w) => w.date === today);
  const [kg, setKg] = useState<number>(todays?.kg ?? profile.weightKg);
  const [saved, setSaved] = useState(false);

  const series = movingAverage(weights.map((w) => ({ date: w.date, value: w.kg })));
  const avg7 = windowAverage(
    weights.map((w) => ({ date: w.date, value: w.kg })),
    today,
    7,
  );

  const save = async () => {
    await db.transaction('rw', db.weights, db.profile, async () => {
      await db.weights.put({ date: today, kg });
      await db.profile.update('me', { weightKg: kg });
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Section title="Peso" hint="Pese em jejum, ao acordar. A linha é a média móvel de 7 dias.">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <span className="label">Hoje (kg)</span>
          <Stepper label="Peso de hoje em kg" value={kg} step={0.1} min={30} onChange={setKg} big />
        </div>
        <button type="button" className="btn-primary self-end" onClick={save}>
          {saved ? 'Salvo ✓' : 'Salvar'}
        </button>
      </div>
      <p className="text-sm">
        Média de 7 dias: <strong className="tabular-nums">{avg7 ?? '—'} kg</strong>
      </p>
      {series.length > 1 ? (
        <div className="h-52 w-full" aria-label="Gráfico de peso com média móvel de 7 dias">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.map((s) => ({ ...s, date: s.date.slice(5) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" name="Peso" stroke="#a1a1aa" strokeWidth={1} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="avg" name="Média 7 dias" stroke="#047857" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="muted">Registre o peso alguns dias seguidos para ver o gráfico.</p>
      )}
    </Section>
  );
}

// ---------- Medidas ----------

function MeasureSection({ measurements, today }: { measurements: Measurement[]; today: string }) {
  const todays = measurements.find((m) => m.date === today);
  const [values, setValues] = useState<Record<string, string>>(() => toStrings(todays));
  const [loadedFor, setLoadedFor] = useState(todays ? today : '');
  const [saved, setSaved] = useState(false);

  // Carrega os valores de hoje quando a lista chega do banco.
  if (todays && loadedFor !== today) {
    setValues(toStrings(todays));
    setLoadedFor(today);
  }

  const save = async () => {
    const next: Measurement = { date: today };
    for (const f of MEASURE_FIELDS) {
      const v = num(values[f.key as string] ?? '');
      if (v !== undefined && !Number.isNaN(v)) (next as unknown as Record<string, number>)[f.key as string] = v;
    }
    const bio = num(values.bioFat ?? '');
    if (bio !== undefined && !Number.isNaN(bio)) next.bioFat = bio;
    await db.measurements.put({ ...todays, ...next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const waistSeries = measurements
    .filter((m) => m.waist !== undefined)
    .map((m) => ({ date: m.date.slice(5), waist: m.waist }));

  return (
    <Section title="Medidas" hint="A cada 2 semanas, com fita métrica. Sempre no mesmo horário e lado.">
      <details className="rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-800/60">
        <summary className="cursor-pointer font-medium">Como medir cada ponto</summary>
        <ul className="mt-2 space-y-1">
          {MEASURE_FIELDS.map((f) => (
            <li key={f.key as string}>
              <strong>{f.label.replace(/ \(cm\)/, '')}:</strong> {f.hint}
            </li>
          ))}
        </ul>
      </details>

      <div className="grid grid-cols-2 gap-3">
        {MEASURE_FIELDS.map((f) => (
          <div key={f.key as string}>
            <label className="label" htmlFor={`m-${f.key as string}`}>{f.label}</label>
            <input
              id={`m-${f.key as string}`}
              inputMode="decimal"
              className="w-full"
              value={values[f.key as string] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key as string]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="m-bio">% gordura da balança de bioimpedância (opcional)</label>
        <input
          id="m-bio"
          inputMode="decimal"
          className="w-full"
          value={values.bioFat ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, bioFat: e.target.value }))}
        />
        <p className="muted mt-1">Balanças dão tendência, com baixa precisão. Use só para acompanhar a direção.</p>
      </div>

      <button type="button" className="btn-primary w-full" onClick={save}>
        {saved ? 'Medidas salvas ✓' : 'Salvar medidas de hoje'}
      </button>

      {waistSeries.length > 1 && (
        <div className="h-44 w-full" aria-label="Gráfico da cintura">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={waistSeries} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="waist" name="Cintura (cm)" stroke="#047857" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}

function toStrings(m: Measurement | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const [k, v] of Object.entries(m)) {
    if (k !== 'date' && typeof v === 'number') out[k] = String(v);
  }
  return out;
}

// ---------- %G ----------

function BodyFatSection({ profile, measurements }: { profile: Profile; measurements: Measurement[] }) {
  const latestNavy = [...measurements].reverse().find((m) => m.neck !== undefined && m.waist !== undefined);
  const navy = latestNavy
    ? navyBodyFat(profile.sex, profile.heightCm, latestNavy.neck!, latestNavy.waist!, latestNavy.hip)
    : null;
  const latestBio = [...measurements].reverse().find((m) => m.bioFat !== undefined);

  return (
    <Section title="Gordura corporal estimada" hint="Estimativa pelo método US Navy. Não é medição.">
      {navy !== null && latestNavy ? (
        <p>
          <span className="text-3xl font-bold tabular-nums">{navy}%</span>{' '}
          <span className="muted">em {formatDateBR(latestNavy.date)}</span>
        </p>
      ) : (
        <p className="muted">
          Registre pescoço e cintura{profile.sex === 'F' ? ', e quadril,' : ''} nas medidas para ver a estimativa.
        </p>
      )}
      {latestBio && (
        <p className="text-sm">
          Balança de bioimpedância: {latestBio.bioFat}% (baixa precisão, use a tendência).
        </p>
      )}
      <p className="muted">
        Referência visual do objetivo: físico atlético e definido, perto de 10–12% de gordura.
      </p>
    </Section>
  );
}

// ---------- Painel e ajuste semanal ----------

function Panel({
  profile,
  weights,
  measurements,
  doneSessions,
  sleeps,
  logs,
  today,
}: {
  profile: Profile;
  weights: Array<{ date: string; kg: number }>;
  measurements: Measurement[];
  doneSessions: Array<{ date: string }>;
  sleeps: Array<{ date: string; bed: string; wake: string }>;
  logs: Array<{ date: string; checked: string[]; extras: Array<{ label: string; protein: number }>; water: number }>;
  today: string;
}) {
  const wPts = weights.map((w) => ({ date: w.date, value: w.kg }));
  const avgNow = windowAverage(wPts, today, 7);
  const avgPrev = windowAverage(wPts, addDays(today, -7), 7);
  const avgPrev2 = windowAverage(wPts, addDays(today, -14), 7);
  const avgPrev3 = windowAverage(wPts, addDays(today, -21), 7);

  const lastWaist = [...measurements].reverse().find((m) => m.waist !== undefined);
  const prevWaist = [...measurements].reverse().filter((m) => m.waist !== undefined)[1];
  const waistDropping = !!lastWaist && !!prevWaist && lastWaist.waist! < prevWaist.waist!;

  const weekWorkouts = doneSessions.filter((s) => {
    const d = daysBetween(s.date, today);
    return d >= 0 && d < 7;
  }).length;

  const cfg = { schedule: profile.schedule, times: profile.times, classDays: profile.classDays, leaveBy: profile.leaveBy };
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const proteins: number[] = [];
  for (let d = 0; d < 7; d++) {
    const key = addDays(today, -d);
    const log = logByDate.get(key);
    if (log) {
      proteins.push(proteinOfDay(log, weekdayOf(key), cfg));
    }
  }
  const proteinAvg = mean(proteins);

  const sleepVals = sleeps
    .filter((s) => s.bed && s.wake && daysBetween(s.date, today) >= 0 && daysBetween(s.date, today) < 7)
    .map((s) => sleepHours(s.bed, s.wake));
  const sleepAvg = mean(sleepVals);

  // Ajuste semanal: queda da média de peso e cintura.
  const loss = avgNow !== null && avgPrev !== null ? weeklyLossPct(avgPrev, avgNow) : null;
  let stalledWeeks = 0;
  if (avgNow !== null && avgPrev !== null && avgNow >= avgPrev) stalledWeeks = 1;
  if (stalledWeeks === 1 && avgPrev !== null && avgPrev2 !== null && avgPrev >= avgPrev2) stalledWeeks = 2;
  if (stalledWeeks === 2 && avgPrev2 !== null && avgPrev3 !== null && avgPrev2 >= avgPrev3) stalledWeeks = 3;
  const canAdjust = loss !== null;
  const suggestion = canAdjust
    ? kcalAdjustSuggestion({ weeklyLossPct: loss!, stalledWeeks, waistDropping })
    : null;

  const [applied, setApplied] = useState(false);
  const apply = async () => {
    if (!suggestion || suggestion.delta === 0) return;
    await db.profile.update('me', { kcalAdjust: (profile.kcalAdjust ?? 0) + suggestion.delta });
    setApplied(true);
  };

  const rows: Array<[string, string]> = [
    ['Peso médio (7 dias)', avgNow !== null ? `${avgNow} kg` : '—'],
    ['Cintura (última)', lastWaist ? `${lastWaist.waist} cm` : '—'],
    ['%G estimado (último)', measurements.length ? latestNavyText(profile, measurements) : '—'],
    ['Treinos concluídos (7 dias)', String(weekWorkouts)],
    ['Proteína média (7 dias)', proteinAvg !== null ? `${Math.round(proteinAvg)} g` : 'sem registros'],
    ['Sono médio (7 dias)', sleepAvg !== null ? `${sleepAvg.toFixed(1).replace('.', ',')} h` : 'sem registros'],
  ];

  return (
    <Section title="Painel">
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="font-semibold">Ajuste semanal de calorias</p>
        {suggestion ? (
          <>
            <p className="text-sm">
              Queda da média semanal: <strong>{loss!.toFixed(2).replace('.', ',')}%</strong> (faixa ideal: 0,3–0,7%).
            </p>
            <p className="muted mt-1">{suggestion.reason}</p>
            {suggestion.delta !== 0 && !applied && (
              <button type="button" className="btn-ghost mt-2 w-full" onClick={apply}>
                Aplicar {suggestion.delta > 0 ? '+' : ''}{suggestion.delta} kcal
              </button>
            )}
            {applied && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">Ajuste aplicado. Calorias alvo atualizadas.</p>}
          </>
        ) : (
          <p className="muted">Registre o peso por pelo menos 2 semanas para receber a sugestão.</p>
        )}
      </div>
    </Section>
  );
}

function latestNavyText(profile: Profile, measurements: Measurement[]): string {
  const m = [...measurements].reverse().find((x) => x.neck !== undefined && x.waist !== undefined);
  if (!m) return '—';
  const v = navyBodyFat(profile.sex, profile.heightCm, m.neck!, m.waist!, m.hip);
  return v === null ? '—' : `${v}%`;
}
