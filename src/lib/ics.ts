// Exporta a rotina semanal como .ics. Ao importar no calendário do iPhone, o próprio sistema
// gera as notificações (VALARM), inclusive com os lembretes de YoPro, creatina e saída.
import { addDays, dateKey, fromMinutes, toMinutes, weekdayOf } from './dates';
import { buildTimeline, workoutForWeekday, type RoutineConfig } from './schedule';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

const compact = (key: string) => key.replace(/-/g, '');

export function buildIcs(cfg: RoutineConfig, fromKey: string = dateKey()): string {
  const stamp = `${compact(fromKey)}T000000`;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Treino//PT-BR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Treino',
  ];

  for (let wd = 0; wd < 7; wd++) {
    const items = buildTimeline({
      ...cfg,
      weekday: wd,
      workoutId: workoutForWeekday(wd, cfg.schedule),
      classDay: cfg.classDays.includes(wd),
    });

    let first = fromKey;
    while (weekdayOf(first) !== wd) first = addDays(first, 1);

    for (const it of items) {
      const start = toMinutes(it.time);
      const end = start + 10;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${wd}-${it.id}@treino.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${compact(first)}T${fromMinutes(start).replace(':', '')}00`,
        `DTEND:${compact(first)}T${fromMinutes(end).replace(':', '')}00`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[wd]}`,
        `SUMMARY:${esc(it.label)}`,
        `DESCRIPTION:${esc(it.tip ?? '')}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(it.label)}`,
        'TRIGGER:-PT0M',
        'END:VALARM',
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
