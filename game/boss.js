class Blaster {
    constructor(x, y, multiplier = 1) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 60;
        this.speed = 0.02 * multiplier;
        this.hp = Math.ceil(75 * multiplier);
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
        this.hp = Math.ceil(50 * multiplier);
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

        const gameWidth = 800;
        const gameHeight = 600;

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

    takeDamage(damage = 1) {
        this.hp -= damage;
    };

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
        this.hp = Math.ceil(baseHP * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(baseDamage * multiplier);


        // Movement
        this.speed = baseSpeed * multiplier;

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
        // Health bar will be handled separately
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
        this.hp = Math.ceil(baseHP * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(baseDamage * multiplier);

        // Movement
        this.speed = baseSpeed * multiplier;

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
        // Health bar will be handled separately
    }
}

class Overlord {
    constructor(x, y, multiplier = 1) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 80;  // Adjust per boss
        this.height = 60; // Adjust per boss

        // Health and damage
        this.hp = Math.ceil(baseHP * multiplier);
        this.maxHp = this.hp;
        this.contactDamage = Math.ceil(baseDamage * multiplier);

        // Movement
        this.speed = baseSpeed * multiplier;

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
        // Health bar will be handled separately
    }
}
