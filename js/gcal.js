// Google Calendar sync. Uses the narrow "calendar.app.created" permission: the app can only
// see and change the one calendar it creates ("Hydro Garden"), never your other calendars.
import { plus15 } from './ics.js';

const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
const API = 'https://www.googleapis.com/calendar/v3';
let token = null, tokenExp = 0;

function loadGis() {
  return new Promise((res, rej) => {
    if (window.google?.accounts?.oauth2) return res();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => res();
    s.onerror = () => rej(new Error('Google sign-in could not load. Check your connection, or pause your ad blocker for this page.'));
    document.head.append(s);
  });
}

export async function getToken(clientId) {
  if (token && Date.now() < tokenExp - 60000) return token;
  await loadGis();
  return new Promise((res, rej) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: SCOPE,
      callback: r => { if (r.error) return rej(new Error(r.error_description || r.error)); token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000; res(token); },
      error_callback: e => rej(new Error(e?.type === 'popup_closed' ? 'The Google sign-in window was closed before it finished.' : e?.type === 'popup_failed_to_open' ? 'The browser blocked the Google sign-in window. Allow pop-ups for this page and try again.' : (e?.message || 'Google sign-in failed.'))),
    });
    client.requestAccessToken();
  });
}

const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

export function eventBody(it, tz, colors) {
  const body = {
    summary: it.title, description: it.body,
    start: { dateTime: `${it.date}T${it.time}:00`, timeZone: tz },
    end: { dateTime: `${it.date}T${plus15(it.time)}:00`, timeZone: tz },
    colorId: colors[it.cat]?.gcal,
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
  };
  if (it.every) body.recurrence = [`RRULE:FREQ=DAILY;INTERVAL=${it.every};UNTIL=${it.until.replace(/-/g, '')}T225900Z`];
  body.extendedProperties = { private: { hg: '1', k: it.key, h: hash(JSON.stringify(body)) } };
  return body;
}

// Brings the calendar in line with `items`: adds new reminders, updates changed ones,
// removes upcoming ones that are no longer due. Reminders in the past are left alone.
export async function sync({ clientId, calendarId, items, tz, colors, today, fetchFn = fetch, tokenFn = getToken, onProgress = () => {} }) {
  const tk = await tokenFn(clientId);
  const call = async (method, path, body) => {
    const r = await fetchFn(API + path, { method, headers: { Authorization: `Bearer ${tk}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j?.error?.message || `Google Calendar answered with error ${r.status}.`); e.status = r.status; throw e; }
    return j;
  };
  let calId = calendarId;
  if (calId) { try { await call('GET', `/calendars/${encodeURIComponent(calId)}`); } catch (e) { if (e.status === 404 || e.status === 403) calId = null; else throw e; } }
  if (!calId) calId = (await call('POST', '/calendars', { summary: 'Hydro Garden', description: 'Reminders from the Hydro Garden planner.', timeZone: tz })).id;
  const cal = encodeURIComponent(calId);
  const existing = new Map();
  let page = '';
  do {
    const r = await call('GET', `/calendars/${cal}/events?privateExtendedProperty=${encodeURIComponent('hg=1')}&maxResults=2500&showDeleted=false${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
    for (const ev of r.items || []) existing.set(ev.extendedProperties?.private?.k, ev);
    page = r.nextPageToken || '';
  } while (page);
  const out = { calendarId: calId, created: 0, updated: 0, removed: 0, kept: 0 };
  const want = new Set(items.map(i => i.key));
  const total = items.length;
  let n = 0;
  for (const it of items) {
    const body = eventBody(it, tz, colors), ev = existing.get(it.key);
    if (!ev) { await call('POST', `/calendars/${cal}/events`, body); out.created++; }
    else if (ev.extendedProperties.private.h !== body.extendedProperties.private.h) { await call('PUT', `/calendars/${cal}/events/${ev.id}`, body); out.updated++; }
    else out.kept++;
    onProgress(++n, total);
  }
  for (const [k, ev] of existing) {
    const day = (ev.start?.dateTime || ev.start?.date || '').slice(0, 10);
    if (!want.has(k) && (day >= today || ev.recurrence)) { await call('DELETE', `/calendars/${cal}/events/${ev.id}`); out.removed++; }
  }
  return out;
}
