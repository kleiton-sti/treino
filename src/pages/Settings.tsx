import { useEffect, useState } from 'react';
import { ProfileForm, type ProfileValues } from '../components/ProfileForm';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { Loading, Page, SafetyNote, Section } from '../components/ui';
import { TIME_LABELS } from '../data/meals';
import { db } from '../db/db';
import { exportBackup, importBackup } from '../db/backup';
import { useProfile } from '../db/hooks';
import { dateKey, formatDateBR } from '../lib/dates';
import { applyTheme, downloadBlob, getLastBackup, getTheme, markBackupDone, setTheme, type Theme } from '../lib/device';
import { buildIcs } from '../lib/ics';
import type { Profile, Schedule, TimeKey } from '../types';

export default function Settings() {
  const profile = useProfile();
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [message, setMessage] = useState('');
  const lastBackup = getLastBackup();

  useEffect(() => {
    void navigator.storage?.persisted?.().then((v) => setPersisted(v)).catch(() => setPersisted(null));
  }, []);

  if (!profile) return <Loading />;

  const saveProfile = async (v: ProfileValues) => {
    const patch: Partial<Profile> = { ...v };
    await db.profile.update('me', patch);
    setMessage('Perfil salvo.');
  };

  const saveSchedule = (schedule: Schedule) => db.profile.update('me', { schedule });
  const saveClassDays = (classDays: number[]) => db.profile.update('me', { classDays });

  const doExport = async () => {
    const blob = await exportBackup(includePhotos);
    downloadBlob(blob, `treino-backup-${dateKey()}.json`);
    markBackupDone();
    setMessage('Backup gerado. Guarde o arquivo em um lugar seguro (ele tem seus dados).');
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    if (!window.confirm('Importar vai SUBSTITUIR todos os dados deste aparelho pelo conteúdo do arquivo. Continuar?')) return;
    try {
      await importBackup(file);
      setMessage('Backup restaurado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível importar este arquivo.');
    }
  };

  const doIcs = () => {
    const ics = buildIcs({
      schedule: profile.schedule,
      times: profile.times,
      classDays: profile.classDays,
      leaveBy: profile.leaveBy,
    });
    downloadBlob(new Blob([ics], { type: 'text/calendar' }), 'treino-rotina.ics');
    setMessage('Arquivo .ics gerado. Abra no iPhone para importar ao calendário.');
  };

  const doReset = async () => {
    if (!window.confirm('Apagar TODOS os dados deste aparelho? Isso não pode ser desfeito. Exporte um backup antes.')) return;
    await Promise.all(db.tables.map((t) => t.clear()));
  };

  const changeTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    setThemeState(t);
  };

  return (
    <Page title="Ajustes" subtitle="Tudo guardado só neste aparelho.">
      {message && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </p>
      )}

      <Section title="Perfil" hint="Altere quando mudar peso, altura ou nível de atividade.">
        <ProfileForm
          initial={profile}
          submitLabel="Salvar perfil"
          onSave={saveProfile}
        />
      </Section>

      <Section title="Dias de treino" hint="O app mantém pelo menos 1 dia entre sessões do mesmo tipo e avisa se a combinação ficar ruim.">
        <ScheduleEditor
          schedule={profile.schedule}
          onChange={saveSchedule}
          classDays={profile.classDays}
          onClassDaysChange={saveClassDays}
        />
        <div>
          <label className="label" htmlFor="leave-by">Horário limite para sair da academia (dias de faculdade)</label>
          <input
            id="leave-by"
            type="time"
            className="w-full"
            value={profile.leaveBy}
            onChange={(e) => e.target.value && db.profile.update('me', { leaveBy: e.target.value })}
          />
        </div>
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={profile.runningEnabled}
            onChange={(e) => db.profile.update('me', { runningEnabled: e.target.checked })}
          />
          <span>Módulo de corrida ativado</span>
        </label>
      </Section>

      <Section title="Horários da rotina" hint="Usados na linha do tempo do dia e no arquivo de calendário.">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(TIME_LABELS) as TimeKey[]).map((key) => (
            <div key={key}>
              <label className="label" htmlFor={`time-${key}`}>{TIME_LABELS[key]}</label>
              <input
                id={`time-${key}`}
                type="time"
                className="w-full"
                value={profile.times[key]}
                onChange={(e) =>
                  e.target.value &&
                  db.profile.update('me', { times: { ...profile.times, [key]: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tema">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tema">
          {(['dark', 'light'] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              className={theme === t ? 'btn-primary' : 'btn-ghost'}
              onClick={() => changeTheme(t)}
            >
              {t === 'dark' ? 'Escuro' : 'Claro'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Backup e dados" hint="Exporte a cada 2 semanas. Nenhum dado sai do aparelho sem você exportar.">
        <p className="muted">
          Último backup: {lastBackup ? formatDateBR(dateKey(lastBackup)) : 'nunca'}.
          {' '}Armazenamento persistente: {persisted === null ? 'não informado' : persisted ? 'ativo' : 'não garantido'}.
        </p>
        <label className="flex min-h-[44px] items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
          <span>Incluir fotos no backup (arquivo maior)</span>
        </label>
        <button type="button" className="btn-primary w-full" onClick={doExport}>Exportar backup (JSON)</button>
        <label className="btn-ghost w-full cursor-pointer">
          Importar backup (JSON)
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              void doImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <button type="button" className="btn-ghost w-full" onClick={doIcs}>Exportar rotina como calendário (.ics)</button>
        <p className="muted">
          No iPhone: abra o arquivo .ics e escolha "Adicionar Tudo". Os lembretes de YoPro, creatina, saída e sono viram notificações nativas.
        </p>
        <button type="button" className="btn-danger w-full" onClick={doReset}>Apagar todos os dados deste aparelho</button>
      </Section>

      <Section title="Instalar no iPhone">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Abra o link do app no Safari.</li>
          <li>Toque em Compartilhar (quadrado com seta).</li>
          <li>Toque em "Adicionar à Tela de Início".</li>
          <li>Abra pelo ícone. Depois disso, ele funciona offline.</li>
        </ol>
      </Section>

      <SafetyNote />
    </Page>
  );
}
