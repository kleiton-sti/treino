import { type ReactNode, useEffect, useRef, useState } from 'react';
import { beep, vibrate } from '../lib/device';

export function Page({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-28 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Loading() {
  return <div className="p-6 text-zinc-500">Carregando…</div>;
}

/** Campo numérico com botões − e +. Aceita vírgula ou ponto. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  big = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  big?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (v: number) => {
    const n = Number.isFinite(v) ? Math.max(min, Math.round(v * 100) / 100) : min;
    onChange(n);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Diminuir ${label}`}
        className="btn-ghost h-12 w-12 shrink-0 text-2xl"
        onClick={() => commit(value - step)}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="decimal"
        className={`w-full text-center font-bold tabular-nums ${big ? 'h-14 text-3xl' : 'h-12 text-xl'}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(parseFloat(text.replace(',', '.')))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(parseFloat(text.replace(',', '.')));
        }}
      />
      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        className="btn-ghost h-12 w-12 shrink-0 text-2xl"
        onClick={() => commit(value + step)}
      >
        +
      </button>
    </div>
  );
}

export function CheckRow({
  checked,
  onToggle,
  title,
  sub,
  time,
  right,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  sub?: string;
  time?: string;
  right?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className="flex min-h-[44px] w-full items-start gap-3 rounded-xl py-2 text-left active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
          checked
            ? 'border-emerald-700 bg-emerald-700 text-white'
            : 'border-zinc-400 dark:border-zinc-600'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          {time && <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{time}</span>}
          <span className={`font-medium ${checked ? 'text-zinc-400 line-through dark:text-zinc-500' : ''}`}>{title}</span>
        </span>
        {sub && <span className="block text-sm text-zinc-500 dark:text-zinc-400">{sub}</span>}
      </span>
      {right}
    </button>
  );
}

export function SafetyNote() {
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      Dor articular aguda é motivo para parar. Este app não substitui médico ou nutricionista.
    </p>
  );
}

/** Temporizador de descanso. `endAt` é um timestamp, então sobrevive a trocar de aba. */
export function RestTimer({
  endAt,
  label,
  onExtend,
  onClose,
}: {
  endAt: number;
  label: string;
  onExtend: (sec: number) => void;
  onClose: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const alerted = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((endAt - now) / 1000));

  useEffect(() => {
    if (left === 0 && !alerted.current) {
      alerted.current = true;
      beep(3);
      vibrate(300);
    }
  }, [left]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div
      role="dialog"
      aria-label="Descanso"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-zinc-300 bg-white p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
    >
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="my-2 text-center font-mono text-6xl font-bold tabular-nums">
        {mm}:{ss}
      </p>
      {left === 0 && <p className="text-center font-semibold text-emerald-600 dark:text-emerald-400">Próxima série!</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" className="btn-ghost" onClick={() => onExtend(15)}>
          +15 s
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          {left === 0 ? 'Vamos' : 'Pular'}
        </button>
      </div>
    </div>
  );
}
