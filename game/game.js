class GameRenderer {
    constructor(game) {
        this.game = game;
    }

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

        // Render UI
        this.renderUI();

        // Render menus based on game state
        if (!this.game.started) {
            this.renderStartMenu();
        } else if (this.game.gamePaused && this.game.gamePausedReason === 'pause') {
            this.renderPauseMenu();
        } else if (this.game.showLevelUp) {
            this.renderLevelUpScreen();
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

    renderStartMenu() {
        const { ctx, width, height } = this.game;
        
        // Dim background
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, width, height);

        const panelW = 600;
        const panelH = 360;
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        // Rounded panel background
        const r = 12;
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

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NEO PIX', panelX + panelW / 2, panelY + 70);

        // Subtitle
        ctx.font = '16px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Survive waves, level up, and customize your ship', panelX + panelW / 2, panelY + 100);

        // Player preview
        this.renderPlayerPreview(panelX, panelY, panelW, panelH);

        // Controls info
        this.renderControlsInfo(panelX, panelY, panelW);

        // Start button
        this.renderStartButton(panelX, panelY, panelW, panelH);

        // Footer
        ctx.font = '12px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'right';
        ctx.fillText('Mouse to aim • Customize before starting', panelX + panelW - 12, panelY + panelH - 12);

        ctx.textAlign = 'left';
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

    renderPauseMenu() {
        const { ctx, width, height } = this.game;
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', width / 2, height / 2 - 80);

        // Resume button
        const btnW = 240;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;
        const resumeY = height / 2 - 20;
        
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

        this.game.uiRects.pause.resumeButton = { x: btnX, y: resumeY, w: btnW, h: btnH };
        this.game.uiRects.pause.restartButton = { x: btnX, y: restartY, w: btnW, h: btnH };

        ctx.textAlign = 'left';
    }

    renderLevelUpScreen() {
        const { ctx, width, height } = this.game;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'gold';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL UP!', width / 2, 140);

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Choose an upgrade:', width / 2, 180);

        this.game.uiRects.upgradeOptions = [];

                for (let i = 0; i < this.game.upgradeOptions.length; i++) {
            const upgrade = this.game.upgradeOptions[i];
            const y = 220 + i * 80;
            const x = width / 2 - 220;
            const w = 440;
            const h = 64;

            // Background for option
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.fillRect(x, y - 8, w, h);

            // Store rect for click handling
            this.game.uiRects.upgradeOptions.push({ x: x, y: y - 8, w: w, h: h });

            // Upgrade text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`${i + 1}. ${upgrade.name}`, x + 18, y + 18);
            ctx.font = '14px Arial';
            ctx.fillStyle = 'lightgray';
            ctx.fillText(upgrade.description, x + 18, y + 40);

            // Number badge
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(x + w - 74, y + 12, 54, 28);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText((i + 1).toString(), x + w - 74 + 27, y + 32);
        }

        ctx.fillStyle = 'yellow';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click an option or press 1, 2, or 3', width / 2, 520);
        ctx.textAlign = 'left';
    }

    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            this.game.particles.push(new Particle(x, y));
        }
    }
}

