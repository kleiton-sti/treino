import type { TimeKey, Times } from '../types';

/** Horários padrão da rotina (editáveis em Ajustes). */
export const DEFAULT_TIMES: Times = {
  wake: '06:15',
  yopro: '08:00',
  castanha: '10:30',
  almoco: '12:00',
  lanche: '16:45',
  saida: '17:00',
  treino: '17:50',
  posTreino: '20:00',
  jantar: '20:30',
  estudo: '21:00',
  dormir: '23:00',
};

export const TIME_LABELS: Record<TimeKey, string> = {
  wake: 'Acordar / café',
  yopro: 'YoPro',
  castanha: 'Castanhas (intervalo)',
  almoco: 'Almoço',
  lanche: 'Lanche pré-treino',
  saida: 'Saída do trabalho',
  treino: 'Chegada na academia',
  posTreino: 'Whey + creatina',
  jantar: 'Jantar',
  estudo: 'Estudo',
  dormir: 'Deitar',
};

/** Atalhos de proteína para a barra do dia. */
export const QUICK_PROTEIN = [
  { label: '+1 scoop whey', protein: 22 },
  { label: '+YoPro 23 g', protein: 23 },
  { label: '+100 g carne', protein: 26 },
  { label: '+2 ovos', protein: 12 },
  { label: '+1 copo de leite', protein: 7 },
];

export const WATER_GLASS_ML = 300;
export const WATER_GOAL_ML = 2500;
export const BACKUP_REMINDER_DAYS = 14;

export const CREATINE_TIP =
  'Confira na embalagem quantos gramas dão os "4 scoopzinhos". Meta: 3–5 g por dia, todos os dias, inclusive nos dias de descanso.';
