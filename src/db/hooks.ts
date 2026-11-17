import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** undefined = carregando; null = ainda não fez o onboarding; Profile = pronto. */
export function useProfile() {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
}
