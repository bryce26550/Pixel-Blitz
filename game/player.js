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
        this.ricochetBounces = 0;
        this.multiShot = 1;
        this.shieldDuration = 1000;
        this.lifeSteal = false;
        
        // Customization
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
        this.shootTo(bullets, tx, ty);
    }

    shootTo(bullets, tx, ty) {
        if (this.shootCooldown > 0) return;
        this.shootCooldown = this.shootCooldownMax;

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
        this.takeDamageAmount(1);
    }

    takeDamageAmount(amount) {
        if (!this.invulnerable) {
            this.health = Math.max(0, this.health - amount);
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

        // Draw ship shape
        ctx.fillStyle = '#ffffff';
        if (this.shapeIndex === 0) {
            // Triangle
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + 4);
            ctx.lineTo(this.x + 6, this.y + this.height - 6);
            ctx.lineTo(this.x + this.width - 6, this.y + this.height - 6);
            ctx.closePath();
            ctx.fill();
        } else if (this.shapeIndex === 1) {
            // Circle
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, Math.min(this.width, this.height) / 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Square
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
