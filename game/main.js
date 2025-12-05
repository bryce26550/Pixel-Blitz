// Global variables
let pendingAction = 'play';

// Payment functions
function pay() {
    document.querySelector('.payment-content').style.display = 'block';
    document.querySelector('.payment-overlay').style.display = 'block';
}

function hidePayment() {
    document.querySelector('.payment-content').style.display = 'none';
    document.querySelector('.payment-overlay').style.display = 'none';

    // Check if we need to return to pause menu
    if (window.game && window.game.restartFromPause) {
        console.log('Payment cancelled, returning to pause menu');
        window.game.restartFromPause = false; // Reset flag
        window.game.showPauseMenu(); // Show pause menu again
    }
}

async function post(path, body) {
    const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

async function doTransfer() {
    const pin = document.getElementById('pin').value;

    if (!pin) {
        alert('Please enter your PIN.');
        return;
    }

    console.log('Sending payment request with PIN:', pin);

    try {
        const result = await post('/payIn', { pin });
        console.log('Raw server response:', result);

        if (result.ok === true) {
            hidePayment();

            await new Promise(resolve => setTimeout(resolve, 100));

            if (window.game) {
                console.log('Calling game.startGame()...');

                // Check if this was a restart from pause menu
                if (window.game.restartFromPause) {
                    window.game.restartFromPause = false; // Reset flag
                    window.game.restart(true); // Restart and begin immediately
                } else {
                    window.game.startGame(); // Normal start
                }
            } else {
                console.error('window.game not found!');
            }
            return;
        } else {
            let errorMessage = result.error || result.message || 'Unknown error';
            console.log('Payment failed with error:', errorMessage);
            alert('Payment failed: ' + errorMessage);
            console.error('Payment failed:', result);
        }
    } catch (error) {
        console.error('Network/parsing error:', error);
        alert('Payment failed: Network error');
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.serverSessionId = null

        this.player = new Player(this.width / 2, this.height - 50);
        this.mouseX = this.width / 2;
        this.mouseY = this.height / 2;
        this.bullets = [];
        this.enemies = [];
        this.shooters = [];
        this.tanks = [];
        this.sprinters = [];
        this.bosses = [];
        this.availableBosses = [Blaster, Slasher]; // Add Blaster, Slasher, Sentinel, Railgun, Overlord for all bosses to be available
        this.particles = [];

        // Pre-boss wave system
        this.preBossActive = false;
        this.preBossTimer = 0;
        this.preBossDuration = 5000; // 5 seconds
        this.preBossMessage = '';

        this.score = 0;
        this.lives = 3;
        this.exp = 0;
        this.level = 1;
        this.expToNextLevel = 100;
        this.showLevelUp = false;

        // Track per-wave scoring
        this.scoreThisWave = 0;
        this.lastWaveScore = 0;

        // Game state flags
        this.started = false;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gamePausedReason = '';
        this.restartFromPause = false

        this.waveNumber = 1;
        this.waveProgress = 0;
        this.waveRequirement = 300;
        this.waveStartTime = Date.now();
        this.globalEnemyMultiplier = 1;
        this.enemyDamageMultiplier = 1;

        this.keys = {};
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.shooterSpawnTimer = 0;
        this.tankSpawnTimer = 0;
        this.sprinterSpawnTimer = 0;
        this.bossSpawnedThisWave = false;

        // UI hit rects for canvas interactions
        this.uiRects = {
            startButton: null,
            colorBox: null,
            shapeBox: null,
            previewBox: null,
            upgradeOptions: [],
            pause: { resumeButton: null, restartButton: null }
        };

        this.renderer = new GameRenderer(this);

        this.showStartMenu(); // Show start menu initially
        this.setupEventListeners();
        this.gameLoop();
    }

    // Add these methods to your Game class:

    showStartMenu() {
        this.hideAllMenus();
        document.getElementById('startMenu').classList.remove('hidden');
        this.updatePlayerPreview();
    }

    showPauseMenu() {
        this.hideAllMenus();
        document.getElementById('pauseMenu').classList.remove('hidden');
    }

    showLevelUpMenu() {
        this.hideAllMenus();
        document.getElementById('levelUpMenu').classList.remove('hidden');
        this.populateUpgradeOptions();
    }

    hideAllMenus() {
        console.log('hideAllMenus called'); // Debug line

        const menuIds = ['startMenu', 'pauseMenu', 'levelUpMenu'];
        menuIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`Hiding ${id}`); // Debug line
                element.classList.add('hidden');
            } else {
                console.error(`Element ${id} not found!`);
            }
        });
    }


    updatePlayerPreview() {
        const playerSprite = document.getElementById('playerSprite');
        if (playerSprite) {
            // Clear any existing shape classes first
            playerSprite.classList.remove('triangle-shape', 'circle-shape', 'square-shape');

            // Set the background to player color (this is the ship body)
            playerSprite.style.backgroundColor = this.player.color;

            // Create or update the inner shape element
            let innerShape = playerSprite.querySelector('.inner-shape');
            if (!innerShape) {
                innerShape = document.createElement('div');
                innerShape.className = 'inner-shape';
                playerSprite.appendChild(innerShape);
            }

            // Style the inner shape (always white like in-game)
            innerShape.style.backgroundColor = '#ffffff';
            innerShape.style.position = 'absolute';
            innerShape.style.top = '50%';
            innerShape.style.left = '50%';
            innerShape.style.transform = 'translate(-50%, -50%)';

            // Apply the appropriate shape
            innerShape.classList.remove('triangle-shape', 'circle-shape', 'square-shape');

            if (this.player.shapeIndex === 0) {
                // Triangle
                innerShape.classList.add('triangle-shape');
                innerShape.style.width = '16px';
                innerShape.style.height = '16px';
            } else if (this.player.shapeIndex === 1) {
                // Circle
                innerShape.classList.add('circle-shape');
                innerShape.style.width = '12px';
                innerShape.style.height = '12px';
            } else {
                // Square
                innerShape.classList.add('square-shape');
                innerShape.style.width = '18px';
                innerShape.style.height = '18px';
            }
        }

        const colorNames = ['Green', 'Blue', 'Purple', 'Cyan', 'Orange', 'Red'];
        const shapeNames = ['Triangle', 'Circle', 'Square'];

        const colorNameEl = document.getElementById('colorName');
        const shapeNameEl = document.getElementById('shapeName');

        if (colorNameEl) colorNameEl.textContent = colorNames[this.player.colorIndex] || 'Unknown';
        if (shapeNameEl) shapeNameEl.textContent = shapeNames[this.player.shapeIndex] || 'Unknown';
    }


    updatePlayerShape(sprite) {
        sprite.classList.remove('triangle-shape', 'circle-shape', 'square-shape');

        if (this.player.shapeIndex === 0) {
            sprite.classList.add('triangle-shape');
        } else if (this.player.shapeIndex === 1) {
            sprite.classList.add('circle-shape');
        } else {
            sprite.classList.add('square-shape');
        }
    }

    populateUpgradeOptions() {
        const upgradeContainer = document.getElementById('upgradeOptions');
        if (!upgradeContainer) return;

        upgradeContainer.innerHTML = '';

        for (let i = 0; i < this.upgradeOptions.length; i++) {
            const upgrade = this.upgradeOptions[i];
            const optionDiv = document.createElement('div');
            optionDiv.className = 'upgrade-option';
            optionDiv.addEventListener('click', () => this.selectUpgrade(i));

            optionDiv.innerHTML = `
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-number">${i + 1}</div>
        `;

            upgradeContainer.appendChild(optionDiv);
        }
    }

    updateGameUI() {
        // Update all UI elements
        const elements = {
            'scoreValue': this.score,
            'livesValue': this.lives,
            'waveValue': this.waveNumber,
            'levelValue': this.level,
            'expValue': this.exp,
            'expMaxValue': this.expToNextLevel,
            'healthValue': this.player.health,
            'healthMaxValue': this.player.maxHealth
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        }

        // Update progress bars
        const waveProgress = (this.waveProgress / this.waveRequirement) * 100;
        const waveProgressFill = document.getElementById('waveProgressFill');
        if (waveProgressFill) waveProgressFill.style.width = waveProgress + '%';

        const expProgress = (this.exp / this.expToNextLevel) * 100;
        const expProgressFill = document.getElementById('expProgressFill');
        if (expProgressFill) expProgressFill.style.width = expProgress + '%';
    }


    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.started && (e.code === 'Enter' || e.code === 'Space')) {
                this.startGame();
                return;
            }

            if (this.started && e.code === 'Escape' && !this.showLevelUp) {
                this.togglePause();
                return;
            }

            if (!this.started) {
                if (e.code === 'KeyC') {
                    this.player.cycleColor();
                }
                if (e.code === 'KeyV') {
                    this.player.cycleShape();
                }
            }

            this.keys[e.code] = true;

            if (this.showLevelUp) {
                if (e.code === 'Digit1') this.selectUpgrade(0);
                if (e.code === 'Digit2') this.selectUpgrade(1);
                if (e.code === 'Digit3') this.selectUpgrade(2);
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // this.handleCanvasClick(x, y, e);
        });

        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', async () => {
                console.log('Game over restart button clicked');

                // Hide game over menu
                document.getElementById('gameOver').classList.add('hidden');

                // Reset to start menu state and show payment
                this.quitToMenu();
                pay();
            });
        }

        // Add these to your setupEventListeners() method:

        // Start button
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                pay();
            });
        }

        // Resume button
        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }

        // Pause restart button
        const pauseRestartBtn = document.getElementById('pauseRestartBtn');
        if (pauseRestartBtn) {
            pauseRestartBtn.addEventListener('click', async () => {
                console.log('Pause restart button clicked');

                // Process payout if there are winnings
                if (this.payOutAmount > 0) {
                    await this.automaticPayout();
                }

                // Set a flag so we know we came from pause menu
                this.restartFromPause = true;

                // Show payment prompt
                pay();
            });
        }

        // Quit button
        const quitBtn = document.getElementById('quitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                this.quitToMenu();
            });
        }

        // Add this to your setupEventListeners() method if it's missing:
        const mainMenuBtn = document.getElementById('mainMenuBtn'); // or quitBtn if you're using same ID
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                console.log('Game over main menu button clicked');

                // Hide game over menu explicitly
                document.getElementById('gameOver').classList.add('hidden');

                // Go to main menu
                this.quitToMenu();
            });
        }


        // Player customization buttons
        const colorBtn = document.getElementById('colorBtn');
        if (colorBtn) {
            colorBtn.addEventListener('click', () => {
                this.player.cycleColor();
                this.updatePlayerPreview();
            });
        }

        const shapeBtn = document.getElementById('shapeBtn');
        if (shapeBtn) {
            shapeBtn.addEventListener('click', () => {
                this.player.cycleShape();
                this.updatePlayerPreview();
            });
        }

        // Player preview click
        const playerPreview = document.getElementById('playerPreview');
        if (playerPreview) {
            playerPreview.addEventListener('click', () => {
                this.player.cycleColor();
                this.updatePlayerPreview();
            });
        }

    }

    quitToMenu() {
        console.log('quitToMenu called');

        // Reset game state
        this.started = false;
        this.gameRunning = false;
        this.gamePaused = false;
        this.showLevelUp = false;

        // Reset payment
        // hasPaid = false;

        // Explicitly hide game over menu
        const gameOverMenu = document.getElementById('gameOver');
        if (gameOverMenu) {
            gameOverMenu.classList.add('hidden');
        }

        // Hide all other menus and show start menu
        this.hideAllMenus();
        this.showStartMenu();

        console.log('Should be showing start menu now');
    }



    async startGame() {
        // Check payment status with server
        const accessCheck = await post('/checkGameAccess', {});

        if (accessCheck.needsPayment) {
            pay(); // Show payment dialog
            return;
        }

        // Start server game session
        const sessionResult = await post('/startGameSession', {});

        if (!sessionResult.ok) {
            console.error('Failed to start game session:', sessionResult.error);
            pay(); // Require payment
            return;
        }

        this.serverSessionId = sessionResult.sessionId;
        console.log('Server game session started');

        // Start client game
        this.started = true;
        this.gameRunning = true;
        this.hideAllMenus();
        this.restart(true);
    }

    getRandomBoss() {
        const randomIndex = Math.floor(Math.random() * this.availableBosses.length);
        const bossClass = this.availableBosses[randomIndex];

        console.log(`Random boss selected: ${bossClass}`);

        const boss = new bossClass(this.width / 2 - 40, 50, this.globalEnemyMultiplier);

        // Give boss access to game dimensions
        boss.gameWidth = this.width;
        boss.gameHeight = this.height;

        return boss;
    }


    togglePause() {
        this.gamePaused = !this.gamePaused;
        this.gamePausedReason = this.gamePaused ? 'pause' : '';

        if (this.gamePaused) {
            this.showPauseMenu();
        } else {
            this.hideAllMenus();
        }
    }
    pointInRect(x, y, rect) {
        if (!rect) return false;
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    update(deltaTime) {
        if (!this.started) return;
        if (!this.gameRunning || this.gamePaused) return;

        if (this.preBossActive) {
            this.player.update(this.keys, deltaTime);
            this.updatePreBossSequence(deltaTime);
            return;
        }

        this.player.update(this.keys, deltaTime);

        // Spawn enemies
        this.spawnEnemies(deltaTime);

        // Update all entities
        this.updateEntities(deltaTime);

        // Check collisions
        this.checkCollisions();

        // Player shooting
        if (this.keys['Space']) {
            this.player.shoot(this.bullets, this.mouseX, this.mouseY);
        }

        this.checkWaveProgress();
        this.checkLevelUp();
    }

    isBossWave() {
        return (this.waveNumber - 5) % 10 === 0 && this.waveNumber >= 5;
    }

    spawnEnemies(deltaTime) {
        const baseSpawnRate = Math.max(300, 1200 - (this.waveNumber * 50));

        if (this.isBossWave()) {
            // Only spawn the boss
            if ((this.waveNumber - 5) % 10 === 0 && this.waveNumber >= 5 && !this.bossSpawnedThisWave) {
                this.bosses.push(this.getRandomBoss());
                this.bossSpawnedThisWave = true;
            }
            return; // Exit early - no regular enemies on boss waves
        }

        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > baseSpawnRate) {
            this.enemies.push(new Enemy(Math.random() * (this.width - 40), -40, this.globalEnemyMultiplier));
            this.enemySpawnTimer = 0;
        }

        this.shooterSpawnTimer += deltaTime;
        if (this.shooterSpawnTimer > 6000) {
            this.shooters.push(new Shooter(Math.random() * (this.width - 40), -40, this.globalEnemyMultiplier));
            this.shooterSpawnTimer = 0;
        }

        this.tankSpawnTimer += deltaTime;
        if (this.tankSpawnTimer > 10000 && this.waveNumber >= 2) {
            this.tanks.push(new Tank(Math.random() * (this.width - 50), -50, this.globalEnemyMultiplier));
            this.tankSpawnTimer = 0;
        }

        this.sprinterSpawnTimer += deltaTime;
        if (this.sprinterSpawnTimer > 8000 && this.waveNumber >= 3) {
            this.sprinters.push(new Sprinter(Math.random() * (this.width - 40), -40, this.globalEnemyMultiplier));
            this.sprinterSpawnTimer = 0;
        }
    }

    startPreBossSequence(nextWaveNumber) {
        console.log(`starting pre-boss sequence for wave ${nextWaveNumber}`);

        this.preBossActive = true;
        this.preBossTimer = 0;
        this.preBossMessage = `BOSS WAVE ${nextWaveNumber} INCOMING!`;

        this.clearAllEnemies();

        this.pendingWaveNumber = nextWaveNumber;
    }

    clearAllEnemies() {
        // Create explosions for dramatic effect
        [...this.enemies, ...this.shooters, ...this.tanks, ...this.sprinters].forEach(enemy => {
            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        });

        // Actually clear all enemies and bullets
        this.enemies = [];
        this.shooters = [];
        this.tanks = [];
        this.sprinters = [];
        this.bullets = [];
    }

    updatePreBossSequence(deltaTime) {
        this.preBossTimer += deltaTime;

        const timeRemaining = Math.ceil((this.preBossDuration - this.preBossTimer) / 1000);
        this.preBossMessage = `BOSS WAVE ${this.pendingWaveNumber} IN ${timeRemaining}...`;

        if (this.preBossTimer >= this.preBossDuration) {
            this.endPreBossSequence();
        }
    }

    endPreBossSequence() {
        console.log('Pre-Boss sequence complete, starting boss wave');

        this.preBossActive = false;
        this.preBossTimer = 0;
        this.preBossMessage = '';

        this.waveNumber = this.pendingWaveNumber;
        this.bossSpawnedThisWave = false;
        this.waveProgress = 0;
        this.waveStartTime = Date.now();
    }

    async checkWaveProgress() {
        if (this.waveProgress >= this.waveRequirement) {
            if (this.waveProgress >= this.waveRequirement) {
                const waveCompleteTime = Date.now() - this.waveStartTime;

                // Calculate score gained this wave (you'll need to track this)
                const scoreThisWave = this.scoreThisWave || 0; // Track this properly

                // Report to server for validation
                const result = await post('/recordGameEvent', {
                    eventType: 'WAVE_COMPLETE',
                    data: {
                        waveNumber: this.waveNumber,
                        timeTaken: waveCompleteTime,
                        scoreGained: scoreThisWave
                    }
                });

                if (!result.ok) {
                    console.error('Server rejected wave completion:', result.error);
                    alert('Game session ended due to validation error');
                    this.gameOver();
                    return;
                }

                const nextWave = result.nextWave;
                const isNextWaveBoss = (nextWave - 5) % 10 === 0 && nextWave >= 5;

                if (isNextWaveBoss) {
                    this.startPreBossSequence(nextWave);
                } else {
                    // Normal wave transition
                    this.waveNumber = result.nextWave;
                    this.bossSpawnedThisWave = false;
                    this.waveProgress = 0;
                    this.waveStartTime = Date.now();
                }

                // reset wave score
                this.lastWaveScore = this.scoreThisWave;
                this.scoreThisWave = 0;

                console.log(`Wave completed. Server payout: ${result.totalPayout}`);
            }
        }
    };

    checkLevelUp() {
        if (this.exp >= this.expToNextLevel && !this.showLevelUp) {
            this.showLevelUp = true;
            this.gamePaused = true;
            this.gamePausedReason = 'levelup';
            this.generateUpgradeOptions();
            this.showLevelUpMenu(); // Show HTML level up menu
        }
    }

    generateUpgradeOptions() {
        const allUpgrades = [
            { name: "Bonus Shield", description: "+5 Max Shield", effect: () => { this.player.maxHealth += 5; this.player.health += 5; } },
            { name: "Damage Boost", description: "+1 Bullet Damage", effect: () => { this.player.damage += 1; } },
            { name: "Fire Rate", description: "Faster Shooting", effect: () => { this.player.shootCooldownMax = Math.max(50, this.player.shootCooldownMax - 30); } },
            { name: "Bullet Speed", description: "Faster Bullets", effect: () => { this.player.bulletSpeed += 0.2; } },
            { name: "Pierce Shot", description: "Bullets Go Through Enemies", effect: () => { this.player.pierce += 1; } },
            { name: "Ricochet", description: "Bullets Bounce (2 bounces)", effect: () => { this.player.ricochet = true; this.player.ricochetBounces = (this.player.ricochetBounces || 0) + 2; } },
            { name: "Multi Shot", description: "+1 Bullet Per Shot", effect: () => { this.player.multiShot += 1; } },
            { name: "Speed Boost", description: "Move Faster", effect: () => { this.player.speed += 0.1; } },
            { name: "Life Steal", description: "Recover Shield on Enemy Kill", effect: () => { this.player.lifeSteal = true; } },
            { name: "Shield Recharge", description: "Recover Lost Shield", effect: () => { this.player.health += 5; } }
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
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
            this.showLevelUp = false;
            this.gamePaused = false;
            this.gamePausedReason = '';
            this.upgradeOptions = [];
            this.hideAllMenus(); // Hide menus when resuming
        }
    }

    addExp(amount) {
        this.exp += amount;
    }

    updateEntities(deltaTime) {
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);

            // Ricochet bullets off walls
            if (bullet.ricochet && bullet.isPlayer) {
                if (bullet.x <= 0 || bullet.x + bullet.width >= this.width) {
                    bullet.vx *= -1;
                    bullet.vx *= 0.85;
                    bullet.vy *= 0.95;
                    bullet.x = Math.max(0, Math.min(this.width - bullet.width, bullet.x));
                    bullet.ricochetBounces = (bullet.ricochetBounces || 0) - 1;
                }
                if (bullet.y <= 0 || bullet.y + bullet.height >= this.height) {
                    bullet.vy *= -1;
                    bullet.vx *= 0.95;
                    bullet.vy *= 0.85;
                    bullet.y = Math.max(0, Math.min(this.height - bullet.height, bullet.y));
                    bullet.ricochetBounces = (bullet.ricochetBounces || 0) - 1;
                }

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
                    const enemy = this.enemies[j];

                    // Damage the enemy first
                    enemy.takeDamage ? enemy.takeDamage(bullet.damage) : (enemy.hp -= bullet.damage);
                    this.createExplosion(bullet.x, bullet.y);

                    if (enemy.hp <= 0) {
                        this.createExplosion(enemy.x, enemy.y);
                        this.enemies.splice(j, 1);
                        this.score += 10;
                        this.scoreThisWave += 10;
                        this.waveProgress += 10;
                        this.addExp(5);
                        if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                            this.player.health++;
                        }
                    }
                    hit = true;
                    hitCount++;
                    if (hitCount >= bullet.pierce) break;
                }
            }

            // Check vs shooters
            for (let j = this.shooters.length - 1; j >= 0 && hitCount < bullet.pierce; j--) {
                if (this.checkCollision(bullet, this.shooters[j])) {
                    const shooter = this.shooters[j];

                    // Damage the enemy first
                    shooter.takeDamage ? shooter.takeDamage(bullet.damage) : (shooter.hp -= bullet.damage);
                    this.createExplosion(bullet.x, bullet.y);

                    if (shooter.hp <= 0) {
                        this.createExplosion(shooter.x, shooter.y);
                        this.shooters.splice(j, 1);
                        this.score += 25;
                        this.scoreThisWave += 25;
                        this.waveProgress += 25;
                        this.addExp(12);
                        if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                            this.player.health++;
                        }
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

                    if (this.tanks[j].hp <= 0) {
                        this.createExplosion(this.tanks[j].x, this.tanks[j].y);
                        this.tanks.splice(j, 1);
                        this.score += 50;
                        this.scoreThisWave += 50;
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

                    if (this.sprinters[j].hp <= 0) {
                        this.createExplosion(this.sprinters[j].x, this.sprinters[j].y);
                        this.sprinters.splice(j, 1);
                        this.score += 75;
                        this.scoreThisWave += 75;
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

                    if (this.bosses[j].hp <= 0) {
                        this.createExplosion(this.bosses[j].x, this.bosses[j].y);
                        this.bosses.splice(j, 1);
                        this.score += 200;
                        this.scoreThisWave += 200;
                        this.waveProgress += this.waveRequirement; // Complete the wave
                        this.addExp(100);
                        if (this.player.lifeSteal && this.player.health < this.player.maxHealth) {
                            this.player.health += 3;
                        }
                    }
                    hit = true;
                    hitCount++;
                }
            }

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
                const isBoss = this.bosses.includes(allEnemies[i]);
                if (!isBoss) {
                    this.removeEnemyFromArrays(allEnemies[i]);
                }
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

    async automaticPayout() {
        if (this.payOutAmount <= 0) {
            console.log('No payout needed - amount is 0');
            return true;
        }

        console.log(`Initiating automatic payout of ${this.payOutAmount} digipogs`);

        try {
            const result = await post('/payOut', { payOutAmount: this.payOutAmount });
            console.log('Automatic payout result:', result);

            if (result.ok) {
                console.log(`Successfully paid out ${this.payOutAmount} digipogs automatically`);
                this.payOutAmount = 0;
                return true;
            } else {
                console.error('Automatic payout failed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Automatic payout error:', error);
            return false;
        }
    }

    async gameOver() {
        this.gameRunning = false;

        // End server session and get final payout
        const endResult = await post('/endGame', {});

        const finalPayout = endResult.ok ? endResult.payout : 0;

        // Update UI with server-calculated payout
        const payOutAmountEl = document.getElementById('payOutAmount');
        if (payOutAmountEl) payOutAmountEl.textContent = finalPayout;

        document.getElementById('gameOver').classList.remove('hidden');
    }


    restart(startImmediately = false) {
        // Store current customization before creating new player
        const savedColor = this.player.color;
        const savedColorIndex = this.player.colorIndex;
        const savedShapeIndex = this.player.shapeIndex;

        // hasPaid = false;
        this.bullets = [];
        this.enemies = [];
        this.shooters = [];
        this.tanks = [];
        this.sprinters = [];
        this.bosses = [];
        this.particles = [];
        this.score = 0;
        this.lives = 3;
        this.exp = 0;
        this.level = 1;
        this.expToNextLevel = 100;
        this.waveNumber = 1;
        this.waveProgress = 0;
        this.waveRequirement = 300;
        this.globalEnemyMultiplier = 1;
        this.enemyDamageMultiplier = 1;
        this.bossSpawnedThisWave = false;
        this.showLevelUp = false;
        this.gamePaused = false;
        this.gamePausedReason = '';
        this.gameRunning = startImmediately;
        this.started = startImmediately || this.started;

        // Create new player and restore customization
        this.player = new Player(this.width / 2, this.height - 50);
        this.player.color = savedColor;
        this.player.colorIndex = savedColorIndex;
        this.player.shapeIndex = savedShapeIndex;
        this.player.game = this;

        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('livesValue').textContent = this.lives;
        document.getElementById('gameOver').classList.add('hidden');
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw game objects
        this.player.render(this.ctx);
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.shooters.forEach(shooter => shooter.render(this.ctx));
        this.tanks.forEach(tank => tank.render(this.ctx));
        this.sprinters.forEach(sprinter => sprinter.render(this.ctx));
        this.bosses.forEach(boss => boss.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));

        if (this.preBossActive) {
            this.renderPreBossOverlay();
        }

        // Update UI if game is running
        if (this.started && this.gameRunning) {
            this.updateGameUI();
        }
    }

    renderPreBossOverlay() {
        // Dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Warning message
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DANGER!', this.width / 2, this.height / 2 - 60);

        // Boss wave message
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '32px Arial';
        this.ctx.fillText(this.preBossMessage, this.width / 2, this.height / 2);

        // Instructions
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('PREPARE FOR BATTLE!', this.width / 2, this.height / 2 + 60);

        this.ctx.textAlign = 'left'; // Reset text alignment

        // Screen shake effect
        this.screenShake = { intensity: 10, duration: 1000, timer: 0 };

        // Flash effect
        this.flashEffect = { active: true, timer: 0, duration: 500 };
    }


    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    window.game = new Game();
});
