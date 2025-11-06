class GameRenderer {
    constructor(game) {
        this.game = game;
    }

// In GameRenderer class, update the render method:
render() {
    const { ctx, width, height } = this.game;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Draw game objects
    this.game.player.render(ctx);
    this.game.bullets.forEach(bullet => bullet.render(ctx));
    this.game.enemies.forEach(enemy => enemy.render(ctx));
    this.game.shooters.forEach(shooter => shooter.render(ctx));
    this.game.tanks.forEach(tank => tank.render(ctx));
    this.game.sprinters.forEach(sprinter => sprinter.render(ctx));
    this.game.bosses.forEach(boss => boss.render(ctx));
    this.game.particles.forEach(particle => particle.render(ctx));

    // Only render canvas UI if game is running
    if (this.game.started && this.game.gameRunning) {
        this.game.updateGameUI();
    }
}

    renderUI() {
        const { ctx, width } = this.game;
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Wave: ${this.game.waveNumber}`, 10, 30);
        ctx.fillText(`Level: ${this.game.level}`, 10, 50);
        ctx.fillText(`EXP: ${this.game.exp}/${this.game.expToNextLevel}`, 10, 70);
        ctx.fillText(`Shield: ${this.game.player.health}/${this.game.player.maxHealth}`, 10, 90);

        // Wave progress bar
        const barWidth = 200;
        const barHeight = 10;
        const barX = width - barWidth - 10;
        const barY = 20;

        ctx.fillStyle = 'gray';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'yellow';
        ctx.fillRect(barX, barY, (this.game.waveProgress / this.game.waveRequirement) * barWidth, barHeight);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('Wave Progress', barX, barY - 5);

        // EXP bar
        const expBarY = 40;
        ctx.fillStyle = 'gray';
        ctx.fillRect(barX, expBarY, barWidth, barHeight);
        ctx.fillStyle = 'blue';
        ctx.fillRect(barX, expBarY, (this.game.exp / this.game.expToNextLevel) * barWidth, barHeight);
        ctx.fillStyle = 'white';
        ctx.fillText('Experience', barX, expBarY - 5);
    }

    renderPlayerPreview(panelX, panelY, panelW, panelH) {
        const { ctx } = this.game;
        
        const previewX = panelX + 28;
        const previewY = panelY + 130;
        const previewW = 200;
        const previewH = 180;

        this.game.uiRects.previewBox = { x: previewX, y: previewY, w: previewW, h: previewH };

        // Preview background
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(previewX, previewY, previewW, previewH);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.strokeRect(previewX, previewY, previewW, previewH);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Player Preview (click to cycle color)', previewX + 8, previewY + 20);

        // Draw player centered
        const px = previewX + previewW / 2 - this.game.player.width / 2;
        const py = previewY + previewH / 2 - this.game.player.height / 2;
        
        ctx.fillStyle = this.game.player.color || '#00ff00';
        ctx.fillRect(px, py, this.game.player.width, this.game.player.height);

        // Inner shape
        ctx.fillStyle = '#ffffff';
        if (this.game.player.shapeIndex === 0) {
            ctx.beginPath();
            ctx.moveTo(px + this.game.player.width / 2, py + 6);
            ctx.lineTo(px + 6, py + this.game.player.height - 6);
            ctx.lineTo(px + this.game.player.width - 6, py + this.game.player.height - 6);
            ctx.closePath();
            ctx.fill();
        } else if (this.game.player.shapeIndex === 1) {
            ctx.beginPath();
            ctx.arc(px + this.game.player.width / 2, py + this.game.player.height / 2, 
                   Math.min(this.game.player.width, this.game.player.height) / 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(px + 6, py + 6, this.game.player.width - 12, this.game.player.height - 12);
        }

        // Customization buttons
        this.renderCustomizationButtons(previewX, previewY, previewW, previewH);
    }

    renderCustomizationButtons(previewX, previewY, previewW, previewH) {
        const { ctx } = this.game;
        
        const colorBoxX = previewX + 8;
        const colorBoxY = previewY + previewH - 40;
        const colorBoxW = 80;
        const colorBoxH = 28;
        
        ctx.fillStyle = this.game.player.color;
        ctx.fillRect(colorBoxX, colorBoxY, colorBoxW, colorBoxH);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(colorBoxX, colorBoxY, colorBoxW, colorBoxH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText('Cycle Color', colorBoxX + 8, colorBoxY + 18);

        this.game.uiRects.colorBox = { x: colorBoxX, y: colorBoxY, w: colorBoxW, h: colorBoxH };

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

        this.game.uiRects.shapeBox = { x: shapeBoxX, y: shapeBoxY, w: shapeBoxW, h: shapeBoxH };
    }

    renderControlsInfo(panelX, panelY, panelW) {
        const { ctx } = this.game;
        
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
    }

    renderStartButton(panelX, panelY, panelW, panelH) {
        const { ctx } = this.game;
        
        const btnW = 240;
        const btnH = 54;
        const btnX = panelX + panelW / 2 - btnW / 2;
        const btnY = panelY + panelH - 88;

        ctx.fillStyle = '#71ff4dff';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#094d00ff';
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.fillStyle = '#222222';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('START GAME', btnX + btnW / 2, btnY + btnH / 2 + 8);

        this.game.uiRects.startButton = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            this.game.particles.push(new Particle(x, y));
        }
    }
}

