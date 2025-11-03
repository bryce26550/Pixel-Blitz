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
        ctx.fillText('BOSS', this.x + this.width / 2, this.y - 16);
        ctx.textAlign = 'left';
    }
}
