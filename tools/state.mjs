// Same defaults as js/store.js, without the browser's localStorage.
import { DEFAULT_SETTINGS } from '../js/geometry.js';
import { SLOT_IDS } from '../js/schedule.js';
const empty = { plant: null, sown: null, sprouted: null, trueLeaves: null, rootsOut: null, flowers: null, saucer: false };
const merge = (base, over) => {
  if (over === null || typeof over !== 'object' || Array.isArray(over) || typeof base !== 'object' || base === null || Array.isArray(base)) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
  return out;
};
export function normaliseState(raw) {
  const st = merge({ settings: structuredClone(DEFAULT_SETTINGS), slots: {}, done: {}, custom: [], tankLastChange: null }, raw || {});
  for (const id of SLOT_IDS) st.slots[id] = { ...empty, ...(st.slots[id] || {}) };
  return st;
}
