import { db } from './db';

// Backup em JSON. Inclui fotos em base64 se pedido (arquivo maior).
// Importar SUBSTITUI todos os dados do aparelho pelo conteúdo do arquivo.

interface PhotoJson {
  date: string;
  pose: string;
  dataUrl: string;
}

interface BackupFile {
  app: 'treino';
  version: 1;
  exportedAt: string;
  includesPhotos: boolean;
  profile: unknown[];
  weights: unknown[];
  measurements: unknown[];
  sessions: unknown[];
  dayLogs: unknown[];
  sleep: unknown[];
  runs: unknown[];
  photos: PhotoJson[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function exportBackup(includePhotos: boolean): Promise<Blob> {
  const photos: PhotoJson[] = includePhotos
    ? await Promise.all(
        (await db.photos.toArray()).map(async (p) => ({
          date: p.date,
          pose: p.pose,
          dataUrl: await blobToDataUrl(p.blob),
        })),
      )
    : [];

  const file: BackupFile = {
    app: 'treino',
    version: 1,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    profile: await db.profile.toArray(),
    weights: await db.weights.toArray(),
    measurements: await db.measurements.toArray(),
    sessions: await db.sessions.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    sleep: await db.sleep.toArray(),
    runs: await db.runs.toArray(),
    photos,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export async function importBackup(file: File): Promise<void> {
  const data = JSON.parse(await file.text()) as BackupFile;
  if (data.app !== 'treino' || data.version !== 1) {
    throw new Error('Este arquivo não é um backup do Treino.');
  }

  const photos: Array<{ date: string; pose: 'front' | 'side' | 'back'; blob: Blob }> = [];
  for (const p of data.photos ?? []) {
    const blob = await fetch(p.dataUrl).then((r) => r.blob());
    photos.push({ date: p.date, pose: p.pose as 'front' | 'side' | 'back', blob });
  }

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    if (data.profile?.length) await db.profile.bulkPut(data.profile as never[]);
    if (data.weights?.length) await db.weights.bulkPut(data.weights as never[]);
    if (data.measurements?.length) await db.measurements.bulkPut(data.measurements as never[]);
    if (data.sessions?.length) await db.sessions.bulkPut(data.sessions as never[]);
    if (data.dayLogs?.length) await db.dayLogs.bulkPut(data.dayLogs as never[]);
    if (data.sleep?.length) await db.sleep.bulkPut(data.sleep as never[]);
    if (data.runs?.length) await db.runs.bulkPut(data.runs as never[]);
    if (photos.length) await db.photos.bulkAdd(photos);
  });
}
