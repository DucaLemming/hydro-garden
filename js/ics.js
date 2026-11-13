// iCalendar export. Calendar entries are built only from open tasks in the plan, one per day and colour.
import { addDays } from './util.js';

const fold = line => line.match(/.{1,70}/gu).join('\r\n ');
const text = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const stamp = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
export const plus15 = time => { const [h, m] = time.split(':').map(Number); const t = h * 60 + m + 15; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

export function calendarItems(schedule, state, today, catLabels) {
  const time = state.settings.reminderTime || '18:00';
  // One event per day and colour, so a busy day gives a handful of reminders instead of a dozen.
  const groups = new Map();
  for (const t of schedule.tasks) {
    if (t.date < today || state.done[t.id]) continue;
    const k = `${t.date}:${t.cat}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  const items = [...groups.entries()].map(([k, ts]) => {
    let title = ts[0].title;
    if (ts.length > 1) { title = `${catLabels[ts[0].cat].label}: ${ts.map(t => t.title).join(' / ')}`; if (title.length > 110) title = `${title.slice(0, 107)}...`; }
    return { key: k, date: ts[0].date, time, cat: ts[0].cat, title: `Garden: ${title}`, body: ts.map(t => `${t.title}\n${t.detail}`).join('\n\n') };
  });
  return items;
}

export function toICS(items) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hydro-garden//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Hydro Garden'];
  for (const it of items) {
    L.push('BEGIN:VEVENT', `UID:${it.key.replace(/[^\w.-]/g, '-')}@hydro-garden`, `DTSTAMP:${now}`,
      `DTSTART:${stamp(it.date, it.time)}`, `DTEND:${stamp(it.date, plus15(it.time))}`);
    if (it.every) L.push(`RRULE:FREQ=DAILY;INTERVAL=${it.every};UNTIL=${it.until.replace(/-/g, '')}T235900`);
    L.push(fold(`SUMMARY:${text(it.title)}`), fold(`DESCRIPTION:${text(it.body)}`),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Hydro Garden', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
