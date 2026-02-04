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
        this.hp = Math.ceil(1 * multiplier);
        this.shootCooldown = Math.max(800, 1500 / multiplier);
        this.lastShootTime = 0;
        this.contactDamage = Math.ceil(2 * multiplier);
        this.game = game
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
        bullet.damage = Math.ceil((this.contactDamage || 1) * damageMultiplier);
        bullets.push(bullet);
        this.game.playSound('enemyShot')
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
        this.hp = Math.ceil(5 * multiplier);
        this.maxHp = Math.ceil(this.hp * multiplier);
        this.contactDamage = Math.ceil(2 * multiplier);
        this.shootCooldown = Math.max(1000, 2000 / multiplier);
        this.lastShootTime = 0;
        this.movementPattern = Math.random() > 0.5 ? 1 : -1;
        this.game = game
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
            this.game.playSound('enemyShot')
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
