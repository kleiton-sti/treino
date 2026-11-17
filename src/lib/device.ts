// Pequenas preferências (localStorage), som, tela ligada e download. Tudo com try/catch:
// em modo privado ou com o armazenamento bloqueado, o app continua funcionando.

const KEY = {
  theme: 'treino.theme',
  lastBackup: 'treino.lastBackup',
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível: ignora */
  }
}

export type Theme = 'dark' | 'light';

export function getTheme(): Theme {
  return read(KEY.theme) === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: Theme): void {
  write(KEY.theme, theme);
  applyTheme(theme);
}

export function getLastBackup(): Date | null {
  const v = read(KEY.lastBackup);
  return v ? new Date(v) : null;
}

export function markBackupDone(): void {
  write(KEY.lastBackup, new Date().toISOString());
}

/** Pede ao navegador que não apague os dados (Safari apaga sites pouco usados). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ---------- Som ----------

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

/** Deve ser chamado dentro de um toque do usuário (exigência do iOS). */
export function unlockAudio(): void {
  try {
    const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* sem áudio */
  }
}

export function beep(times = 1, freq = 880): void {
  try {
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const start = ctx.currentTime + i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.25;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    }
  } catch {
    /* sem áudio */
  }
}

export function vibrate(ms = 200): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* iOS não suporta vibração na web */
  }
}

// ---------- Tela ligada ----------

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

export async function requestWakeLock(): Promise<WakeLockSentinelLike | null> {
  try {
    const wl = (navigator as Navigator & {
      wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
    }).wakeLock;
    return (await wl?.request('screen')) ?? null;
  } catch {
    return null;
  }
}

// ---------- Download ----------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
