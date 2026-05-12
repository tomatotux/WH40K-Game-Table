# ☩ Warhammer 40,000 — Tabletop Session Manager

A self-hosted web server for running Warhammer 40K tabletop sessions. Displays a battlefield map, manages a persistent character database, and connects multiple tablets for real-time stat tracking — with full session-scoped temporary modifiers that revert automatically when the session ends.

---

## Features

| Feature | Details |
|---|---|
| **GM Map View** | Full-screen battlefield map with pan & zoom. Upload any image as the map. |
| **Character Database** | Permanent storage of units with full 10th edition stats, weapons, faction, lore. |
| **Session Management** | Create sessions, add units, upload map. End session to revert all changes. |
| **Tablet Portal** | Mobile-optimised player view — select a unit, see live stats, apply modifiers. |
| **Temporary Modifiers** | Track stat deltas (Wounds, Toughness, etc.) per session. Cleared on session end. |
| **Condition Markers** | Stunned, Bleeding, On Fire, Blessed, Cursed, Pinned — togglable per unit. |
| **Real-time Sync** | WebSocket (Socket.IO) — GM and all tablets update instantly. |
| **Administratum** | Full CRUD for characters, factions, and weapons. |

---

## Quick Start (Docker)

```bash
# 1. Clone or copy this folder
cd wh40k-server

# 2. Build and launch
docker-compose up -d

# 3. Open in browser
open http://localhost:3000
```

The database and map uploads are persisted in the `wh40k_data` Docker volume — they survive container restarts.

---

## URLs

| URL | Purpose |
|---|---|
| `http://<host>:3000/` | Home / portal selector |
| `http://<host>:3000/gm` | **GM Console** — map display, session control |
| `http://<host>:3000/tablet` | **Tablet Portal** — player stat tracker |
| `http://<host>:3000/admin` | **Administratum** — character database editor |

On your local network, replace `<host>` with your machine's IP (e.g. `192.168.1.50`). Each tablet connects via its browser to `/tablet`.

---

## How Sessions Work

1. **GM opens `/gm`** → clicks "New" tab → names the session, selects units → "Commence Battle"
2. **GM uploads a map** using the 📤 Map button (supports jpg, png, webp up to 20MB)
3. **Tablets open `/tablet`** → they auto-detect the active session → select their unit
4. **During play:** tablets (or GM) apply `+`/`-` modifiers to stats. Changes sync in real-time.
5. **Session end:** GM clicks 🛑 End Session — ALL modifiers and conditions are wiped. Permanent DB stats unchanged.

---

## Temporary Modifiers

Modifiers are stored in `session_modifiers` table as **deltas** (e.g. `wounds -2`). The UI shows:
- **Effective value** = base stat + delta
- Original base value shown in small text beneath
- Positive delta = gold border | Negative delta = red border

When the session ends (`POST /api/sessions/:id/end`), all rows in `session_modifiers` and `session_conditions` for that session are deleted. The `characters` table is never mutated during play.

---

## API Reference

### Characters
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/characters` | List all characters |
| GET | `/api/characters/:id` | Get character + weapons |
| POST | `/api/characters` | Create character |
| PUT | `/api/characters/:id` | Update character |
| DELETE | `/api/characters/:id` | Delete character |
| GET | `/api/characters/:id/weapons` | List weapons |
| POST | `/api/characters/:id/weapons` | Add weapon |
| DELETE | `/api/characters/:id/weapons/:wid` | Remove weapon |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/active` | Get current active session |
| GET | `/api/sessions/:id` | Session + characters + modifiers |
| POST | `/api/sessions` | Create session |
| POST | `/api/sessions/:id/map` | Upload map (multipart) |
| POST | `/api/sessions/:id/end` | **End session — clears all modifiers** |
| POST | `/api/sessions/:id/characters` | Add character to session |
| DELETE | `/api/sessions/:id/characters/:cid` | Remove character from session |

### Modifiers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sessions/:id/characters/:cid/modifiers` | Get modifiers + conditions |
| PUT | `/api/sessions/:id/characters/:cid/modifiers` | Upsert modifier `{field, delta}` |
| DELETE | `/api/sessions/:id/characters/:cid/modifiers/:field` | Delete one modifier |
| POST | `/api/sessions/:id/characters/:cid/conditions` | Add condition |
| DELETE | `/api/sessions/:id/characters/:cid/conditions/:condition` | Remove condition |

---

## Development (without Docker)

```bash
npm install
npm start
# Server runs on http://localhost:3000
```

Requires Node.js 18+.

---

## Customisation

- **Map images**: any raster image (jpg/png/webp). Recommended 4K for large displays.
- **Factions & Characters**: fully editable via `/admin`
- **Stat fields**: defined in `src/db/database.js` schema — add columns and update the UI arrays in the HTML files if you need additional stats.
- **Port**: change in `docker-compose.yml` or set `PORT` env var.
- **Conditions**: edit the `CONDITIONS` array in `tablet.html` and `gm.html`.

---

## Stack

- **Runtime**: Node.js 20 (Alpine Docker image)
- **Web framework**: Express 4
- **Database**: SQLite via `better-sqlite3` (no separate DB server needed)
- **Real-time**: Socket.IO 4
- **File uploads**: Multer
- **Frontend**: Vanilla HTML/CSS/JS with Cinzel & Crimson Text fonts (Google Fonts)
- **Deployment**: Docker + docker-compose

---

*"Only in death does duty end."*
