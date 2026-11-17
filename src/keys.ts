// Conyr's shared demo key, public on purpose. It is an ordinary Free key: it reaches only the two Free routes, and
// everyone who runs conyr without a key of their own shares its limit. This is the one place it is written.
// To replace it: make a new Free key, put it here, and release a new 1.0.x.
export const DEMO_KEY = 'conyr_live_Yei4BniFsxwp8U63lv5pe-lwOuAfgF_E';

export type KeyKind = 'own' | 'demo';

export interface Key {
  value: string;
  kind: KeyKind;
}

// The key in CONYR_API_KEY when it is set and not empty, otherwise the demo key. No option takes a key: a key on the
// command line ends up in shell history and in the process list.
export function chooseKey(env: Record<string, string | undefined>): Key {
  const own = env.CONYR_API_KEY?.trim();
  return own ? { value: own, kind: 'own' } : { value: DEMO_KEY, kind: 'demo' };
}
