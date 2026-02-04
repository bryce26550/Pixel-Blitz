# Pixel-Blitz

A browser-based bullet-hell space shooter with integrated payment system, built with Node.js, Express, and the Canvas API.

This is a wave-based space shooter game that integrates with the Formbar classroom management system for user authentication and digital currency payments. Players fight through increasingly difficult waves of enemies and challenging boss encounters while earning rewards.

## Features

Game Features
- Wave-based Combat: Progress through increasingly difficult waves with varied enemy types
- Boss Battles: Unique bosses every 5th wave with distinct attack patterns and mechanics
- Player Progression: Level up system with randomized upgrade choices
- Enemy Variety:
  - Basic Enemies: Standard red attackers
  - Shooters: Blue enemies that fire at the player
  - Tanks: Heavy armored enemies with spread shots
  - Sprinters: Fast pink enemies with dash attacks
- Boss Types:
  - Blaster: Multi-phase shooting boss
  - Slasher: Fast-moving dash-and-lock boss
  - Sentinel: Defensive boss that spawns protective walls
  - Railgun: Precision line-shot boss with tracking
  - Overlord: Summoner boss that spawns minions
- Player Customization: Multiple ship colors and shapes
- Upgrade System: Random upgrade choices (damage, fire rate, multi-shot, pierce, ricochet, homing, health, speed, life steal)

Technical Features
- Formbar Integration: OAuth authentication through the Formbar classroom system
- Digital Currency: Pay-to-play system using Digipogs (classroom currency)
- Server-Side Validation: Anti-cheat measures and game session management
- Real-time Updates: Socket.io integration for live price and state updates
- Session Management: SQLite-based session storage with automatic cleanup
- Admin Panel: Price management and game settings control

## Prerequisites
- Node.js (LTS recommended, Node 16+)
- npm (comes with Node)
- Access to Formbar authentication server
- Valid API key for Formbar integration

## Environment Setup

Create a .env file in the project root with these variables:

```env
PORT=3500
SESSION_SECRET=your_session_secret_key
AUTH_URL=http://localhost:420/oauth
THIS_URL=http://localhost:3500
API_KEY=your_formbar_api_key
```

## Quick Start

1. Clone the repository and change into the project directory.
2. Install dependencies:

```bash
npm install
```

3. Initialize the database:

```bash
node scripts/init-db.js
```

4. Start the server:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

5. Open your browser to http://localhost:3500 (or your configured port).

## How to Play

Controls
- Movement: WASD or Arrow Keys
- Aim: Mouse cursor
- Shoot: Spacebar or Left-Click
- Pause: ESC key

Game Mechanics
- Health System: Start with 10 health points and 5 lives
- Wave Progression: Complete waves by earning enough wave progress points
- Boss Waves: Every 5th wave features a unique boss battle
- Experience & Leveling: Gain XP by defeating enemies, level up to choose upgrades
- Payment System: Pay the entry fee in Digipogs to start each game session
- Rewards: Earn Digipogs back by completing waves (every 5th wave gives payout)

Enemy Types (example scoring)
- Red Enemies (10 pts): Basic attackers that move downward
- Blue Shooters (25 pts): Fire tracking projectiles
- Gray Tanks (50 pts): Heavy enemies with spread-shot attacks
- Pink Sprinters (75 pts): Fast dash enemies
- Bosses (200 pts): High HP, unique mechanics

## Project Structure

- app.js — Main Express server with game session management
- package.json — Dependencies and scripts
- public/ — Static assets served to client
  - main.js — Client-side game engine and UI wiring
  - game.js — Game renderer and core loop
  - player.js — Player class and bullet mechanics
  - enemy.js — Enemy classes (Enemy, Shooter, Tank, Sprinter)
  - boss.js — Boss classes (Blaster, Slasher, Sentinel, etc.)
  - style.css — Game styling
- views/
  - index.ejs — Main game interface
  - pay.ejs — Payment interface
  - admin.ejs — Admin panel for price management
- db/
  - database.db — Game settings and user data
  - sessions.db — Session storage
- scripts/
  - init-db.js — Database initialization

## Game Systems

Payment & Sessions
- Players must pay an entry fee (configurable) in Digipogs to start playing
- Server-side session management prevents cheating and validates game progress
- Automatic payout system rewards players for wave completion

Anti-Cheat & Validation
- Server validates wave progression, timing, and score gains
- Rate limiting prevents request flooding
- Session cleanup removes inactive games

Boss Mechanics (summary)
- Blaster: Multi-phase attack patterns based on health
- Slasher: Rotates, charges with dash attacks
- Sentinel: Spawns defensive walls and burst-fires
- Railgun: Line-shot attacks with barrel tracking
- Overlord: Summons waves of minions based on thresholds

Admin Features
- Access admin panel at /admin (requires admin privileges)
- Adjust game entry price in real-time
- Monitor active game sessions and view stats

## API Endpoints (summary)
- GET / - Main game interface
- POST /payIn - Process game entry payment
- POST /startGameSession - Initialize server-side game session
- POST /recordGameEvent - Validate and record game events
- POST /endGame - End session and process payouts
- GET /admin - Admin panel (admin only)
- POST /admin/updatePrice - Update game price (admin only)

## Development Notes

Adding New Bosses
- Create boss class in boss.js following existing patterns
- Add to availableBosses array in main.js
- Implement required methods: update(), render(), takeDamage()

Modifying Game Balance
- Adjust enemy health/damage multipliers in enemy constructors
- Modify wave requirements and progression in main.js
- Update upgrade effects in the generateUpgradeOptions() method

Database Changes
- Update schema in db/init.sql
- Modify initialization in scripts/init-db.js
- Restart server after schema changes

Contributing
- Open issues for bugs or feature requests
- Submit PRs against the main branch
- Keep changes focused and well-documented
- Test thoroughly before submitting

License
This project is part of the Formbar classroom management ecosystem. Please respect the educational nature of this project and ensure proper Formbar integration before deployment.

Note: Ensure your Formbar server is running and properly configured and that you have a valid API key before starting the game server.

