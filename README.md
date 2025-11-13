# Pixel-Blitz

>A small, local multiplayer-style bullet-hell prototype built with Node.js, Express, EJS and SQLite.

This repository contains the server and client code for a simple browser-playable bullet-hell game. It includes a minimal Express app that serves the frontend, persistent sessions using SQLite, and the game logic under the `game/` folder.

## Features
- Lightweight Express server serving EJS views
- Local session storage using SQLite
- Simple client-side game logic (player, enemies, boss) in `game/`
- Socket-style client wiring (client side uses Socket.io client)
- Script to initialize the bundled SQLite DB for quick testing

## Prerequisites
- Node.js (LTS recommended, Node 16+)
- npm (comes with Node)

## Quick start
1. Clone the repository and change into the project directory.
2. Install dependencies:

```powershell
npm install
```

3. Initialize the database (optional but recommended for a fresh DB):

```powershell
node scripts/init-db.js
```

4. Start the server:

```powershell
npm start
# or for development with auto-reload (requires nodemon):
npm run dev
```

5. Open your browser to http://localhost:3000 (or the port shown in the console).

Notes:
- The `start` and `dev` scripts in `package.json` map to `node app.js` and `nodemon app.js` respectively.

## Database
This project uses SQLite for session and game persistence. A small helper script is provided at `scripts/init-db.js` and the SQL schema is in `db/init.sql`. Running the init script creates/initializes `db/database.db` and `db/sessions.db` as needed.

## Project layout

- `app.js` — main Express server entry
- `package.json` — project metadata and npm scripts
- `game/` — game logic and modules
	- `main.js` — likely the client entry wiring
	- `game.js`, `player.js`, `enemy.js`, `boss.js` — game entities and logic
- `scripts/init-db.js` — DB initialization helper
- `db/` — SQLite files and SQL schema
- `views/index.ejs` — main HTML view served by Express
- `style.css` — minimal styling for the page

If you add new server routes or DB schemas, update the `db/init.sql` and `scripts/init-db.js` accordingly.

## How to play
- Controls: use the keyboard (arrow keys / WASD) for movement and the configured key to shoot (see client code in `game/` for specifics).
- The game is a prototype — expect simple collision, enemy waves, and a boss fight.

## Development notes
- For iterative development, use `npm run dev` (requires `nodemon`).
- Use the browser devtools to debug client-side game logic in the `game/` scripts.
- If you change DB schema, re-run `node scripts/init-db.js` (backup any existing DB first if you need to preserve data).

## Contributing
Contributions are welcome. Please open issues for bugs or feature requests, and send PRs against the `Dev` branch. Keep changes small and focused.

## License
This project doesn't include a license file. If you want to open-source it, add a `LICENSE` file (MIT is a common choice).

---

If you'd like, I can also:
- Add a `LICENSE` file (MIT) and a short CONTRIBUTING guide
- Add a minimal screenshot to the README
- Add a simple automated test or smoke-start script

Tell me which of those (if any) you'd like next.

