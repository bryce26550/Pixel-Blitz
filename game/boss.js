//Constants
const gameWidth = 800;
const gameHeight = 600;

// Boss Classes
class Blaster {
    constructor(x, y, multiplier = 1) {
        this.width = 60;
        this.height = 40;
        this.hp = Math.ceil(85 * multiplier);
        this.maxHp = Math.ceil(this.hp * multiplier);
        this.game = game

        // Movement
        this.x = x;
        this.y = y;
        this.speed = 0.10 * multiplier;
        this.movementDirection = 1;
        this.targetX = Math.random() * (gameWidth - this.width);
        this.targetY = Math.random() * (gameHeight - this.height);

        this.contactDamage = Math.ceil(4 * multiplier);
        this.shootCooldown = Math.max(400, 800 / multiplier);
        this.lastShootTime = 0;
        this.specialAttackCooldown = Math.max(3000, 5000 / multiplier);
        this.lastSpecialAttack = 0;
        this.phase = 1;
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        if (this.hp <= this.maxHp * 0.3) {
            this.phase = 3;
        } else if (this.hp <= this.maxHp * 0.6) {
            this.phase = 2;
        }

        this.differenceX = this.targetX - this.x;
        this.differenceY = this.targetY - this.y;
        this.distance = Math.sqrt(this.differenceX * this.differenceX + this.differenceY * this.differenceY);

        if (this.distance > 0) {
            this.directionX = this.differenceX / this.distance;
            this.directionY = this.differenceY / this.distance;
            this.x += this.directionX * this.speed * deltaTime;
            this.y += this.directionY * this.speed * deltaTime;
        }

        if (this.distance < 5) {
            this.targetX = Math.random() * (gameWidth - this.width);
            this.targetY = Math.random() * (gameHeight - this.height);
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
            this.game.playSound('enemyShot')

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
            this.game.playSound('enemyShot')

        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        const healthPercent = this.hp / (85 * 1); // Fix health calculation
        const recentlyFired = this.lastShootTime < 300;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // LAYER 1: Main hull (draw this FIRST, at the bottom)
        ctx.fillStyle = '#8B0000'; // Dark red base
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Thin structural beams (top/bottom edges)
        ctx.fillStyle = '#777777';
        ctx.fillRect(this.x + 2, this.y, this.width - 4, 2);
        ctx.fillRect(this.x + 2, this.y + this.height - 2, this.width - 4, 2);
        // Side beams
        ctx.fillRect(this.x, this.y + 2, 2, this.height - 4);
        ctx.fillRect(this.x + this.width - 2, this.y + 2, 2, this.height - 4);

        // LAYER 2: Inner sections (on top of hull)
        let armorColor = '#B22222';
        if (this.phase === 3) {
            armorColor = '#FF4500';
        } else if (this.phase === 2) {
            armorColor = '#DC143C';
        }

        ctx.fillStyle = armorColor;
        ctx.fillRect(this.x + 8, this.y + 8, this.width - 16, this.height - 16);

        // Grey armor plating panels (contrasting panels between red sections)
        ctx.fillStyle = '#666666';
        // corner plates
        ctx.fillRect(this.x + 6, this.y + 6, 10, 8);
        ctx.fillRect(this.x + this.width - 16, this.y + 6, 10, 8);
        ctx.fillRect(this.x + 6, this.y + this.height - 14, 10, 8);
        ctx.fillRect(this.x + this.width - 16, this.y + this.height - 14, 10, 8);
        // center side panels
        ctx.fillRect(this.x + 4, this.y + 12, 6, this.height - 24);
        ctx.fillRect(this.x + this.width - 10, this.y + 12, 6, this.height - 24);

        // thin structural framework (small interior ribs)
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(this.x + 14, this.y + 10, 2, this.height - 20);
        ctx.fillRect(this.x + this.width - 16, this.y + 10, 2, this.height - 20);
        ctx.fillRect(this.x + 10, this.y + this.height / 2 - 1, this.width - 20, 2);

        // LAYER 3: All details (draw these LAST, on top)

        // Weapon ports -> new gun design: dark grey square bases (5x3) + rectangular barrels (3x5) that extend beyond main body
        const portColorBase = '#404040'; // grey base for weapon mounts
        const barrelColor = '#2F2F2F'; // darker barrel
        const numPorts = this.phase === 3 ? 5 : this.phase === 2 ? 3 : 1;

        // Calculate spacing so ports are nicely distributed across the lower front area
        const availableWidth = this.width - 24;
        const spacing = numPorts > 1 ? (availableWidth - 5) / (numPorts - 1) : 0;

        for (let i = 0; i < numPorts; i++) {
            const baseX = this.x + 12 + Math.round(i * spacing);
            const baseY = this.y + this.height - 10;
            // square base (5 x 3)
            ctx.fillStyle = portColorBase;
            ctx.fillRect(baseX, baseY, 5, 3);

            // barrel (3 x 5) that extends beyond the main body
            const barrelW = 3;
            const barrelH = 5;
            const barrelX = baseX + 1;
            const barrelY = this.y + this.height - 4; // starts near bottom and extends past the hull
            ctx.fillStyle = barrelColor;
            ctx.fillRect(barrelX, barrelY, barrelW, barrelH);

            // Small muzzle flash when recently fired (stick out past body)
            if (recentlyFired) {
                ctx.fillStyle = '#FFFF66';
                ctx.fillRect(barrelX, barrelY + barrelH - 1, barrelW, 2);
            }
        }

        ctx.fillStyle = '#00FF00'; // Bright green
        ctx.fillRect(centerX - 10, centerY - 2, 20, 4);
        ctx.fillRect(centerX - 2, centerY - 10, 4, 20);

        // Power core (bright and visible) - keep pulsating behavior
        const coreColors = ['#FFFF00', '#FF6600', '#FFFFFF']; // Yellow, Orange, White
        ctx.fillStyle = coreColors[this.phase - 1];

        let coreSize = 8;
        if (this.phase >= 2) {
            coreSize += Math.sin(Date.now() * 0.008) * 3;
        }

        ctx.fillRect(centerX - coreSize / 2, centerY - coreSize / 2, coreSize, coreSize);

        // Core subtle glow ring
        ctx.strokeStyle = this.phase === 3 ? 'rgba(255,51,102,0.35)' : this.phase === 2 ? 'rgba(255,153,204,0.25)' : 'rgba(255,204,221,0.18)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreSize + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Heat vents (bright orange on top) — keep as vents but add grey vent frames
        if (this.phase >= 2) {
            for (let i = 0; i < 4; i++) {
                const ventX = this.x + 15 + (i * 12);
                // grey vent frame
                ctx.fillStyle = '#555555';
                ctx.fillRect(ventX - 1, this.y + 2, 6, 10);
                // inner heat color
                ctx.fillStyle = '#FF4500';
                ctx.fillRect(ventX, this.y + 3, 4, 8);
            }
        }

        // Health bar and label (always on top)
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 12, this.width, 8);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 12, healthPercent * this.width, 8);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BLASTER', centerX, this.y - 16);
        ctx.textAlign = 'left';
    }
}

class Slasher {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 60;
        this.currentAngle = Math.PI / 2;
        this.rotationSpeed = 0.002; // Radians per millisecond
        this.game = game

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
        this.dashCooldown = 3000;
        this.cooldownTimer = 0; // Start ready to dash immediately
        this.dashRange = 300;

        // Target position for dash
        this.targetX = 0;
        this.targetY = 0;
        this.dashVelocityX = 0;
        this.dashVelocityY = 0;
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        // Only track player when not dashing or stunned
        if (this.dashState !== 'dashing' && this.dashState !== 'cooldown') {
            // Get angle to boss for orientation
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const targetAngle = Math.atan2(dy, dx);

            // Handle angle wrapping
            let angleDiff = targetAngle - this.currentAngle;
            if (angleDiff > Math.PI) {
                angleDiff -= Math.PI * 2;
            } else if (angleDiff < -Math.PI) {
                angleDiff += Math.PI * 2;
            }

            // Rotate toward target
            this.currentAngle += angleDiff * this.rotationSpeed * deltaTime;

            // Rotate toward target
            this.currentAngle += angleDiff * this.rotationSpeed * deltaTime;
        }

        if (this.currentAngle > Math.PI * 2) {
            this.currentAngle -= Math.PI * 2;
        }

        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }

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

        if (withinRange && cooldownReady) {
            this.dashState = 'locking';
            this.lockOnTime = 0; // FIX: Reset to 0, not 3000
        }
    }

    handleLockingState(deltaTime, player) {
        this.lockOnTime += deltaTime;

        if (this.lockOnTime >= this.lockOnDuration) {
            this.dashState = 'dashing';
            this.calculateDashTrajectory(player);
            // Play dash sound effect
            this.game.playSound('slasherDash');
        }
    }

    calculateDashTrajectory(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        this.dashVelocityX = (dx / distance) * this.dashSpeed;
        this.dashVelocityY = (dy / distance) * this.dashSpeed;

    }

    handleDashingState(deltaTime) {
        // Move the boss
        this.x += this.dashVelocityX * deltaTime;
        this.y += this.dashVelocityY * deltaTime;
        this.game.playSound('slasherDash')

        // Check if boss will hit wall BEFORE clamping position
        const willHitWall = (this.x <= 0) ||
            (this.x + this.width >= gameWidth) ||
            (this.y <= 0) ||
            (this.y + this.height >= gameHeight);

        if (willHitWall) {
            this.dashState = 'cooldown';
            this.cooldownTimer = this.dashCooldown; // Start 10-second cooldown

            // Clamp position after detecting collision
            this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
            this.y = Math.max(0, Math.min(this.y, gameHeight - this.height));
        }
    }

    handleCooldownState(deltaTime, player) {

        if (this.cooldownTimer <= 0) {
            this.dashState = 'idle';
            // Don't reset cooldownTimer here - it's already 0
        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    renderDashTrail(ctx) {
        // Create motion blur effect
        const trailLength = 5;
        const trailOpacity = 0.3;

        for (let i = 0; i < trailLength; i++) {
            const trailX = this.x - (this.dashVelocityX * i * 20);
            const trailY = this.y - (this.dashVelocityY * i * 20);
            const opacity = trailOpacity * (1 - i / trailLength);

            ctx.fillStyle = `rgba(0, 50, 255, ${opacity})`;
            ctx.fillRect(trailX, trailY, this.width, this.height);
        }
    }

    render(ctx) {
        // Define the coordinates (relative to center after rotation)
        const leftWingX = -this.width / 2;
        const leftWingY = -this.height / 2;
        const rightWingX = this.width / 2;
        const rightWingY = -this.height / 2;
        const leftNotchX = -this.width / 2 + 25;
        const leftNotchY = -this.height / 2 + 20;
        const rightNotchX = this.width / 2 - 25;
        const rightNotchY = -this.height / 2 + 20;
        const bottomTipX = 0;
        const bottomTipY = this.height / 2;
        const halfwayPoint = 0;
        const stripStartX = 0;
        const stripStartY = this.height / 2;
        const leftStripTop = -12;
        const rightStripTop = 12;


        // Get current state for visual effects
        const isDashing = this.dashState === 'dashing';
        const isLocking = this.dashState === 'locking';
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Add dash trail effect
        if (isDashing) {
            this.renderDashTrail(ctx);
        }

        // ROTATION: Save canvas state, move to center, rotate
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.currentAngle - Math.PI / 2); // Rotate to face movement direction

        // Set color
        ctx.fillStyle = '#a7a7a7ff'; // Dark silver
        ctx.beginPath();
        ctx.moveTo(leftWingX, leftWingY);           // Start at left wing
        ctx.lineTo(leftNotchX, leftNotchY);         // Go to left notch point
        ctx.lineTo(rightNotchX, rightNotchY);       // Go to right notch point  
        ctx.lineTo(rightWingX, rightWingY);         // Go to right wing
        ctx.lineTo(bottomTipX, bottomTipY);         // Go to bottom tip
        ctx.closePath();                            // Back to start
        ctx.fill();

        // Wing strips
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(leftStripTop, halfwayPoint);
        ctx.lineTo(stripStartX, stripStartY);
        ctx.moveTo(rightStripTop, halfwayPoint);
        ctx.lineTo(stripStartX, stripStartY);
        ctx.stroke();

        // Core triangle - more dramatic state changes
        let coreColor = 'blue'; // Default blue
        let coreSize = 8;

        if (isDashing) {
            coreColor = '#ffffffff'; // White hot during dash
            coreSize = 12;
        } else if (isLocking) {
            coreColor = '#008ddfff'; // Hot blue during lock-on
            coreSize = 10;
            // Add pulsing
            coreSize += Math.sin(Date.now() * 0.02) * 2;
        }

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.moveTo(0, 0 - coreSize);           // Top point
        ctx.lineTo(0 - coreSize, 0 + coreSize); // Bottom left
        ctx.lineTo(0 + coreSize, 0 + coreSize); // Bottom right
        ctx.closePath();
        ctx.fill();

        // Enhanced core glow
        if (isDashing) {
            // Intense white glow during dash
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, coreSize + 8, 0, Math.PI * 2);
            ctx.stroke();
        } else if (isLocking) {
            // Pulsing blue glow during lock-on
            const glowIntensity = Math.sin(Date.now() * 0.015) * 0.4 + 0.6;
            ctx.strokeStyle = `rgba(0, 75, 255, ${glowIntensity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, coreSize + 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Restore canvas state
        ctx.restore();

        // Health bar
        ctx.fillStyle = 'darkred';
        ctx.fillRect(this.x, this.y - 10, this.width, 6);
        ctx.fillStyle = isDashing ? 'white' : 'lime';
        ctx.fillRect(this.x, this.y - 10, (Math.max(0, this.hp) / this.maxHp) * this.width, 6);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Slasher', centerX, this.y - 16);
        ctx.textAlign = 'left';
    }

}

class Wall {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 60;
        this.hp = 5;
        this.maxHp = 5;
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }


    render(ctx) {
        ctx.fillStyle = '#444444ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // White armor for walls:
        ctx.fillStyle = 'white';

        // Center Piece (100×45)
        ctx.fillRect(this.x + 25, this.y + 7.5, 100, 45);

        // Corner pieces (38×15)
        ctx.fillRect(this.x + 5, this.y + 5, 38, 15);        // Top-left
        ctx.fillRect(this.x + 107, this.y + 5, 38, 15);      // Top-right
        ctx.fillRect(this.x + 5, this.y + 40, 38, 15);       // Bottom-left
        ctx.fillRect(this.x + 107, this.y + 40, 38, 15);     // Bottom-right

        // Edge pieces
        ctx.fillRect(this.x + 48, this.y + 5, 54, 8);        // Top edge
        ctx.fillRect(this.x + 48, this.y + 47, 54, 8);       // Bottom edge
        ctx.fillRect(this.x + 5, this.y + 25, 25, 10);       // Left edge
        ctx.fillRect(this.x + 120, this.y + 25, 25, 10);     // Right edge

        // Add circular core here
        const coreX = this.x + this.width / 2;  // Center X
        const coreY = this.y + this.height / 2; // Center Y
        const coreRadius = 8; // Base size

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Solid Red glow (no pulse)
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreRadius + 6, 0, Math.PI * 2);
        ctx.stroke();

    }
}

class Sentinel {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 80;
        this.game = game

        // Health and damage
        this.hp = Math.ceil(125 * multiplier);
        this.maxHp = this.hp;

        // Wall system
        this.walls = [];
        this.wallSpawnTimer = 0;
        this.wallSpawnCooldown = 5000; // Respawn walls every 5 seconds
        this.spawnWalls();

        // Burst firing system
        this.burstTimer = 0;
        this.burstDuration = 3000; // 3 seconds of firing
        this.burstCooldown = 3500; // 5 seconds between bursts
        this.isBursting = false;
        this.burstShotInterval = 50; // Fire every 150ms during burst
    }

    update(deltaTime, bullets, player, damageMultiplier = 1) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);

        // Handle cooldown when NOT bursting
        if (!this.isBursting) {
            this.burstCooldown -= deltaTime;
            if (this.burstCooldown <= 0) {
                // Start burst
                this.isBursting = true;
                this.burstTimer = 0;
                this.burstDuration = 3000; // Reset duration for next burst
            }
        } else {
            // Handle active burst
            this.burstDuration -= deltaTime; // Decrease every frame
            this.burstTimer += deltaTime;    // Increase every frame

            // Check if time to shoot
            if (this.burstTimer >= this.burstShotInterval) {
                // Shoot and reset burstTimer
                this.Shoot(bullets, player, damageMultiplier);
                this.burstTimer = 0;
            }

            // Check if burst is over
            if (this.burstDuration <= 0) {
                // End burst
                this.isBursting = false;
                this.burstTimer = 0;
                this.burstCooldown = 5000; // 5 seconds between bursts
            }
        }

        // Wall respawning logic
        if (this.walls.length === 0) {
            this.wallSpawnTimer += deltaTime;
            if (this.wallSpawnTimer >= this.wallSpawnCooldown) {
                this.spawnWalls();
                this.wallSpawnTimer = 0;
            }
        } else {
            this.wallSpawnTimer = 0; // Reset timer if walls exist
        }

    }

    Shoot(bullets, player, damageMultiplier = 1) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);

        // Base angle to player
        const baseAngle = Math.atan2(dy, dx);

        // Random spread in degrees (-15 to +15)
        const spreadDegrees = (Math.random() - 0.5) * 30;

        // Convert to radians and add to base angle
        const spreadRadians = spreadDegrees * (Math.PI / 180);
        const finalAngle = baseAngle + spreadRadians;

        const speed = 0.50;
        const bulletVx = Math.cos(finalAngle) * speed;
        const bulletVy = Math.sin(finalAngle) * speed;

        const bullet = new Bullet(this.x + this.width / 2, this.y + this.height / 2, false);
        bullet.vx = bulletVx;
        bullet.vy = bulletVy;
        bullet.damage = Math.ceil((this.contactDamage || 1) * damageMultiplier);
        bullets.push(bullet);
        this.game.playSound('enemyShot')
    }

    spawnWalls() {
        this.walls = []; // Clear existing walls

        // Calculate starting position for first wall
        const totalWallWidth = (5 * 150) + (4 * 10); // 4 walls + 3 gaps = 135
        const startX = (gameWidth / 2) - (totalWallWidth / 2); // Center the wall formation
        const wallY = this.y + this.height + 25; // Position in front of Sentinel


        for (let i = 0; i < 5; i++) {
            const wallX = startX + (i * (150 + 10)); // Each wall + gap
            const wall = new Wall(wallX, wallY);
            this.walls.push(new Wall(wallX, wallY));
        }
    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        const centerX = this.x + this.width / 2;

        // Boss appearance
        ctx.fillStyle = 'gray';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // White armor:
        ctx.fillStyle = 'white';
        // Center Piece
        ctx.fillRect(this.x + 10, this.y + 10, 40, 60);

        // Corner pieces (15×15)
        ctx.fillRect(this.x - 10, this.y - 5, 15, 15);        // Top-left
        ctx.fillRect(this.x + 55, this.y - 5, 15, 15);       // Top-right
        ctx.fillRect(this.x - 10, this.y + 70, 15, 15);       // Bottom-left
        ctx.fillRect(this.x + 55, this.y + 70, 15, 15);      // Bottom-right

        // Edge pieces
        ctx.fillRect(this.x + 10, this.y + -5, 40, 10);       // Top edge (10×10)
        ctx.fillRect(this.x + 10, this.y + 75, 40, 10);      // Bottom edge (10×10)
        ctx.fillRect(this.x - 5, this.y + 15, 10, 50);       // Left edge (10×25)
        ctx.fillRect(this.x + 55, this.y + 15, 10, 50);      // Right edge (10×25)

        //Red Core:
        let coreSize = 8;

        const coreX = this.x + 30;  // Center X
        const coreY = this.y + 40;  // Center Y

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(coreX, coreY - coreSize);           // Top point
        ctx.lineTo(coreX - coreSize, coreY + coreSize); // Bottom left
        ctx.lineTo(coreX + coreSize, coreY + coreSize); // Bottom right
        ctx.closePath();
        ctx.fill();


        // Add pulsing
        coreSize += Math.sin(Date.now() * 0.02) * 2;

        // Pulsing Red glow
        const glowIntensity = Math.sin(Date.now() * 0.015) * 0.4 + 0.6;
        ctx.strokeStyle = `rgba(255, 0, 0, ${glowIntensity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coreX, coreY, coreSize + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Health bar
        ctx.fillStyle = 'darkred';
        ctx.fillRect(this.x, this.y - 20, this.width, 8);
        ctx.fillStyle = 'lime';
        ctx.fillRect(this.x, this.y - 20, (this.hp / this.maxHp) * this.width, 8);

        // Boss label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SENTINEL', centerX, this.y - 24);
        ctx.textAlign = 'left';
    }

    // Render walls
    renderWalls(ctx) {
        this.walls.forEach(wall => {
            wall.render(ctx);
        });
    }
}

class LineShot {
    constructor(startX, startY, targetX, targetY, width, damage) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.width = width;
        this.damage = damage;
        this.game = game

        // Calculate direction and extend 1000 pixels
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        this.endX = startX + (dx / distance) * 1000;
        this.endY = startY + (dy / distance) * 1000;

        // State management
        this.isPreview = true;
        this.isActive = true;
        this.frameCount = 0;
        this.maxFrames = damage === 0 ? Infinity : 4;
    }

    fire() {
        this.isPreview = false
        this.isActive = true
    }

    update(deltaTime) {
        if (!this.isPreview) {
            this.frameCount++;

            if (this.frameCount >= this.maxFrames) {
                this.isActive = false
            }
        }
    }

    render(ctx) {
        if (this.isPreview) {
            ctx.strokeStyle = `rgba(255, 0, 0, 0.25)`;
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round'; // Smooth line ends

            ctx.beginPath();
            ctx.moveTo(this.startX, this.startY);
            ctx.lineTo(this.endX, this.endY);
            ctx.stroke();
        }
        else {
            // Save canvas state for transformations
            ctx.save();

            // Calculate line angle and length
            const dx = this.endX - this.startX;
            const dy = this.endY - this.startY;
            const angle = Math.atan2(dy, dx);
            const length = Math.sqrt(dx * dx + dy * dy);

            // Move to start point and rotate
            ctx.translate(this.startX, this.startY);
            ctx.rotate(angle);

            // Draw gradient layers (from outside to inside)
            const layers = [
                { width: this.width, color: 'rgba(139, 0, 0, 0.8)' },    // Dark red edges
                { width: this.width * 0.7, color: 'rgba(255, 0, 0, 0.9)' }, // Bright red
                { width: this.width * 0.4, color: 'rgba(255, 255, 0, 0.95)' }, // Yellow
                { width: this.width * 0.2, color: 'rgba(255, 255, 255, 1)' }   // White center
            ];

            layers.forEach(layer => {
                ctx.strokeStyle = layer.color;
                ctx.lineWidth = layer.width;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(length, 0);
                ctx.stroke();
            });

            // Restore canvas state
            ctx.restore();
        }
    }
}



class Railgun {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 50;  // Adjust per boss
        this.height = 50; // Adjust per boss
        this.game = game

        // Health and damage
        this.hp = Math.ceil(50 * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(1 * multiplier);
        this.shotDamage = Math.ceil(6 * multiplier)

        // Movement
        this.speed = 0.5 * multiplier;

        // Uniquie properties
        this.railgunState = 'cooldown';
        this.previousState = 'cooldown';
        this.lockOnTime = 0;
        this.lockOnDuration = 2000;
        this.delayTime = 0;
        this.delayDuration = 250;
        this.cooldown = 4000;
        this.cooldownTimer = 0;
        this.eDash = false

        // Player movement
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;

        // Target position for dash
        this.startX = 0;
        this.startY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.dashVelocityX = 0;
        this.dashVelocityY = 0;

        // Barrel tracking properties
        this.barrelAngle = 0;
        this.barrelLength = 45;
        this.barrelWidth = 15;
        this.barrelTipX = 0;
        this.barrelTipY = 0;

    }

    update(deltaTime, lineshots, player, damageMultiplier = 1) {
        // Emergency dash check
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

        // Update barrel tracking (always track player unless dashing)
        if (!this.eDash) {
            const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
            const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
            this.barrelAngle = Math.atan2(dy, dx);
        }

        // Calculate barrel tip position
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        this.barrelTipX = centerX + Math.cos(this.barrelAngle) * this.barrelLength;
        this.barrelTipY = centerY + Math.sin(this.barrelAngle) * this.barrelLength;

        if (distanceToPlayer < 100 && !this.eDash) {
            this.previousState = this.railgunState;
            this.startX = this.x
            this.startY = this.y
            this.eDash = true;

            // Calculate direction TO player (normalized)
            const direction = Math.sqrt(dx * dx + dy * dy) || 1;
            const directionX = dx / direction;
            const directionY = dy / direction;

            // Calculate end position (300 pixels past player)
            this.targetX = this.x + (directionX * 300);
            this.targetY = this.y + (directionY * 300);

            // Set dash velocity
            this.dashVelocityX = directionX * 2;
            this.dashVelocityY = directionY * 2;
        }

        if (this.eDash === true) {
            this.handleDashingState(deltaTime, lineshots, damageMultiplier); // ← Use the state handler instead of inline logic
        } else {
            switch (this.railgunState) {
                case 'cooldown': this.handleCooldownState(deltaTime, player); break;
                case 'locking': this.handleLockingState(deltaTime, lineshots, player); break;
                case 'delay': this.handleDelayState(deltaTime); break;
                case 'shooting': this.handleShootingState(deltaTime, lineshots, player, damageMultiplier); break;
            };
        }
    }

    handleCooldownState(deltaTime, player) {
        this.cooldownTimer += deltaTime;

        //miror player movement
        const playerMovedX = player.x - this.lastPlayerX
        const playerMovedY = player.y - this.lastPlayerY

        if (playerMovedX !== 0 || playerMovedY !== 0) {

            this.x -= playerMovedX
            this.y -= playerMovedY

        }

        // CRITICAL: Keep boss within screen bounds
        this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, gameHeight - this.height));

        // Update for next frame:
        this.lastPlayerX = player.x;
        this.lastPlayerY = player.y;

        if (this.cooldownTimer >= this.cooldown) {

            this.cooldownTimer = 0
            this.railgunState = 'locking';
        }
    }


    handleLockingState(deltaTime, lineshots, player) {
        this.lockOnTime += deltaTime;
        this.lastPlayerX = player.x;
        this.lastPlayerY = player.y;

        // Create preview shot once
        if (!this.previewShot) {
            console.log('Creating preview shot...');
            this.previewShot = new LineShot(
                this.barrelTipX, // ← Fire from barrel tip
                this.barrelTipY, // ← Fire from barrel tip
                player.x + player.width / 2,
                player.y + player.height / 2,
                75,
                0
            );
            this.previewShot.isActive = true;
            console.log('Preview shot created, isActive:', this.previewShot.isActive);
            console.log('Preview shot isPreview:', this.previewShot.isPreview);
            lineshots.push(this.previewShot);
            console.log('Pushed to lineshots array. Array length:', lineshots.length);
        } else {
            // Update preview shot to continuously track player
            this.previewShot.startX = this.barrelTipX; // ← Update start position
            this.previewShot.startY = this.barrelTipY; // ← Update start position
            this.previewShot.targetX = player.x + player.width / 2;
            this.previewShot.targetY = player.y + player.height / 2;

            // Recalculate end position for the new target
            const dx = this.previewShot.targetX - this.previewShot.startX;
            const dy = this.previewShot.targetY - this.previewShot.startY;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            this.previewShot.endX = this.previewShot.startX + (dx / distance) * 1000;
            this.previewShot.endY = this.previewShot.startY + (dy / distance) * 1000;
        }

        if (this.lockOnTime >= this.lockOnDuration) {
            // Remove preview
            console.log('Lock-on complete, removing preview');
            if (this.previewShot) {
                this.previewShot.isActive = false;
                this.previewShot = null;
            }

            this.lockOnTime = 0;
            this.delayTime = 0;
            this.railgunState = 'delay';
            this.calculateShotTrajectory(player);
        }
    }

    handleDelayState(deltaTime) {
        this.delayTime += deltaTime;

        if (this.delayTime >= this.delayDuration) {
            this.railgunState = 'shooting';
        }
    }


    handleDashingState(deltaTime, lineshots, damageMultiplier) {
        // Move the boss
        this.x += this.dashVelocityX * deltaTime;
        this.y += this.dashVelocityY * deltaTime;

        // Check if boss will hit wall BEFORE clamping position
        const willHitWall = (this.x <= 0) ||
            (this.x + this.width >= gameWidth) ||
            (this.y <= 0) ||
            (this.y + this.height >= gameHeight);

        if (willHitWall) {
            this.eDash = false; // ← End the dash immediately
            this.eShot(lineshots, damageMultiplier);  // ← This is correct
            this.railgunState = this.previousState;

            // Clamp position after detecting collision
            this.x = Math.max(0, Math.min(this.x, gameWidth - this.width));
            this.y = Math.max(0, Math.min(this.y, gameHeight - this.height));
        }
    }


    calculateShotTrajectory(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        this.shotTargetX = (player.x + player.width / 2)
        this.shotTargetY = (player.y + player.height / 2)
    }

    handleShootingState(deltaTime, lineshots, player, damageMultiplier) {
        this.lastPlayerX = player.x;
        this.lastPlayerY = player.y;


        this.shoot(lineshots, damageMultiplier)
        this.railgunState = 'cooldown'
    }

    shoot(lineshots, damageMultiplier) {
        const lineShot = new LineShot(
            this.barrelTipX, // ← Fire from barrel tip
            this.barrelTipY, // ← Fire from barrel tip
            this.shotTargetX,
            this.shotTargetY,
            75,
            this.shotDamage * damageMultiplier,
        );

        lineShot.fire();

        lineshots.push(lineShot)
        this.game.playSound('railgunShot')
    }

    eShot(lineshots, damageMultiplier) {
        const lineShot = new LineShot(
            this.barrelTipX, // ← Fire from barrel tip
            this.barrelTipY, // ← Fire from barrel tip
            this.startX,
            this.startY,
            50,
            this.shotDamage * damageMultiplier,
        );

        lineShot.fire();
        lineshots.push(lineShot)
        this.game.playSound('railgunShot')

    }

    takeDamage(damage = 1) {
        this.hp -= damage;
    }

    render(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const healthPercent = this.hp / this.maxHp;

        // Get current state for visual effects
        const isLocking = this.railgunState === 'locking';
        const isCharging = this.railgunState === 'delay';
        const isCooldown = this.railgunState === 'cooldown';
        const isDashing = this.eDash;

        // LAYER 1: Dash Trail Effect (render first, behind everything)
        if (isDashing) {
            this.renderDashTrail(ctx);
        }

        // LAYER 2: Main Hull - Sleek angular design
        ctx.fillStyle = '#2C3E50'; // Dark blue-gray base
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Angular side panels
        ctx.fillStyle = '#34495E';
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);

        // LAYER 3: Targeting Systems
        // Side sensor arrays
        ctx.fillStyle = '#E74C3C'; // Red sensors
        ctx.fillRect(this.x + 2, centerY - 3, 6, 6);
        ctx.fillRect(this.x + this.width - 8, centerY - 3, 6, 6);

        // Central targeting module
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(centerX - 8, centerY - 8, 16, 16);

        // LAYER 4: Targeting reticle (changes based on state)
        let reticleColor = '#2ECC71'; // Green when idle
        let reticleSize = 6;

        if (isDashing) {
            reticleColor = '#E67E22'; // Orange when dashing
            reticleSize = 10;
        } else if (isLocking) {
            reticleColor = '#F39C12'; // Yellow when locking
            reticleSize = 8 + Math.sin(Date.now() * 0.03) * 2;
        } else if (isCharging) {
            reticleColor = '#E74C3C'; // Red when charging
            reticleSize = 10;
        }

        ctx.fillStyle = reticleColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, reticleSize, 0, Math.PI * 2);
        ctx.fill();

        // Reticle crosshairs
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - reticleSize - 4, centerY);
        ctx.lineTo(centerX - reticleSize - 2, centerY);
        ctx.moveTo(centerX + reticleSize + 2, centerY);
        ctx.lineTo(centerX + reticleSize + 4, centerY);
        ctx.moveTo(centerX, centerY - reticleSize - 4);
        ctx.lineTo(centerX, centerY - reticleSize - 2);
        ctx.moveTo(centerX, centerY + reticleSize + 2);
        ctx.lineTo(centerX, centerY + reticleSize + 4);
        ctx.stroke();

        // LAYER 5: Energy Systems
        // Power conduits
        ctx.fillStyle = '#9B59B6';
        ctx.fillRect(this.x + 8, this.y + 8, 4, this.height - 16);
        ctx.fillRect(this.x + this.width - 12, this.y + 8, 4, this.height - 16);

        // Energy core (pulses during different states)
        let coreColor = '#3498DB';
        let coreIntensity = 0.7;

        if (isCharging) {
            coreIntensity = Math.sin(Date.now() * 0.05) * 0.3 + 0.7;
            coreColor = '#E74C3C';
        } else if (isLocking) {
            coreIntensity = Math.sin(Date.now() * 0.03) * 0.2 + 0.8;
            coreColor = '#F39C12';
        }

        ctx.fillStyle = coreColor;
        ctx.globalAlpha = coreIntensity;
        ctx.fillRect(centerX - 6, this.y + this.height - 15, 12, 10);
        ctx.globalAlpha = 1.0; // Reset alpha

        // LAYER 6: Health Bar and UI
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 12, this.width, 8);
        ctx.fillStyle = isDashing ? '#E67E22' : 'lime';
        ctx.fillRect(this.x, this.y - 12, healthPercent * this.width, 8);

        // Boss label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        let label = 'RAILGUN';

        ctx.fillText(label, centerX, this.y - 16);
        ctx.textAlign = 'left';

        // LAYER 7: PROMINENT RAILGUN BARREL SYSTEM
        ctx.save(); // Save canvas state for rotation

        // Move to center and rotate to barrel angle
        ctx.translate(centerX, centerY);
        ctx.rotate(this.barrelAngle);

        // Main barrel (much larger and more prominent)
        ctx.fillStyle = '#95A5A6'; // Light gray barrel
        ctx.fillRect(0, -this.barrelWidth / 2, this.barrelLength, this.barrelWidth);

        // Barrel segments for detail
        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(0, -this.barrelWidth / 2 + 1, this.barrelLength, 2);
        ctx.fillRect(0, this.barrelWidth / 2 - 3, this.barrelLength, 2);

        // Barrel tip/muzzle (more prominent)
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(this.barrelLength - 8, -this.barrelWidth / 2 + 2, 8, this.barrelWidth - 4);

        // Charging coils along the barrel (larger and more visible)
        for (let i = 0; i < 5; i++) {
            const coilX = 8 + (i * 7);
            let coilColor = '#7F8C8D'; // Default gray

            if (isLocking || isCharging) {
                // Light up coils during charging
                const intensity = Math.sin(Date.now() * 0.02 + i * 0.5) * 0.5 + 0.5;
                coilColor = `rgba(0, 150, 255, ${intensity})`;
            }

            ctx.fillStyle = coilColor;
            ctx.fillRect(coilX, -this.barrelWidth / 2 - 2, 3, this.barrelWidth + 4);
        }

        // Muzzle flash effect when firing
        if (isCharging) {
            const flashSize = Math.sin(Date.now() * 0.1) * 4 + 6;
            ctx.fillStyle = `rgba(255, 100, 0, ${Math.sin(Date.now() * 0.1) * 0.3 + 0.5})`;
            ctx.fillRect(this.barrelLength - 2, -flashSize / 2, 8, flashSize);
        }

        ctx.restore(); // Restore canvas state

        // Debug: Show barrel tip (remove this later)
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.barrelTipX, this.barrelTipY, 3, 0, Math.PI * 2);
        ctx.fill();
    }



    // Add this method for the dash trail effect
    renderDashTrail(ctx) {
        const trailLength = 6;
        const trailOpacity = 0.4;

        for (let i = 0; i < trailLength; i++) {
            const trailX = this.x - (this.dashVelocityX * i * 15);
            const trailY = this.y - (this.dashVelocityY * i * 15);
            const opacity = trailOpacity * (1 - i / trailLength);

            ctx.fillStyle = `'#e40f0fff', ${opacity}`; // Orange trail
            ctx.fillRect(trailX, trailY, this.width, this.height);
        }
    }


}

class Overlord {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.game = game

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
        const centerX = this.x + this.width / 2;
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
        ctx.fillText('OVERLORD', centerX, this.y - 16);
        ctx.textAlign = 'left';
    }


}