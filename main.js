class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.player = new Player(this.width / 2, this.height - 50);
        this.mouseX = this.width / 2;
        this.mouseY = this.height / 2;
        this.bullets = [];
        this.enemies = [];
        this.shooters = [];
        this.tanks = [];
        this.sprinters = [];
        this.bosses = [];
        this.particles = [];

        this.score = 0;
        this.lives = 5; // Start with more lives
        this.exp = 0;
        this.level = 1;
        this.expToNextLevel = 100;
        this.showLevelUp = false;

        // Game state flags
        this.started = false;        // false => show start menu
        this.gameRunning = false;    // true when playing
        this.gamePaused = false;     // pause toggle

        this.gamePausedReason = '';  // optional: 'pause' or 'levelup'

        this.waveNumber = 1;
        this.waveProgress = 0;
        this.waveRequirement = 300; // Points needed to complete a wave
        this.globalEnemyMultiplier = 1; // Increases every 5 waves
    this.enemyDamageMultiplier = 1; // increases enemy bullet/contact damage every 5 waves

        this.keys = {};
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.shooterSpawnTimer = 0;
        this.tankSpawnTimer = 0;
        this.sprinterSpawnTimer = 0;
        this.bossSpawnTimer = 0;

        // UI hit rects used by canvas mouse interactions
        // <-- MOVE/INITIALIZE uiRects BEFORE starting the loop/listeners
        this.uiRects = {
            startButton: null,
            colorBox: null,
            shapeBox: null,
            previewBox: null,
            upgradeOptions: [], // array of rects
            pause: { resumeButton: null, restartButton: null }
        };

        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Start game (Enter or Space) when not started
            if (!this.started && (e.code === 'Enter' || e.code === 'Space')) {
                this.startGame();
                return;
            }

            // Toggle pause with Escape (only when started and not in level-up)
            if (this.started && e.code === 'Escape' && !this.showLevelUp) {
                this.togglePause();
                return;
            }

            // Start-menu customization keys (only when not started)
            if (!this.started) {
                if (e.code === 'KeyC') {
                    // cycle player color
                    this.player.cycleColor();
                }
                if (e.code === 'KeyV') {
                    // cycle inner shape
                    this.player.cycleShape();
                }
            }

            // Normal input recorded for gameplay (shoot/move)
            this.keys[e.code] = true;

            // Level up selection (still works)
            if (this.showLevelUp) {
                if (e.code === 'Digit1') this.selectUpgrade(0);
                if (e.code === 'Digit2') this.selectUpgrade(1);
                if (e.code === 'Digit3') this.selectUpgrade(2);
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Track mouse for aiming
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // Use mousedown so clicks are more responsive for desktop
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleCanvasClick(x, y, e);
        });

        // Guard restart button in case it isn't in the DOM
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                // restart should take the player back into the game immediately
                this.restart();
            });
        }
    }

    // start the game from the start menu (was missing -> caused start button error)
    startGame() {
        this.started = true;
        this.gameRunning = true;
        this.gamePaused = false;
        this.showLevelUp = false;
        this.gamePausedReason = '';
        // restart and begin immediately
        this.restart(true);
    }

    // simple pause toggle used by ESC and pause menu
    togglePause() {
        this.gamePaused = !this.gamePaused;
        this.gamePausedReason = this.gamePaused ? 'pause' : '';
    }

    // helper to test if a point is inside a rect
    pointInRect(x, y, rect) {
        if (!rect) return false;
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    // Centralized click handling for all canvas-drawn menus
    handleCanvasClick(x, y, originalEvent) {
        // Start menu interactions
        if (!this.started) {
            // start button
            if (this.pointInRect(x, y, this.uiRects.startButton)) {
                this.startGame();
                return;
            }
            // color box
            if (this.pointInRect(x, y, this.uiRects.colorBox)) {
                this.player.cycleColor();
                return;
            }
            // shape box
            if (this.pointInRect(x, y, this.uiRects.shapeBox)) {
                this.player.cycleShape();
                return;
            }
            // clicking preview area also cycles color (friendly UX)
            if (this.pointInRect(x, y, this.uiRects.previewBox)) {
                this.player.cycleColor();
                return;
            }
            return;
        }

        // Level up screen: click an upgrade option
        if (this.showLevelUp) {
            for (let i = 0; i < (this.uiRects.upgradeOptions || []).length; i++) {
                const rect = this.uiRects.upgradeOptions[i];
                if (this.pointInRect(x, y, rect)) {
                    this.selectUpgrade(i);
                    return;
                }
            }
            return;
        }

        // Pause menu interactions
        if (this.gamePaused && this.gamePausedReason === 'pause') {
            if (this.pointInRect(x, y, this.uiRects.pause.resumeButton)) {
                this.togglePause();
                return;
            }
            if (this.pointInRect(x, y, this.uiRects.pause.restartButton)) {
                this.restart(true);
                return;
            }
            return;
        }

        // In-game: left click should fire toward mouse
        if (originalEvent && originalEvent.button === 0) { // left mouse
            this.player.shoot(this.bullets, this.mouseX, this.mouseY);
        }
    }

    update(deltaTime) {
        if (!this.started) return;             // waiting on start menu
        if (!this.gameRunning || this.gamePaused) return;

        // Update player
        this.player.update(this.keys, deltaTime);

        // Calculate spawn rates based on wave and global multiplier
        const baseSpawnRate = Math.max(300, 1200 - (this.waveNumber * 50));

        // Spawn enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > baseSpawnRate) {
            this.enemies.push(new Enemy(Math.random() * (this.width - 40), -40, this.globalEnemyMultiplier));
            this.enemySpawnTimer = 0;
        }

        // Spawn shooters
        this.shooterSpawnTimer += deltaTime;
        if (this.shooterSpawnTimer > 6000) {
            this.shooters.push(new Shooter(Math.random() * (this.width - 40), -40, this.globalEnemyMultiplier));
            this.shooterSpawnTimer = 0;
        }

        // Spawn tanks
        this.tankSpawnTimer += deltaTime;
        if (this.tankSpawnTimer > 10000 && this.waveNumber >= 2) {
            this.tanks.push(new Tank(Math.random() * (this.width - 50), -50, this.globalEnemyMultiplier));
            this.tankSpawnTimer = 0;
        }

        // Spawn sprinters
        this.sprinterSpawnTimer += deltaTime;
        if (this.sprinterSpawnTimer > 8000 && this.waveNumber >= 3) {
            this.sprinters.push(new Sprinter(Math.random() * (this.width - 40), -40, this.globalEnemyMultiplier));
            this.sprinterSpawnTimer = 0;
        }

        // Spawn bosses
        this.bossSpawnTimer += deltaTime;
        if (this.bossSpawnTimer > 40000 && this.waveNumber >= 4) {
            this.bosses.push(new Boss(this.width / 2 - 40, -60, this.globalEnemyMultiplier));
            this.bossSpawnTimer = 0;
        }

        // Update all entities
        this.updateEntities(deltaTime);

        // Check collisions
        this.checkCollisions();

        // Player shooting (aim with mouse)
        if (this.keys['Space']) {
            this.player.shoot(this.bullets, this.mouseX, this.mouseY);
        }

        // Check for wave completion
        this.checkWaveProgress();

        // Check for level up
        this.checkLevelUp();
    }

    checkWaveProgress() {
        if (this.waveProgress >= this.waveRequirement) {
            this.waveNumber++;
            this.waveProgress = 0;
            this.waveRequirement += 50; // Increase points needed for next wave

            // Every 5 waves, increase global enemy multiplier
            if (this.waveNumber % 5 === 0) {
                this.globalEnemyMultiplier += 0.3;
                this.enemyDamageMultiplier += 0.5;
            }
        }
    }

    checkLevelUp() {
        if (this.exp >= this.expToNextLevel && !this.showLevelUp) {
            this.showLevelUp = true;
            this.gamePaused = true;
            this.gamePausedReason = 'levelup';
            this.generateUpgradeOptions();
        }
    }

    generateUpgradeOptions() {
        const allUpgrades = [
            { name: "Extra Health", description: "+2 Max Health", effect: () => { this.player.maxHealth += 2; this.player.health += 2; } },
            { name: "Damage Boost", description: "+1 Bullet Damage", effect: () => { this.player.damage += 1; } },
            { name: "Fire Rate", description: "Faster Shooting", effect: () => { this.player.shootCooldownMax = Math.max(50, this.player.shootCooldownMax - 30); } },
            { name: "Bullet Speed", description: "Faster Bullets", effect: () => { this.player.bulletSpeed += 0.2; } },
            { name: "Pierce Shot", description: "Bullets Go Through Enemies", effect: () => { this.player.pierce += 1; } },
            { name: "Ricochet", description: "Bullets Bounce (2 bounces)", effect: () => { this.player.ricochet = true; this.player.ricochetBounces = (this.player.ricochetBounces || 0) + 2; } },
            { name: "Multi Shot", description: "+1 Bullet Per Shot", effect: () => { this.player.multiShot += 1; } },
            { name: "Speed Boost", description: "Move Faster", effect: () => { this.player.speed += 0.1; } },
            { name: "Shield", description: "Temporary Invincibility on Hit", effect: () => { this.player.shieldDuration += 500; } },
            { name: "Life Steal", description: "Heal on Enemy Kill", effect: () => { this.player.lifeSteal = true; } }
        ];

        // Randomly select 3 upgrades
        this.upgradeOptions = [];
        const availableUpgrades = [...allUpgrades];
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
            this.upgradeOptions.push(availableUpgrades.splice(randomIndex, 1)[0]);
        }
    }

    selectUpgrade(index) {
        if (index >= 0 && index < this.upgradeOptions.length) {
            this.upgradeOptions[index].effect();
            this.level++;
            this.exp -= this.expToNextLevel;
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5); // Exponential scaling
            this.showLevelUp = false;
            // resume game
            this.gamePaused = false;
            this.gamePausedReason = '';
            this.upgradeOptions = [];
        }
    }

    addExp(amount) {
        this.exp += amount;
    }

    updateEntities(deltaTime) {
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);

            // Ricochet bullets off walls (limited bounces)
            if (bullet.ricochet && bullet.isPlayer) {
                // horizontal bounce
                if (bullet.x <= 0 || bullet.x + bullet.width >= this.width) {
                    bullet.vx *= -1;
                    // reduce speed slightly each bounce to avoid infinite loop
                    bullet.vx *= 0.85;
                    bullet.vy *= 0.95;
                    bullet.x = Math.max(0, Math.min(this.width - bullet.width, bullet.x));
                    bullet.ricochetBounces = (bullet.ricochetBounces || 0) - 1;
                }
                // vertical bounce
                if (bullet.y <= 0 || bullet.y + bullet.height >= this.height) {
                    bullet.vy *= -1;
                    bullet.vx *= 0.95;
                    bullet.vy *= 0.85;
                    bullet.y = Math.max(0, Math.min(this.height - bullet.height, bullet.y));
                    bullet.ricochetBounces = (bullet.ricochetBounces || 0) - 1;
                }

                // if out of bounces, disable ricochet property so bullet will leave next bounds
                if ((bullet.ricochetBounces || 0) <= 0) {
                    bullet.ricochet = false;
                }
            }

            return bullet.y > -50 && bullet.y < this.height + 50 &&
                bullet.x > -50 && bullet.x < this.width + 50;
        });

        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime);
            return enemy.y < this.height + 40;
        });

        // Update shooters
        this.shooters = this.shooters.filter(shooter => {
            shooter.update(deltaTime, this.bullets, this.player, this.enemyDamageMultiplier);
            return shooter.y < this.height + 40;
        });

        // Update tanks
        this.tanks = this.tanks.filter(tank => {
            tank.update(deltaTime, this.bullets, this.player, this.enemyDamageMultiplier);
            return tank.y < this.height + 50 && tank.hp > 0;
        });

        // Update sprinters
        this.sprinters = this.sprinters.filter(sprinter => {
            sprinter.update(deltaTime, this.player);
            return sprinter.y < this.height + 40 && sprinter.hp > 0;
        });

        // Update bosses
        this.bosses = this.bosses.filter(boss => {
            boss.update(deltaTime, this.bullets, this.player, this.enemyDamageMultiplier);
            return boss.y < this.height + 60 && boss.hp > 0;
        });

        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
    }

    checkCollisions() {
        // Player bullets vs all enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet || !bullet.isPlayer) continue;

            let hit = false;
            let hitCount = 0;

            // Check vs enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(bullet, this.enemies[j])) {
                    this.createExplosion(this.enemies[j].x, this.enemies[j].y);
                    this.enemies.splice(j, 1);
                    this.score += 10;
                    this.waveProgress += 10;
                    this.addExp(5);
                    if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                        this.player.health++;
                    }
                    hit = true;
                    hitCount++;
                    if (hitCount >= bullet.pierce) break;
                }
            }

            // Check vs shooters
            for (let j = this.shooters.length - 1; j >= 0 && hitCount < bullet.pierce; j--) {
                if (this.checkCollision(bullet, this.shooters[j])) {
                    this.createExplosion(this.shooters[j].x, this.shooters[j].y);
                    this.shooters.splice(j, 1);
                    this.score += 25;
                    this.waveProgress += 25;
                    this.addExp(12);
                    if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                        this.player.health++;
                    }
                    hit = true;
                    hitCount++;
                }
            }

            // Check vs tanks
            for (let j = this.tanks.length - 1; j >= 0 && hitCount < bullet.pierce; j--) {
                if (this.checkCollision(bullet, this.tanks[j])) {
                    this.tanks[j].takeDamage(bullet.damage);
                    this.createExplosion(bullet.x, bullet.y);
                    this.score += 5;
                    this.waveProgress += 5;
                    this.addExp(3);

                    if (this.tanks[j].hp <= 0) {
                        this.createExplosion(this.tanks[j].x, this.tanks[j].y);
                        this.tanks.splice(j, 1);
                        this.score += 50;
                        this.waveProgress += 50;
                        this.addExp(25);
                        if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                            this.player.health++;
                        }
                    }
                    hit = true;
                    hitCount++;
                }
            }

            // Check vs sprinters
            for (let j = this.sprinters.length - 1; j >= 0 && hitCount < bullet.pierce; j--) {
                if (this.checkCollision(bullet, this.sprinters[j])) {
                    this.sprinters[j].takeDamage(bullet.damage);
                    this.createExplosion(bullet.x, bullet.y);
                    this.score += 8;
                    this.waveProgress += 8;
                    this.addExp(4);

                    if (this.sprinters[j].hp <= 0) {
                        this.createExplosion(this.sprinters[j].x, this.sprinters[j].y);
                        this.sprinters.splice(j, 1);
                        this.score += 75;
                        this.waveProgress += 75;
                        this.addExp(35);
                        if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                            this.player.health++;
                        }
                    }
                    hit = true;
                    hitCount++;
                }
            }

            // Check vs bosses
            for (let j = this.bosses.length - 1; j >= 0 && hitCount < bullet.pierce; j--) {
                if (this.checkCollision(bullet, this.bosses[j])) {
                    this.bosses[j].takeDamage(bullet.damage);
                    this.createExplosion(bullet.x, bullet.y);
                    this.score += 15;
                    this.waveProgress += 15;
                    this.addExp(8);

                    if (this.bosses[j].hp <= 0) {
                        this.createExplosion(this.bosses[j].x, this.bosses[j].y);
                        this.bosses.splice(j, 1);
                        this.score += 200;
                        this.waveProgress += 200;
                        this.addExp(100);
                        if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                            this.player.health += 3;
                        }
                    }
                    hit = true;
                    hitCount++;
                }
            }

            // Remove bullet if it hit enough targets and doesn't have pierce
            if (hit && hitCount >= bullet.pierce) {
                this.bullets.splice(i, 1);
            }
        }

        // Enemy bullets vs player
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet && !bullet.isPlayer && this.checkCollision(bullet, this.player)) {
                this.createExplosion(this.player.x, this.player.y);
                this.bullets.splice(i, 1);
                const dmg = bullet.damage || 1;
                this.player.takeDamageAmount(dmg);
                if (this.player.health <= 0) {
                    this.damagePlayer();
                }
            }
        }

        // All enemies vs player
        const allEnemies = [...this.enemies, ...this.shooters, ...this.tanks, ...this.sprinters, ...this.bosses];
        for (let i = allEnemies.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, allEnemies[i])) {
                this.createExplosion(allEnemies[i].x, allEnemies[i].y);
                const dmg = Math.ceil((allEnemies[i].contactDamage || 1) * this.enemyDamageMultiplier);
                this.player.takeDamageAmount(dmg);
                if (this.player.health <= 0) {
                    this.damagePlayer();
                }

                // Remove the enemy that hit the player
                this.removeEnemyFromArrays(allEnemies[i]);
            }
        }

        // Update score display
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('livesValue').textContent = this.lives;
    }

    removeEnemyFromArrays(enemy) {
        let index = this.enemies.indexOf(enemy);
        if (index > -1) this.enemies.splice(index, 1);

        index = this.shooters.indexOf(enemy);
        if (index > -1) this.shooters.splice(index, 1);

        index = this.tanks.indexOf(enemy);
        if (index > -1) this.tanks.splice(index, 1);

        index = this.sprinters.indexOf(enemy);
        if (index > -1) this.sprinters.splice(index, 1);

        index = this.bosses.indexOf(enemy);
        if (index > -1) this.bosses.splice(index, 1);
    }

    damagePlayer() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
            obj1.x + obj1.width > obj2.x &&
            obj1.y < obj2.y + obj2.height &&
            obj1.y + obj1.height > obj2.y;
    }

    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y));
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw background/game objects even when showing menus, but if not started show start menu overlay
        this.player.render(this.ctx);

        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.shooters.forEach(shooter => shooter.render(this.ctx));
        this.tanks.forEach(tank => tank.render(this.ctx));
        this.sprinters.forEach(sprinter => sprinter.render(this.ctx));
        this.bosses.forEach(boss => boss.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));

        // Render UI
        this.renderUI();

        // Start menu
        if (!this.started) {
            this.renderStartMenu();
            return;
        }

        // Pause menu
        if (this.gamePaused && this.gamePausedReason === 'pause') {
            this.renderPauseMenu();
            return;
        }

        // Level up screen
        if (this.showLevelUp) {
            this.renderLevelUpScreen();
            return;
        }
    }

    renderUI() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Wave: ${this.waveNumber}`, 10, 30);
        this.ctx.fillText(`Level: ${this.level}`, 10, 50);
        this.ctx.fillText(`EXP: ${this.exp}/${this.expToNextLevel}`, 10, 70);
        this.ctx.fillText(`Health: ${this.player.health}/${this.player.maxHealth}`, 10, 90);

        // Wave progress bar
        const barWidth = 200;
        const barHeight = 10;
        const barX = this.width - barWidth - 10;
        const barY = 20;

        this.ctx.fillStyle = 'gray';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        this.ctx.fillStyle = 'yellow';
        this.ctx.fillRect(barX, barY, (this.waveProgress / this.waveRequirement) * barWidth, barHeight);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Wave Progress', barX, barY - 5);

        // EXP bar
        const expBarY = 40;
        this.ctx.fillStyle = 'gray';
        this.ctx.fillRect(barX, expBarY, barWidth, barHeight);
        this.ctx.fillStyle = 'blue';
        this.ctx.fillRect(barX, expBarY, (this.exp / this.expToNextLevel) * barWidth, barHeight);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Experience', barX, expBarY - 5);
    }

    renderStartMenu() {
        // Dim background
        this.ctx.fillStyle = 'rgba(0,0,0,0.85)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const panelW = 600;
        const panelH = 360;
        const panelX = (this.width - panelW) / 2;
        const panelY = (this.height - panelH) / 2;

        // Rounded panel background
        const r = 12;
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(20,20,30,0.95)';
        ctx.beginPath();
        ctx.moveTo(panelX + r, panelY);
        ctx.lineTo(panelX + panelW - r, panelY);
        ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + r);
        ctx.lineTo(panelX + panelW, panelY + panelH - r);
        ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - r, panelY + panelH);
        ctx.lineTo(panelX + r, panelY + panelH);
        ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - r);
        ctx.lineTo(panelX, panelY + r);
        ctx.quadraticCurveTo(panelX, panelY, panelX + r, panelY);
        ctx.closePath();
        ctx.fill();

        // Panel border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Title (match gameOver styling: bold centered)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NEO PIX', panelX + panelW / 2, panelY + 70);

        // Subtitle / tagline
        ctx.font = '16px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Survive waves, level up, and customize your ship', panelX + panelW / 2, panelY + 100);

        // Left: Player preview box
        const previewX = panelX + 28;
        const previewY = panelY + 130;
        const previewW = 200;
        const previewH = 180;

        // store preview rect so clicks can interact
        this.uiRects.previewBox = { x: previewX, y: previewY, w: previewW, h: previewH };

        // Preview background
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(previewX, previewY, previewW, previewH);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeRect(previewX, previewY, previewW, previewH);

        // Draw label
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Player Preview (click to cycle color)', previewX + 8, previewY + 20);

        // Draw player centered in preview
        const px = previewX + previewW / 2 - this.player.width / 2;
        const py = previewY + previewH / 2 - this.player.height / 2;
        // ship base
        ctx.fillStyle = this.player.color || '#00ff00';
        ctx.fillRect(px, py, this.player.width, this.player.height);

        // inner shape
        ctx.fillStyle = '#ffffff';
        if (this.player.shapeIndex === 0) {
            // triangle
            ctx.beginPath();
            ctx.moveTo(px + this.player.width / 2, py + 6);
            ctx.lineTo(px + 6, py + this.player.height - 6);
            ctx.lineTo(px + this.player.width - 6, py + this.player.height - 6);
            ctx.closePath();
            ctx.fill();
        } else if (this.player.shapeIndex === 1) {
            // circle
            ctx.beginPath();
            ctx.arc(px + this.player.width / 2, py + this.player.height / 2, Math.min(this.player.width, this.player.height) / 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // square
            ctx.fillRect(px + 6, py + 6, this.player.width - 12, this.player.height - 12);
        }

        // small interactive boxes: color and shape
        const colorBoxX = previewX + 8;
        const colorBoxY = previewY + previewH - 40;
        const colorBoxW = 80;
        const colorBoxH = 28;
        ctx.fillStyle = this.player.color;
        ctx.fillRect(colorBoxX, colorBoxY, colorBoxW, colorBoxH);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(colorBoxX, colorBoxY, colorBoxW, colorBoxH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText('Cycle Color', colorBoxX + 8, colorBoxY + 18);

        // store color box rect
        this.uiRects.colorBox = { x: colorBoxX, y: colorBoxY, w: colorBoxW, h: colorBoxH };

        const shapeBoxX = colorBoxX + colorBoxW + 10;
        const shapeBoxY = colorBoxY;
        const shapeBoxW = 80;
        const shapeBoxH = 28;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(shapeBoxX, shapeBoxY, shapeBoxW, shapeBoxH);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(shapeBoxX, shapeBoxY, shapeBoxW, shapeBoxH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Change Shape', shapeBoxX + 6, shapeBoxY + 18);

        // store shape box rect
        this.uiRects.shapeBox = { x: shapeBoxX, y: shapeBoxY, w: shapeBoxW, h: shapeBoxH };

        // Right: controls & customization
        const rightX = panelX + 248;
        const startY = panelY + 130;
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Controls', rightX, startY);

        ctx.font = '14px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Move: WASD / Arrow Keys', rightX, startY + 28);
        ctx.fillText('Aim: Move mouse', rightX, startY + 52);
        ctx.fillText('Shoot: Space or Left-Click', rightX, startY + 76);
        ctx.fillText('Pause: ESC', rightX, startY + 100);

        // large start button (centered bottom of panel)
        const hintY = panelY + panelH - 88;
        const btnW = 240;
        const btnH = 54;
        const btnX = panelX + panelW / 2 - btnW / 2;
        const btnY = hintY;

        // draw button (visually similar to game over)
        ctx.fillStyle = '#71ff4dff';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#094d00ff';
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = '#222222';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('START GAME', btnX + btnW / 2, btnY + btnH / 2 + 8);

        // store start button rect for clicks
        this.uiRects.startButton = { x: btnX, y: btnY, w: btnW, h: btnH };

        // Small footer
        ctx.font = '12px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'right';
        ctx.fillText('Mouse to aim • Customize before starting', panelX + panelW - 12, panelY + panelH - 12);

        // reset alignment
        ctx.textAlign = 'left';
    }

    renderPauseMenu() {
        // Dark overlay like existing but now with clickable buttons
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 80);

        // Resume button
        const btnW = 240;
        const btnH = 46;
        const btnX = this.width / 2 - btnW / 2;
        const resumeY = this.height / 2 - 20;
        ctx.fillStyle = '#6dd36d';
        ctx.fillRect(btnX, resumeY, btnW, btnH);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.strokeRect(btnX, resumeY, btnW, btnH);
        ctx.fillStyle = '#062006';
        ctx.font = '18px Arial';
        ctx.fillText('RESUME', btnX + btnW / 2, resumeY + btnH / 2 + 6);

        // Restart button
        const restartY = resumeY + btnH + 12;
        ctx.fillStyle = '#ffd54d';
        ctx.fillRect(btnX, restartY, btnW, btnH);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.strokeRect(btnX, restartY, btnW, btnH);
        ctx.fillStyle = '#222222';
        ctx.fillText('RESTART', btnX + btnW / 2, restartY + btnH / 2 + 6);

        // store rects for clicks
        this.uiRects.pause.resumeButton = { x: btnX, y: resumeY, w: btnW, h: btnH };
        this.uiRects.pause.restartButton = { x: btnX, y: restartY, w: btnW, h: btnH };

        ctx.textAlign = 'left';
    }

    renderLevelUpScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Level up title
        this.ctx.fillStyle = 'gold';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LEVEL UP!', this.width / 2, 140);

        // Upgrade options
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Choose an upgrade:', this.width / 2, 180);

        // Clear previous rects
        this.uiRects.upgradeOptions = [];

        for (let i = 0; i < this.upgradeOptions.length; i++) {
            const upgrade = this.upgradeOptions[i];
            const y = 220 + i * 80;
            const x = this.width / 2 - 220;
            const w = 440;
            const h = 64;

            // Background for option
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            this.ctx.fillRect(x, y - 8, w, h);

            // Store rect for click handling
            this.uiRects.upgradeOptions.push({ x: x, y: y - 8, w: w, h: h });

            // Upgrade text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${i + 1}. ${upgrade.name}`, x + 18, y + 18);
            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = 'lightgray';
            this.ctx.fillText(upgrade.description, x + 18, y + 40);

            // small "press 1/2/3" badge
            this.ctx.fillStyle = 'rgba(255,255,255,0.04)';
            this.ctx.fillRect(x + w - 74, y + 12, 54, 28);
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText((i + 1).toString(), x + w - 74 + 27, y + 32);
        }

        this.ctx.fillStyle = 'yellow';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Click an option or press 1, 2, or 3', this.width / 2, 520);
        this.ctx.textAlign = 'left';
    }

    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }

    restart(startImmediately = false) {
        this.bullets = [];
        this.enemies = [];
        this.shooters = [];
        this.tanks = [];
        this.sprinters = [];
        this.bosses = [];
        this.particles = [];
        this.score = 0;
        this.lives = 5;
        this.exp = 0;
        this.level = 1;
        this.expToNextLevel = 100;
        this.waveNumber = 1;
        this.waveProgress = 0;
        this.waveRequirement = 300;
        this.globalEnemyMultiplier = 1;
        this.showLevelUp = false;
        this.gamePaused = false;
        this.gamePausedReason = '';
        this.gameRunning = startImmediately; // if called from startGame, start playing immediately
        this.started = startImmediately || this.started; // keep started true if asked
        this.player = new Player(this.width / 2, this.height - 50);
    // give player a reference back to the game for multiplier access
    this.player.game = this;

        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('livesValue').textContent = this.lives;
        document.getElementById('gameOver').classList.add('hidden');
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 0.3;
        this.health = 10;
        this.maxHealth = 10;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.shootCooldown = 0;
        this.shootCooldownMax = 200;
        this.damage = 1;
        this.bulletSpeed = 0.5;
        this.pierce = 1;
        this.ricochet = false;
        this.ricochetBounces = 0; // number of bounces assigned to bullets
        this.multiShot = 1;
        this.shieldDuration = 1000;
        this.lifeSteal = false;
        // customization
        this.colorChoices = ['#00ff00', '#00aaffff', '#8c00ffff', '#00ffffff', '#ff6600', '#ff0000ff'];
        this.colorIndex = 0;
        this.color = this.colorChoices[this.colorIndex];
        this.shapeIndex = 0; // 0: triangle, 1: circle, 2: square
    }

    update(keys, deltaTime) {
        // Movement
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.x = Math.max(0, this.x - this.speed * deltaTime);
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.x = Math.min(800 - this.width, this.x + this.speed * deltaTime);
        }
        if (keys['ArrowUp'] || keys['KeyW']) {
            this.y = Math.max(0, this.y - this.speed * deltaTime);
        }
        if (keys['ArrowDown'] || keys['KeyS']) {
            this.y = Math.min(600 - this.height, this.y + this.speed * deltaTime);
        }

        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    shoot(bullets, tx, ty) {
        // Accept optional target x,y; forward to shootTo
        this.shootTo(bullets, tx, ty);
    }

    // Aim at (tx, ty). If tx/ty omitted, will shoot straight up.
    shootTo(bullets, tx, ty) {
        if (this.shootCooldown > 0) return;
        this.shootCooldown = this.shootCooldownMax;

        // target defaults
        tx = tx === undefined ? this.x + this.width / 2 : tx;
        ty = ty === undefined ? this.y - 10 : ty;

        const dx = tx - (this.x + this.width / 2);
        const dy = ty - (this.y + this.height / 2);
        const baseAngle = Math.atan2(dy, dx);

        const spreadAngle = this.multiShot > 1 ? 0.25 : 0;
        const startAngle = baseAngle - (this.multiShot - 1) * spreadAngle / 2;

        for (let i = 0; i < this.multiShot; i++) {
            const angle = startAngle + i * spreadAngle;
            const speed = this.bulletSpeed;
            const bullet = new Bullet(this.x + this.width / 2 - 2, this.y + this.height / 2, true);
            bullet.damage = this.damage;
            bullet.pierce = this.pierce;
            bullet.ricochet = this.ricochet;
            bullet.ricochetBounces = this.ricochet ? (this.ricochetBounces || 2) : 0;
            bullet.vx = Math.cos(angle) * speed;
            bullet.vy = Math.sin(angle) * speed;
            bullets.push(bullet);
        }
    }

    cycleColor() {
        this.colorIndex = (this.colorIndex + 1) % this.colorChoices.length;
        this.color = this.colorChoices[this.colorIndex];
    }

    cycleShape() {
        this.shapeIndex = (this.shapeIndex + 1) % 3;
    }

    takeDamage() {
        // backward compatible call => subtract 1
        this.takeDamageAmount(1);
    }

    takeDamageAmount(amount) {
        if (!this.invulnerable) {
            this.health -= amount;
            this.invulnerable = true;
            this.invulnerabilityTimer = this.shieldDuration;
        }
    }

    render(ctx) {
        // Flash when invulnerable
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }

        ctx.fillStyle = this.color || '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw a simple ship shape
        ctx.fillStyle = '#ffffff';
        if (this.shapeIndex === 0) {
            // triangle
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + 4);
            ctx.lineTo(this.x + 6, this.y + this.height - 6);
            ctx.lineTo(this.x + this.width - 6, this.y + this.height - 6);
            ctx.closePath();
            ctx.fill();
        } else if (this.shapeIndex === 1) {
            // circle
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.width, this.height) / 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // square
            ctx.fillRect(this.x + 6, this.y + 6, this.width - 12, this.height - 12);
        }

        ctx.globalAlpha = 1;
    }
}

class Bullet {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = isPlayer ? -0.5 : 0.3;
        this.vx = 0;
        this.vy = this.speed;
        this.damage = 1;
        this.pierce = 1;
        this.ricochet = false;
        this.ricochetBounces = 0;
        this.isPlayer = isPlayer;
    }

    update(deltaTime) {
        if (this.vx !== 0 || this.vy !== this.speed) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
        } else {
            this.y += this.speed * deltaTime;
        }
    }

    render(ctx) {
        ctx.fillStyle = this.isPlayer ? '#ffff00' : '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 0.1 * multiplier;
        this.hp = Math.ceil(1 * multiplier);
        this.contactDamage = Math.ceil(1 * multiplier);
    }

    update(deltaTime) {
        this.y += this.speed * deltaTime;
    }

    render(ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 5, 20, 20);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 10, this.y + 10, 10, 10);
    }
}

class Shooter {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 0.08 * multiplier;
        this.shootCooldown = Math.max(800, 1500 / multiplier);
        this.lastShootTime = 0;
        this.contactDamage = Math.ceil(2 * multiplier);
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        this.y += this.speed * deltaTime;

        this.lastShootTime += deltaTime;
        if (this.lastShootTime >= this.shootCooldown) {
            this.shoot(bullets, player, damageMultiplier);
            this.lastShootTime = 0;
        }
    }

    shoot(bullets, player, damageMultiplier = 1) {
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const dy = player.y + player.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        const speed = 0.25;
        const bulletVx = (dx / distance) * speed;
        const bulletVy = (dy / distance) * speed;

        const bullet = new Bullet(this.x + this.width / 2, this.y + this.height, false);
        bullet.vx = bulletVx;
        bullet.vy = bulletVy;
        // Set damage using provided multiplier
        bullet.damage = Math.ceil((this.contactDamage || 1) * damageMultiplier);
        bullets.push(bullet);
    }

    render(ctx) {
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 5, 20, 20);
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(this.x + 12, this.y + 25, 6, 8);
    }
}

class Tank {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 40;
        this.speed = 0.03 * multiplier;
        this.hp = Math.ceil(3 * multiplier);
        this.maxHp = Math.ceil(3 * multiplier);
        this.contactDamage = Math.ceil(2 * multiplier);
        this.shootCooldown = Math.max(1000, 2000 / multiplier);
        this.lastShootTime = 0;
        this.movementPattern = Math.random() > 0.5 ? 1 : -1;

    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        this.y += this.speed * deltaTime;
        this.x += this.movementPattern * 0.02 * deltaTime;

        if (this.x <= 0 || this.x >= 800 - this.width) {
            this.movementPattern *= -1;
        }

        this.lastShootTime += deltaTime;
        if (this.lastShootTime >= this.shootCooldown) {
            this.shoot(bullets, player, damageMultiplier);
            this.lastShootTime = 0;
        }
    }

    shoot(bullets, player, damageMultiplier = 1) {
        for (let i = -1; i <= 1; i++) {
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            const speed = 0.2;
            const spread = i * 0.3;
            const bulletVx = ((dx / distance) * speed) + spread;
            const bulletVy = (dy / distance) * speed;

            const bullet = new Bullet(this.x + this.width / 2, this.y + this.height, false);
            bullet.vx = bulletVx;
            bullet.vy = bulletVy;
            bullet.damage = Math.ceil((this.contactDamage || 1) * damageMultiplier);
            bullets.push(bullet);
        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x, this.y + this.height - 8, this.width, 8);
        ctx.fillRect(this.x, this.y, this.width, 8);

        ctx.fillStyle = '#555555';
        ctx.fillRect(this.x + 15, this.y + 10, 20, 20);

        ctx.fillStyle = '#444444';
        ctx.fillRect(this.x + 22, this.y + 30, 6, 15);

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 8, this.width, 4);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 8, (this.hp / this.maxHp) * this.width, 4);
    }
}

class Sprinter {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 0.4 * multiplier;
        this.hp = Math.ceil(1 * multiplier);
        this.maxHp = Math.ceil(1 * multiplier);
        this.contactDamage = Math.ceil(1 * multiplier);
        this.dashTimer = 0;
        this.dashCooldown = Math.max(2000, 3000 / multiplier);
        this.isDashing = false;
        this.dashDuration = 500;
        this.targetX = x;
    }

    // Called from Game.updateEntities as sprinter.update(deltaTime, this.player)
    update(deltaTime, player) {
        this.dashTimer += deltaTime;

        if (!this.isDashing) {
            // Normal movement downward
            this.y += this.speed * deltaTime;

            // Slight horizontal tracking toward player
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            if (Math.abs(dx) > 5) {
                this.x += Math.sign(dx) * 0.1 * deltaTime;
            }

            // Start a dash when cooldown elapsed
            if (this.dashTimer >= this.dashCooldown) {
                this.startDash(player);
            }
        } else {
            // Dash movement: faster downward and quickly approach target X
            this.y += this.speed * 3 * deltaTime;

            const dx = this.targetX - this.x;
            if (Math.abs(dx) > 2) {
                this.x += Math.sign(dx) * 0.5 * deltaTime;
            }

            // End dash after dashDuration
            if (this.dashTimer >= this.dashCooldown + this.dashDuration) {
                this.isDashing = false;
                this.dashTimer = 0;
            }
        }

        // Keep inside bounds
        this.x = Math.max(0, Math.min(800 - this.width, this.x));
    }

    startDash(player) {
        this.isDashing = true;
        this.targetX = player.x + player.width / 2 - this.width / 2;
        this.targetX = Math.max(0, Math.min(800 - this.width, this.targetX));
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        if (this.isDashing) {
            ctx.fillStyle = '#ff66ff';
        } else if (this.dashTimer > this.dashCooldown - 1000) {
            ctx.fillStyle = '#ffaaff';
        } else {
            ctx.fillStyle = '#ff00ea';
        }

        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.isDashing) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x - 10 - i * 5, this.y + 5 + i * 5);
                ctx.lineTo(this.x - 5 - i * 5, this.y + 10 + i * 5);
                ctx.stroke();
            }
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 5, this.y + 5, 15, 15);
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 10, this.y + 8, 5, 5);
    }
}

class Boss {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 60;
        this.speed = 0.02 * multiplier;
    this.hp = Math.ceil(15 * multiplier);
        this.maxHp = Math.ceil(15 * multiplier);
        this.shootCooldown = Math.max(400, 800 / multiplier);
    this.lastShootTime = 0;
    this.contactDamage = Math.ceil(4 * multiplier);
        this.specialAttackCooldown = Math.max(3000, 5000 / multiplier);
        this.lastSpecialAttack = 0;
        this.movementDirection = 1;
        this.phase = 1;
    }

    // accept damageMultiplier from Game so boss bullets scale consistently
    update(deltaTime, bullets, player, damageMultiplier = 1) {
        if (this.hp <= this.maxHp * 0.3) {
            this.phase = 3;
        } else if (this.hp <= this.maxHp * 0.6) {
            this.phase = 2;
        }

        this.y += this.speed * deltaTime;
        this.x += this.movementDirection * 0.05 * deltaTime;

        if (this.x <= 0 || this.x >= 800 - this.width) {
            this.movementDirection *= -1;
        }

        this.lastShootTime += deltaTime;
        const shootRate = this.phase === 3 ? 400 : this.phase === 2 ? 600 : 800;
        if (this.lastShootTime >= shootRate) {
            this.shoot(bullets, player, damageMultiplier);
            this.lastShootTime = 0;
        }

        this.lastSpecialAttack += deltaTime;
        if (this.lastSpecialAttack >= this.specialAttackCooldown) {
            this.specialAttack(bullets, player, damageMultiplier);
            this.lastSpecialAttack = 0;
        }
    }

    // boss regular targeted shots use damageMultiplier
    shoot(bullets, player, damageMultiplier = 1) {
        const numBullets = this.phase === 3 ? 5 : this.phase === 2 ? 3 : 1;

        for (let i = 0; i < numBullets; i++) {
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            const speed = 0.25;
            const spread = (i - Math.floor(numBullets / 2)) * 0.4;
            const bulletVx = ((dx / distance) * speed) + spread;
            const bulletVy = (dy / distance) * speed;

            const bullet = new Bullet(this.x + this.width / 2, this.y + this.height, false);
            bullet.vx = bulletVx;
            bullet.vy = bulletVy;
            bullet.damage = Math.ceil((this.contactDamage || 1) * damageMultiplier);
            bullets.push(bullet);
        }
    }

    // circular special attack; apply damageMultiplier to each bullet
    specialAttack(bullets, player, damageMultiplier = 1) {
        const numBullets = 8;
        const speed = 0.2;
        for (let i = 0; i < numBullets; i++) {
            const angle = (i / numBullets) * Math.PI * 2;

            const bullet = new Bullet(this.x + this.width / 2, this.y + this.height / 2, false);
            bullet.vx = Math.cos(angle) * speed;
            bullet.vy = Math.sin(angle) * speed;
            bullet.damage = Math.ceil((this.contactDamage || 1) * damageMultiplier);
            bullets.push(bullet);
        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);

        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x + 5, this.y + 20, 10, 20);
        ctx.fillRect(this.x + this.width - 15, this.y + 20, 10, 20);

        const coreColor = this.phase === 3 ? '#ff0000' : this.phase === 2 ? '#ff6600' : '#ffff00';
        ctx.fillStyle = coreColor;
        ctx.fillRect(this.x + this.width / 2 - 10, this.y + this.height / 2 - 10, 20, 20);

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 12, this.width, 8);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 12, (this.hp / this.maxHp) * this.width, 8);

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x + this.width / 2, this.y - 16);
        ctx.textAlign = 'left';
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.life = 1000;
        this.maxLife = 1000;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.life -= deltaTime;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.fillRect(this.x, this.y, 3, 3);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});