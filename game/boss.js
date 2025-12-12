//Constants
const gameWidth = 800;
const gameHeight = 600;

// Boss Classes
class Blaster {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 60;
        this.speed = 0.15 * multiplier;
        this.hp = Math.ceil(85 * multiplier);
        this.maxHp = Math.ceil(75 * multiplier);
        this.shootCooldown = Math.max(400, 800 / multiplier);
        this.lastShootTime = 0;
        this.contactDamage = Math.ceil(4 * multiplier);
        this.specialAttackCooldown = Math.max(3000, 5000 / multiplier);
        this.lastSpecialAttack = 0;
        this.movementDirection = 1;
        this.phase = 1;
    }

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
        ctx.fillText('BLASTER', this.x + this.width / 2, this.y - 16);
        ctx.textAlign = 'left';
    }
}

class Slasher {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 40;

        // Health and damage
        this.hp = Math.ceil(65 * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(8 * multiplier);

        // Movement
        this.speed = 0.5 * multiplier;

        // Dash attack properties
        this.dashState = 'idle';
        this.lockOnTime = 0;
        this.lockOnDuration = 1500;
        this.dashSpeed = 1.2 * multiplier;
        this.dashDamage = Math.ceil(16 * multiplier);
        this.dashCooldown = 5000;
        this.cooldownTimer = 0; // Start ready to dash immediately
        this.dashRange = 300;

        // Target position for dash
        this.targetX = 0;
        this.targetY = 0;
        this.dashVelocityX = 0;
        this.dashVelocityY = 0;
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }

        console.log(`Dash state: ${this.dashState}, Cooldown: ${this.cooldownTimer}`);

        switch (this.dashState) {
            case 'idle':
                this.handleIdleState(deltaTime, player);
                break;
            case 'locking':
                this.handleLockingState(deltaTime, player);
                break;
            case 'dashing':
                this.handleDashingState(deltaTime);
                break;
            case 'cooldown':
                this.handleCooldownState(deltaTime, player);
                break;
        }
    }

    handleIdleState(deltaTime, player) {
        if (this.y < 0) {
            this.y += this.speed * deltaTime * 2;
            return;
        }

        // Movement toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Move toward player
        if (distance > 0) {
            this.x += (dx / distance) * this.speed * deltaTime;
            this.y += (dy / distance) * this.speed * deltaTime;
        }

        const withinRange = distance <= this.dashRange;
        const cooldownReady = this.cooldownTimer <= 0;

        console.log(`Distance: ${distance}, Within range: ${withinRange}, Cooldown ready: ${cooldownReady}`);

        if (withinRange && cooldownReady) {
            console.log('Starting lock-on phase');
            this.dashState = 'locking';
            this.lockOnTime = 0; // FIX: Reset to 0, not 3000
        }
    }

    handleLockingState(deltaTime, player) {
        console.log('Locking onto player...');
        this.lockOnTime += deltaTime;

        if (this.lockOnTime >= this.lockOnDuration) {
            console.log('Lock-on complete, starting dash');
            this.dashState = 'dashing';
            this.calculateDashTrajectory(player);
        }
    }

    calculateDashTrajectory(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        this.dashVelocityX = (dx / distance) * this.dashSpeed;
        this.dashVelocityY = (dy / distance) * this.dashSpeed;

        console.log(`Dash velocity: (${this.dashVelocityX}, ${this.dashVelocityY})`);
    }

    handleDashingState(deltaTime) {
        // Move the boss
        this.x += this.dashVelocityX * deltaTime;
        this.y += this.dashVelocityY * deltaTime;

        // Check if boss will hit wall BEFORE clamping position
        const willHitWall = (this.x <= 0) ||
            (this.x + this.width >= gameWidth) ||
            (this.y <= 0) ||
            (this.y + this.height >= gameHeight);

        if (willHitWall) {
            console.log('Hit wall! Ending dash');
            this.dashState = 'cooldown';
            this.cooldownTimer = this.dashCooldown; // Start 10-second cooldown

            // Clamp position after detecting collision
            this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
            this.y = Math.max(0, Math.min(this.y, gameHeight - this.height));
        }
    }

    handleCooldownState(deltaTime, player) {
        console.log(`Cooling down... ${this.cooldownTimer}ms remaining`);

        if (this.cooldownTimer <= 0) {
            console.log('Cooldown complete, returning to idle');
            this.dashState = 'idle';
            // Don't reset cooldownTimer here - it's already 0
        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        // Get current state for visual effects
        const isDashing = this.dashState === 'dashing';
        const isLocking = this.dashState === 'locking';
        const isCharging = this.dashState === 'locking' && this.lockOnTime > this.lockOnDuration * 0.5;

        // Add dash trail effect
        if (isDashing) {
            this.renderDashTrail(ctx);
        }

        // Main hull - color changes based on state
        let hullColor = '#7f001f'; // Default dark red
        if (isDashing) {
            hullColor = '#ff0000'; // Bright red when dashing
        } else if (isLocking) {
            // Pulsing effect during lock-on
            const pulseIntensity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            hullColor = `rgba(255, 51, 102, ${pulseIntensity})`;
        }

        ctx.fillStyle = hullColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Inner panel
        ctx.fillStyle = '#555555';
        ctx.fillRect(this.x + 8, this.y + 8, this.width - 16, this.height - 16);

        // Enhanced blade slashes - animate during lock-on
        ctx.strokeStyle = isCharging ? '#ff3366' : '#222222';
        ctx.lineWidth = isCharging ? 3 : 2;

        for (let i = 0; i < 3; i++) {
            const sx = this.x + 6 + i * 12;
            const sy = this.y + 6 + (i % 2 ? 0 : 6);

            // Add glow effect when charging
            if (isCharging) {
                ctx.shadowColor = '#ff3366';
                ctx.shadowBlur = 5;
            }

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 8, sy + 14);
            ctx.stroke();

            ctx.shadowBlur = 0; // Reset shadow
        }

        // Core triangle - more dramatic state changes
        let coreColor = '#ffccdd'; // Default light pink
        let coreSize = 8;

        if (isDashing) {
            coreColor = '#ffffff'; // White hot during dash
            coreSize = 12;
        } else if (isLocking) {
            coreColor = '#ff3366'; // Hot pink during lock-on
            coreSize = 10;
            // Add pulsing
            coreSize += Math.sin(Date.now() * 0.02) * 2;
        }

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.moveTo(cx, cy - coreSize);
        ctx.lineTo(cx - coreSize, cy + coreSize);
        ctx.lineTo(cx + coreSize, cy + coreSize);
        ctx.closePath();
        ctx.fill();

        // Enhanced core glow
        if (isDashing) {
            // Intense white glow during dash
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, coreSize + 8, 0, Math.PI * 2);
            ctx.stroke();
        } else if (isLocking) {
            // Pulsing red glow during lock-on
            const glowIntensity = Math.sin(Date.now() * 0.015) * 0.4 + 0.6;
            ctx.strokeStyle = `rgba(255, 51, 102, ${glowIntensity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, coreSize + 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Health bar
        ctx.fillStyle = 'darkred';
        ctx.fillRect(this.x, this.y - 10, this.width, 6);
        ctx.fillStyle = isDashing ? 'white' : 'lime';
        ctx.fillRect(this.x, this.y - 10, (Math.max(0, this.hp) / this.maxHp) * this.width, 6);
    }

    // Add these helper methods to your Slasher class:

    renderDashTrail(ctx) {
        // Create motion blur effect
        const trailLength = 5;
        const trailOpacity = 0.3;

        for (let i = 0; i < trailLength; i++) {
            const trailX = this.x - (this.dashVelocityX * i * 20);
            const trailY = this.y - (this.dashVelocityY * i * 20);
            const opacity = trailOpacity * (1 - i / trailLength);

            ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
            ctx.fillRect(trailX, trailY, this.width, this.height);
        }
    }

}

class Sentinel {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 80;  // Adjust per boss
        this.height = 60; // Adjust per boss

        // Health and damage
        this.hp = Math.ceil(125 * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(baseDamage * multiplier);

        // Boss-specific properties go here
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        // Boss-specific behavior goes here
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        // Boss appearance
    }
}

class Railgun {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 80;  // Adjust per boss
        this.height = 60; // Adjust per boss

        // Health and damage
        this.hp = Math.ceil(50 * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(baseDamage * multiplier);

        // Movement
        this.speed = 0.05 * multiplier;

        // Boss-specific properties go here
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        // Boss-specific behavior goes here
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        // Boss appearance
    }
}

class Overlord {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;

        // Health and damage
        this.hp = Math.ceil(45 * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(3 * multiplier);

        // Movement
        this.preferredDistance = 200;
        this.moveSpeed = 0.1 * multiplier;
        this.retreatSpeed = 0.25 * multiplier; // Faster when threatened
        this.movementDirection = 1; // For side-to-side drift
        this.lastPlayerDistance = 200; // Track if player is getting closer
        this.moveState = 'drifting';
        this.stateTimer = 0;

        // Wave spawning properties
        this.waveSpawnTimer = 0;
        this.spawnCooldown = 3500;
        this.isSpawningWave = false;
        this.remainingEnemies = [];
        this.spawnDelay = 500;
        this.enemySpawnTimer = 0;
        this.lastHealthPercentage = 1.0;

        // Define waves in constructor
        this.waves = {
            first: [Enemy, Enemy, Shooter],
            second: [Enemy, Enemy, Shooter, Shooter],
            third: [Enemy, Sprinter, Tank, Shooter, Shooter],
            fourth: [Tank, Tank, Tank, Sprinter, Shooter, Shooter]
        };
        this.currentWave = this.waves.first;
    }

    update(deltaTime, bullets, player, damageMultiplier = 1, enemyArrays = null) {
        const currentHealthPercentage = this.hp / this.maxHp;

        // Check for health threshold changes
        if (currentHealthPercentage < 0.75 && this.lastHealthPercentage >= 0.75) {
            this.currentWave = this.waves.second;
        } else if (currentHealthPercentage < 0.5 && this.lastHealthPercentage >= 0.5) {
            this.currentWave = this.waves.third;
        } else if (currentHealthPercentage < 0.25 && this.lastHealthPercentage >= 0.25) {
            this.currentWave = this.waves.fourth;
        }
        this.lastHealthPercentage = currentHealthPercentage;

        // Calculate distance and direction to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

        // Determine movement State 
        const shouldRetreat = distanceToPlayer < this.preferredDistance || (distanceToPlayer < 250 && distanceToPlayer < this.lastPlayerDistance);

        if (shouldRetreat && this.moveState === 'drifting') {
            this.moveState = 'retreating';
            this.stateTimer = 0;
        } else if (!shouldRetreat && this.moveState === 'retreating' && this.stateTimer > 1000) {
            this.moveState = 'drifting';
            this.stateTimer = 0;
        }

        this.stateTimer += deltaTime;
        this.lastPlayerDistance = distanceToPlayer;

        if (this.moveState === 'retreating') {
            // ONLY retreating movement - no drifting
            let escapeX = dx > 0 ? -1 : 1;
            let escapeY = dy > 0 ? -1 : 1;

            if (this.x <= 50) escapeX = Math.max(0.5, escapeX);
            if (this.x >= gameWidth - this.width - 50) escapeX = Math.min(-0.5, escapeX);
            if (this.y <= 20) escapeY = Math.max(0.5, escapeY);

            this.x += escapeX * this.retreatSpeed * deltaTime;
            this.y += escapeY * this.retreatSpeed * deltaTime;

        } else {

            // ONLY drifting movement - no retreat
            this.x += this.movementDirection * this.moveSpeed * deltaTime;

            // Reverse direction at screen edges
            if (this.x <= 50 || this.x >= gameWidth - this.width - 50) {
                this.movementDirection *= -1;
            }

            // Gentle return to safe zone
            if (this.y > this.safeZoneY + 20) {
                this.y -= this.moveSpeed * deltaTime * 0.5;
            }
        }

        // Keep within screen bounds (with some margin)
        this.x = Math.max(10, Math.min(gameWidth - this.width - 10, this.x));
        this.y = Math.max(10, Math.min(gameHeight - this.height - 50, this.y));

        // Wave spawning logic
        this.waveSpawnTimer += deltaTime;
        if (this.waveSpawnTimer >= this.spawnCooldown && enemyArrays) {
            this.spawnEnemies(enemyArrays);
            this.waveSpawnTimer = 0;
        }

        // Individual enemy spawning logic (you still need this!)
        // Spawn one enemy and remove it from remaining
        if (this.isSpawningWave && this.remainingEnemies.length > 0) {
            this.enemySpawnTimer += deltaTime;
            if (this.enemySpawnTimer >= this.spawnDelay) {
                // get next enemy spawn
                const EnemyClass = this.remainingEnemies.shift(); //remove first enemy from array

                // Create enemy instance
                const spawnX = Math.random() * (gameWidth - 40);
                const spawnY = -40; // Spawn above the screen
                const enemy = new EnemyClass(spawnX, spawnY, damageMultiplier);
                enemy.minion = true;

                // Add to appropriate enemy array
                if (EnemyClass === Enemy) {
                    enemyArrays.enemies.push(enemy);
                } else if (EnemyClass === Shooter) {
                    enemyArrays.shooters.push(enemy);
                } else if (EnemyClass === Tank) {
                    enemyArrays.tanks.push(enemy);
                } else if (EnemyClass === Sprinter) {
                    enemyArrays.sprinters.push(enemy);
                }

                //reset spawn timer
                this.enemySpawnTimer = 0;

                // Check if wave is complete
                if (this.remainingEnemies.length === 0) {
                    this.isSpawningWave = false;
                }
            }
        }
    }


    // Methods OUTSIDE of update
    spawnEnemies(enemyArrays) {
        if (!this.isSpawningWave) {
            this.isSpawningWave = true;
            this.remainingEnemies = [...this.currentWave];
            this.shuffleArray(this.remainingEnemies);
            this.enemySpawnTimer = 0;
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        // Command platform base
        ctx.fillStyle = '#2F1B69'; // Dark purple base
        ctx.fillRect(this.x - 5, this.y + this.height - 8, this.width + 10, 12);

        // Main body - ornate command module
        ctx.fillStyle = '#4B0082'; // Deep purple
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Inner command chamber
        ctx.fillStyle = '#6A0DAD'; // Lighter purple
        ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);

        // Command spires/antennae (for summoning)
        ctx.fillStyle = '#8B008B'; // Magenta spires
        ctx.fillRect(this.x + 5, this.y - 6, 3, 8);
        ctx.fillRect(this.x + this.width - 8, this.y - 6, 3, 8);
        ctx.fillRect(this.x + this.width / 2 - 1, this.y - 8, 3, 10);

        // Central command core (changes color with health)
        const healthPercent = this.hp / this.maxHp;
        let coreColor = '#00FFFF'; // Cyan when healthy
        if (healthPercent < 0.25) {
            coreColor = '#FF0000'; // Red when critical
        } else if (healthPercent < 0.5) {
            coreColor = '#FF8C00'; // Orange when damaged
        } else if (healthPercent < 0.75) {
            coreColor = '#FFFF00'; // Yellow when wounded
        }

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing glow effect on core
        const pulseIntensity = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(${healthPercent < 0.5 ? '255, 0, 0' : '0, 255, 255'}, ${pulseIntensity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Health bar
        ctx.fillStyle = 'darkred';
        ctx.fillRect(this.x, this.y - 12, this.width, 8);
        ctx.fillStyle = 'lime';
        ctx.fillRect(this.x, this.y - 12, (this.hp / this.maxHp) * this.width, 8);

        // Boss label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('OVERLORD', this.x + this.width / 2, this.y - 16);
        ctx.textAlign = 'left';
    }


}