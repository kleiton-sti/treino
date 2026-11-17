import { useState } from 'react';
import type { Sex } from '../types';

export interface ProfileValues {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityFactor: number;
  deficitPct: number;
}

const ACTIVITY = [
  { value: 1.2, label: 'Sedentário (pouco ou nenhum exercício)' },
  { value: 1.375, label: 'Leve (1–3 dias por semana)' },
  { value: 1.5, label: 'Moderado (3–5 dias por semana) — padrão' },
  { value: 1.725, label: 'Intenso (6–7 dias por semana)' },
];

const DEFICIT = [
  { value: 10, label: '10% (mais suave)' },
  { value: 15, label: '15% (recomendado)' },
  { value: 20, label: '20% (mais agressivo)' },
];

export function ProfileForm({
  initial,
  onSave,
  submitLabel,
  onCancel,
}: {
  initial?: Partial<ProfileValues>;
  onSave: (v: ProfileValues) => void | Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [age, setAge] = useState(String(initial?.age ?? ''));
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'M');
  const [height, setHeight] = useState(String(initial?.heightCm ?? ''));
  const [weight, setWeight] = useState(String(initial?.weightKg ?? ''));
  const [activity, setActivity] = useState(initial?.activityFactor ?? 1.5);
  const [deficit, setDeficit] = useState(initial?.deficitPct ?? 15);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v: ProfileValues = {
      age: Number(age.replace(',', '.')),
      sex,
      heightCm: Number(height.replace(',', '.')),
      weightKg: Number(weight.replace(',', '.')),
      activityFactor: activity,
      deficitPct: deficit,
    };
    if (!(v.age >= 10 && v.age <= 100)) return setError('Informe uma idade válida.');
    if (!(v.heightCm >= 120 && v.heightCm <= 230)) return setError('Informe a altura em centímetros.');
    if (!(v.weightKg >= 30 && v.weightKg <= 300)) return setError('Informe o peso em quilos.');
    setError('');
    void onSave(v);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="age">Idade</label>
          <input id="age" inputMode="numeric" className="w-full" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="sex">Sexo</label>
          <select id="sex" className="w-full" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="height">Altura (cm)</label>
          <input id="height" inputMode="numeric" className="w-full" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="weight">Peso atual (kg)</label>
          <input id="weight" inputMode="decimal" className="w-full" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="activity">Nível de atividade (fator do gasto)</label>
        <select id="activity" className="w-full" value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
          {ACTIVITY.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="deficit">Déficit calórico</label>
        <select id="deficit" className="w-full" value={deficit} onChange={(e) => setDeficit(Number(e.target.value))}>
          {DEFICIT.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" className="btn-ghost flex-1" onClick={onCancel}>Cancelar</button>
        )}
        <button type="submit" className="btn-primary flex-1">{submitLabel}</button>
      </div>
    </form>
  );
}
