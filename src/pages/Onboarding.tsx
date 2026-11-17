import { useState } from 'react';
import { ProfileForm, type ProfileValues } from '../components/ProfileForm';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { SafetyNote, Section } from '../components/ui';
import { db } from '../db/db';
import { DEFAULT_TIMES } from '../data/meals';
import { DEFAULT_CLASS_DAYS, DEFAULT_SCHEDULE } from '../data/workouts';
import { macroGoals } from '../lib/calc';
import { dateKey } from '../lib/dates';
import { requestPersistence } from '../lib/device';
import { routineBaselineProtein } from '../lib/schedule';
import type { Profile, Schedule } from '../types';

export default function Onboarding() {
  const [values, setValues] = useState<ProfileValues | null>(null);
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [classDays, setClassDays] = useState<number[]>(DEFAULT_CLASS_DAYS);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!values) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-[max(env(safe-area-inset-top),24px)]">
        <header>
          <h1 className="text-2xl font-bold">Bem-vindo ao Treino</h1>
          <p className="muted">
            Preencha seus dados. Eles ficam só neste aparelho. O código do app não guarda nenhum dado pessoal.
          </p>
        </header>
        <div className="card">
          <ProfileForm submitLabel="Ver meu plano" onSave={setValues} />
        </div>
      </div>
    );
  }

  const goals = macroGoals({ ...values, kcalAdjust: 0 });
  const baseline = routineBaselineProtein({ schedule, times: DEFAULT_TIMES, classDays });

  const save = async () => {
    setSaving(true);
    const today = dateKey();
    const profile: Profile = {
      id: 'me',
      ...values,
      kcalAdjust: 0,
      runningEnabled: running,
      schedule,
      classDays,
      leaveBy: '18:45',
      times: DEFAULT_TIMES,
      planOverrides: {},
      createdAt: today,
      runWeek: 1,
    };
    await db.transaction('rw', db.profile, db.weights, async () => {
      await db.profile.put(profile);
      await db.weights.put({ date: today, kg: values.weightKg });
    });
    await requestPersistence();
    // A tela principal aparece sozinha: o App observa o perfil.
  };

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-[max(env(safe-area-inset-top),24px)]">
      <header>
        <h1 className="text-2xl font-bold">Seu plano</h1>
        <p className="muted">Confira os números e ajuste os dias antes de começar.</p>
      </header>

      <Section title="Suas metas">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Gasto basal (TMB)" value={`${goals.bmr} kcal`} />
          <Stat label="Gasto diário" value={`${goals.tdee} kcal`} />
          <Stat label="Calorias alvo" value={`${goals.kcal} kcal`} strong />
          <Stat label="Proteína" value={`${goals.protein} g`} strong />
          <Stat label="Gordura" value={`${goals.fat} g`} />
          <Stat label="Carboidrato" value={`${goals.carbs} g`} />
        </dl>
        <p className="muted">
          Estimativa com a fórmula de Mifflin-St Jeor. Déficit leve de {values.deficitPct}% para recomposição corporal.
        </p>
      </Section>

      <Section title="Diagnóstico de proteína">
        <p>
          Com a rotina atual (YoPro + almoço + whey), a proteína fica em cerca de <strong>{baseline} g/dia</strong>, abaixo
          da meta de {goals.protein} g. Os pontos mais fáceis de corrigir são o <strong>café da manhã</strong> e o{' '}
          <strong>jantar</strong>.
        </p>
      </Section>

      <Section title="Dias de treino" hint="Você pode trocar isso depois, em Ajustes.">
        <ScheduleEditor
          schedule={schedule}
          onChange={setSchedule}
          classDays={classDays}
          onClassDaysChange={setClassDays}
        />
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={running}
            onChange={(e) => setRunning(e.target.checked)}
          />
          <span>
            Quero o módulo de <strong>corrida</strong> no fim de semana (programa de 8 semanas)
          </span>
        </label>
      </Section>

      <SafetyNote />

      <div className="flex gap-3">
        <button type="button" className="btn-ghost flex-1" onClick={() => setValues(null)}>
          Voltar
        </button>
        <button type="button" className="btn-primary flex-1" disabled={saving} onClick={save}>
          {saving ? 'Salvando…' : 'Salvar e começar'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className={strong ? 'text-lg font-bold tabular-nums' : 'font-semibold tabular-nums'}>{value}</dd>
    </div>
  );
}
