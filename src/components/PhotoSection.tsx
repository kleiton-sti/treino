import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { dateKey, formatDateBR } from '../lib/dates';
import type { Photo, Pose } from '../types';
import { Section } from './ui';

export const POSES: Record<Pose, string> = { front: 'Frente', side: 'Perfil', back: 'Costas' };

/** Mostra um Blob como imagem, liberando a URL ao sair da tela. */
export function BlobImg({ blob, alt, className, style }: { blob: Blob; alt: string; className?: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img src={url} alt={alt} className={className} style={style} draggable={false} /> : null;
}

/** Linhas de referência para repetir a mesma pose e distância. */
function PoseGuide() {
  return (
    <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <line x1="150" y1="0" x2="150" y2="400" stroke="white" strokeOpacity="0.7" strokeDasharray="6 6" />
      <line x1="0" y1="60" x2="300" y2="60" stroke="white" strokeOpacity="0.5" strokeDasharray="4 6" />
      <line x1="0" y1="130" x2="300" y2="130" stroke="white" strokeOpacity="0.5" strokeDasharray="4 6" />
      <line x1="0" y1="270" x2="300" y2="270" stroke="white" strokeOpacity="0.5" strokeDasharray="4 6" />
      <text x="8" y="54" fill="white" fillOpacity="0.8" fontSize="12">topo da cabeça</text>
      <text x="8" y="124" fill="white" fillOpacity="0.8" fontSize="12">ombros</text>
      <text x="8" y="264" fill="white" fillOpacity="0.8" fontSize="12">quadril</text>
    </svg>
  );
}

export function PhotoSection() {
  const [pose, setPose] = useState<Pose>('front');
  const [pending, setPending] = useState<{ blob: Blob; date: string } | null>(null);
  const [overlay, setOverlay] = useState(40);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState('');

  const photos = useLiveQuery(() => db.photos.where('pose').equals(pose).sortBy('date'), [pose]) ?? [];
  const reference = photos.length ? photos[photos.length - 1] : undefined;

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setPending({ blob: file, date: dateKey() });
    setError('');
  };

  const save = async () => {
    if (!pending) return;
    try {
      await db.photos.add({ date: pending.date, pose, blob: pending.blob });
      setPending(null);
    } catch {
      setError('Não consegui salvar a foto. Pode ser falta de espaço no aparelho.');
    }
  };

  const remove = async (p: Photo) => {
    if (!window.confirm(`Apagar a foto de ${formatDateBR(p.date)}?`)) return;
    await db.photos.delete(p.id as number);
    setSelected((s) => s.filter((x) => x !== p.id));
  };

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]));

  const pair = selected.length === 2 ? selected.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as Photo[] : [];
  const [before, after] = pair.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Section
      title="Fotos de progresso"
      hint="A cada 4 semanas, mesma luz, mesma distância. Ficam só neste aparelho."
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pose">
        {(Object.keys(POSES) as Pose[]).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pose === p}
            className={`min-h-[44px] rounded-xl px-4 font-medium ${pose === p ? 'bg-emerald-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}
            onClick={() => {
              setPose(p);
              setSelected([]);
              setPending(null);
            }}
          >
            {POSES[p]}
          </button>
        ))}
      </div>

      {!pending ? (
        <label className="btn-primary w-full cursor-pointer">
          Tirar ou escolher foto ({POSES[pose].toLowerCase()})
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900">
            <BlobImg blob={pending.blob} alt="Nova foto" className="absolute inset-0 h-full w-full object-cover" />
            {reference && (
              <BlobImg
                blob={reference.blob}
                alt="Foto anterior como guia"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: overlay / 100 }}
              />
            )}
            <PoseGuide />
          </div>
          {reference ? (
            <div>
              <label className="label" htmlFor="overlay">Guia: foto anterior ({formatDateBR(reference.date)})</label>
              <input
                id="overlay"
                type="range"
                min={0}
                max={100}
                value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="w-full"
              />
            </div>
          ) : (
            <p className="muted">Primeira foto desta pose: ela vira a referência para as próximas.</p>
          )}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" onClick={() => setPending(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={save}>Salvar foto</button>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className="label">Toque em duas fotos para comparar (antes e depois)</p>
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((p) => {
              const on = selected.includes(p.id as number);
              return (
                <li key={p.id} className="space-y-1">
                  <div className="relative">
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`Foto de ${formatDateBR(p.date)}`}
                      onClick={() => toggle(p.id as number)}
                      className={`block aspect-[3/4] w-full overflow-hidden rounded-xl ring-2 ${on ? 'ring-emerald-600' : 'ring-transparent'}`}
                    >
                      <BlobImg blob={p.blob} alt="" className="h-full w-full object-cover" />
                    </button>
                    {on && (
                      <span className="absolute left-1 top-1 rounded-md bg-emerald-700 px-1.5 text-xs font-bold text-white">
                        {selected.indexOf(p.id as number) === 0 ? 'A' : 'B'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="tabular-nums">{formatDateBR(p.date).slice(0, 5)}</span>
                    <button type="button" className="px-1 underline" onClick={() => remove(p)}>apagar</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {before && after && (
        <Comparator before={before} after={after} />
      )}
    </Section>
  );
}

function Comparator({ before, after }: { before: Photo; after: Photo }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="space-y-2">
      <p className="label">
        Antes ({formatDateBR(before.date)}) · Depois ({formatDateBR(after.date)})
      </p>
      <div className="relative aspect-[3/4] select-none overflow-hidden rounded-2xl bg-zinc-900">
        <BlobImg blob={after.blob} alt="Depois" className="absolute inset-0 h-full w-full object-cover" />
        <BlobImg
          blob={before.blob}
          alt="Antes"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }} aria-hidden />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Deslize para comparar antes e depois"
        className="w-full"
      />
    </div>
  );
}
