// Global variables
let hasPaid = false;
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
    if (window.game && window.game.restartFromPause && !hasPaid) {
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
            hasPaid = true;
            console.log('Payment successful - hasPaid set to:', hasPaid);
            hidePayment();

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
        this.lives = 3;
        this.exp = 0;
        this.level = 1;
        this.expToNextLevel = 100;
        this.showLevelUp = false;
        this.payOutAmount = 0;

        // Game state flags
        this.started = false;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gamePausedReason = '';
        this.restartFromPause = false

        this.waveNumber = 1;
        this.waveProgress = 0;
        this.waveRequirement = 300;
        this.globalEnemyMultiplier = 1;
        this.enemyDamageMultiplier = 1;

        this.keys = {};
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.shooterSpawnTimer = 0;
        this.tankSpawnTimer = 0;
        this.sprinterSpawnTimer = 0;
        this.bossSpawnTimer = 0;

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
            playerSprite.style.backgroundColor = this.player.color;
            this.updatePlayerShape(playerSprite);
        }
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

                // Payout should already be processed in gameOver(), but double-check
                if (this.payOutAmount > 0) {
                    await this.automaticPayout();
                }

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
    hasPaid = false;
    
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



    startGame() {
        console.log('=== startGame() called ===');
        console.log('hasPaid:', hasPaid);

        if (!hasPaid) {
            console.log('Payment required before starting game');
            return;
        }

        console.log('Payment verified, starting game...');

        this.started = true;
        this.gameRunning = true;
        this.gamePaused = false;
        this.showLevelUp = false;
        this.gamePausedReason = '';

        console.log('Hiding all menus...');
        this.hideAllMenus();

        console.log('Calling restart...');
        this.restart(true);
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

    // handleCanvasClick(x, y, originalEvent) {
    //     if (!this.started) {
    //         if (this.pointInRect(x, y, this.uiRects.startButton)) {
    //             pay();
    //             this.startGame();
    //             return;
    //         }
    //         if (this.pointInRect(x, y, this.uiRects.colorBox)) {
    //             this.player.cycleColor();
    //             return;
    //         }
    //         if (this.pointInRect(x, y, this.uiRects.shapeBox)) {
    //             this.player.cycleShape();
    //             return;
    //         }
    //         if (this.pointInRect(x, y, this.uiRects.previewBox)) {
    //             this.player.cycleColor();
    //             return;
    //         }
    //         return;
    //     }

    //     if (this.showLevelUp) {
    //         for (let i = 0; i < (this.uiRects.upgradeOptions || []).length; i++) {
    //             const rect = this.uiRects.upgradeOptions[i];
    //             if (this.pointInRect(x, y, rect)) {
    //                 this.selectUpgrade(i);
    //                 return;
    //             }
    //         }
    //         return;
    //     }

    //     if (this.gamePaused && this.gamePausedReason === 'pause') {
    //         if (this.pointInRect(x, y, this.uiRects.pause.resumeButton)) {
    //             this.togglePause();
    //             return;
    //         }
    //         if (this.pointInRect(x, y, this.uiRects.pause.restartButton)) {
    //             pay();
    //             this.restart(true);
    //             return;
    //         }
    //         return;
    //     }

    //     if (originalEvent && originalEvent.button === 0) {
    //         this.player.shoot(this.bullets, this.mouseX, this.mouseY);
    //     }
    // }

    update(deltaTime) {
        if (!this.started) return;
        if (!this.gameRunning || this.gamePaused) return;

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

    spawnEnemies(deltaTime) {
        const baseSpawnRate = Math.max(300, 1200 - (this.waveNumber * 50));

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

        this.bossSpawnTimer += deltaTime;
        if (this.bossSpawnTimer > 40000 && this.waveNumber >= 4) {
            this.bosses.push(new Boss(this.width / 2 - 40, -60, this.globalEnemyMultiplier));
            this.bossSpawnTimer = 0;
        }
    }

    checkWaveProgress() {
        if (this.waveProgress >= this.waveRequirement) {
            this.waveNumber++;
            this.waveProgress = 0;
            this.waveRequirement += 50;

            // Check for payout every 5 waves
            if (this.waveNumber % 5 === 0) {
                this.payOutAmount += 3;
                console.log(`Wave ${this.waveNumber} completed! Earned 3 digipogs. Total payout: ${this.payOutAmount}`);
            }

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
            this.showLevelUpMenu(); // Show HTML level up menu
        }
    }

    generateUpgradeOptions() {
        const allUpgrades = [
            { name: "Bonus Shield", description: "+2 Max Shield", effect: () => { this.player.maxHealth += 2; this.player.health += 2; } },
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

    console.log('Game over - processing automatic payout...');
    const payoutAmount = this.payOutAmount; // Store amount before payout
    await this.automaticPayout();

    // Update display elements
    const finalScoreEl = document.getElementById('finalScore');
    const payOutAmountEl = document.getElementById('payOutAmount');
    
    if (finalScoreEl) finalScoreEl.textContent = this.score;
    if (payOutAmountEl) payOutAmountEl.textContent = payoutAmount; // Show original amount earned
    
    // Show game over menu
    const gameOverMenu = document.getElementById('gameOver');
    if (gameOverMenu) {
        gameOverMenu.classList.remove('hidden');
        console.log('Game over menu should be visible');
    } else {
        console.error('Game over menu element not found!');
    }
}


    restart(startImmediately = false) {
        hasPaid = false;
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
        this.payOutAmount = 0;
        this.showLevelUp = false;
        this.gamePaused = false;
        this.gamePausedReason = '';
        this.gameRunning = startImmediately;
        this.started = startImmediately || this.started;
        this.player = new Player(this.width / 2, this.height - 50);
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

        // Update UI if game is running
        if (this.started && this.gameRunning) {
            this.updateGameUI();
        }
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
