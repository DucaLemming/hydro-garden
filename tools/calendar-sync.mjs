// Runs on GitHub (see .github/workflows/calendar.yml) after every saved change:
// reads the saved garden, works out the open tasks and brings the Google calendar in line with them.
// It signs in as a Google service account, so nobody has to press anything.
import { readFileSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { plantMap } from '../js/plants.js';
import { buildSchedule, CATS } from '../js/schedule.js';
import { calendarItems } from '../js/ics.js';
import { sync } from '../js/gcal.js';
import { normaliseState } from './state.mjs';

const [, , gardenPath, statusPath] = process.argv;
const tz = process.env.GARDEN_TZ || 'Europe/Berlin';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const status = o => { if (statusPath) writeFileSync(statusPath, JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n'); console.log(JSON.stringify(o)); };
const b64 = x => Buffer.from(x).toString('base64url');

async function serviceToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64(JSON.stringify({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google did not accept the service account key: ${j.error_description || j.error || r.status}`);
  return j.access_token;
}

try {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT) { console.log('GOOGLE_SERVICE_ACCOUNT secret is not set: nothing to do.'); process.exit(0); }
  let key;
  try { key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT); } catch { throw new Error('The GOOGLE_SERVICE_ACCOUNT secret is not the complete JSON key file.'); }
  const state = normaliseState(JSON.parse(readFileSync(gardenPath, 'utf8')));
  const calendarId = process.env.GARDEN_CALENDAR_ID || state.settings.gcalCalendarId;
  if (!calendarId) throw new Error('No calendar yet. Press "Sync with Google Calendar" once in the app so the Hydro Garden calendar exists, then share it with the service account.');
  const sc = buildSchedule(state, plantMap(state.custom), today);
  const items = sc.tank ? calendarItems(sc, state, today, CATS) : [];
  const r = await sync({ calendarId, items, tz, colors: CATS, today, create: false, tokenFn: () => serviceToken(key) })
    .catch(e => { throw new Error(/not shared/.test(e.message) || e.status === 404 || e.status === 403 ? `The calendar is not shared with ${key.client_email}. In Google Calendar, share "Hydro Garden" with that address and allow it to make changes to events.` : e.message); });
  status({ ok: true, reminders: items.length, created: r.created, updated: r.updated, removed: r.removed, account: key.client_email });
} catch (e) {
  status({ ok: false, error: e.message });
  process.exitCode = 1;
}
