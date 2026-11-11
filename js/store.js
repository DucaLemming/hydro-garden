// State lives in this browser's localStorage. Nothing is sent anywhere except to Google Calendar when you sync.
import { DEFAULT_SETTINGS } from './geometry.js';
import { SLOT_IDS } from './schedule.js';

const KEY = 'hydro-garden-v1';
const START_PLAN = { A1: 'chili', A2: 'basil', A3: 'parsley', A4: 'pak-choi', B1: 'basil', B2: 'chives', B3: 'spring-onion-root', C1: 'coriander', C2: 'lettuce', C3: 'rocket', C4: 'lettuce' };

export const emptySlot = plant => ({ plant: plant || null, sown: null, sprouted: null, trueLeaves: null, rootsOut: null, flowers: null, saucer: false });
export function defaults() {
  return { v: 1, settings: structuredClone(DEFAULT_SETTINGS), slots: Object.fromEntries(SLOT_IDS.map(id => [id, emptySlot(START_PLAN[id])])), done: {}, tankLastChange: null, custom: [], lastSync: null };
}
const merge = (base, over) => {
  if (over === null || typeof over !== 'object' || Array.isArray(over) || typeof base !== 'object' || base === null || Array.isArray(base)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
  return out;
};
export function normalise(raw) {
  const st = merge(defaults(), raw || {});
  for (const id of SLOT_IDS) st.slots[id] = { ...emptySlot(), ...(st.slots[id] || {}) };
  return st;
}
export function load() { try { return normalise(JSON.parse(localStorage.getItem(KEY))); } catch { return defaults(); } }
export function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* storage full or blocked: keep working in memory */ } }
export const encode = st => btoa(unescape(encodeURIComponent(JSON.stringify(st)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const decode = s => normalise(JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))));
