# Hydro Garden

Planner for an 11-slot kitchen hydroponic tray (Northpoint LED system, no pump). It runs entirely in the browser, on desktop and phone.

- **Tray:** choose which plant sits in which of the 11 slots, with a layout check and a suggested arrangement.
- **Planting drawings:** a to-scale cross-section per plant with the thickness of every layer, computed from the measured basket and tank.
- **Plan:** dated, colour-coded tasks that shift when you record what you see (sprouted, true leaves, roots out, first flower).
- **Water and fertilizer:** fill levels relative to the MIN and MAX marks, and millilitres of fertilizer for the jug you pour.
- **Calendar:** sync reminders to a dedicated Google calendar, or download an .ics file.
- **Plants:** 40+ plants that suit small net baskets, plus your own.

## Run it

It is a static site with no build step. Serve the folder and open it:

```
python3 -m http.server 8000
```

Tests for the calculations: `node tests/run.mjs`

## Google Calendar setup (once)

The steps are in the app under Settings, Google Calendar. In short: create a Google Cloud project, enable the Google Calendar API, configure the consent screen with yourself as test user, create a "Web application" OAuth client with this site's address as an authorized JavaScript origin, and paste the client ID into Settings. The app asks only for the `calendar.app.created` permission, so it can see and change only the calendar it creates.

## Data

Everything is stored in the browser's localStorage. Settings has a transfer link and a backup file for moving the garden between devices.

## Where the numbers come from

`js/geometry.js` holds the tray model. Defaults: baskets 43 mm wide at the top, 32 mm at the bottom, 68 mm high; 13 mm under the baskets; water 34 mm deep at MAX; MIN and MAX 16.5 mm apart. Change them in Settings and every drawing and level follows.
