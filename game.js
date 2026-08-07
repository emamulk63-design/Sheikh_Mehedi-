// =====================================================
// BOLTU MORENAI - FAST STENGUN TARGET RUSH
// =====================================================

const WIDTH = 540;
const HEIGHT = 960;

let bgm;
let musicOn = true;
let highScore = Number(localStorage.getItem("slbHighScore")) || 0;

let player;
let bullets;
let targets;
let spawnTimer;
let score = 0;

let scoreText;
let highScoreText;

let targetSpeed = 220;
let spawnInterval = 650;
let gameOver = false;
let isPaused = false;

let fireTimer;
let gameStarted = false;
let cursors;
let keys;

let menuElements = [];
let hudElements = [];

// =====================================================
// POWER-UP STATE VARIABLES
// =====================================================
let isPowerUpActive = false;
let powerUpTimer = null;
let lastPowerUpScore = 0;

// =====================================================
// PROGRAMMATIC SYNTH SOUND EFFECTS
// =====================================================
function playSynthSFX(scene, type) {
    if (!musicOn) return;
    try {
        let ctx = scene.sound.context;
        if (!ctx) return;
        let now = ctx.currentTime;
        let osc = ctx.createOscillator();
        let gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'fire') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.6);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        }
    } catch (e) {
        // Audio catch
    }
}

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#000000",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
        parent: 'game-container'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update 
    }
};

new Phaser.Game(config);

function preload(){
    this.load.image("bg", "assets/images/bg.png");
    this.load.image("stengun", "assets/images/stengun.png");
    this.load.image("bullet", "assets/images/bullet.png");
    this.load.audio("bgm", "assets/audio/bgm.mp3");
    
    this.load.image("target1", "assets/images/target1.png");
    this.load.image("target2", "assets/images/target2.png");
    this.load.image("target3", "assets/images/target3.png");
    this.load.image("target4", "assets/images/target4.png");
    this.load.image("target5", "assets/images/target5.png");
}

function create() {
    if (this.textures.exists("bg")) {
        let bg = this.add.image(WIDTH / 2, HEIGHT / 2, "bg");
        bg.setDisplaySize(WIDTH, HEIGHT);
        bg.setDepth(0);
    }

    createDynamicTextures(this);

    if (this.cache.audio.exists("bgm") && !bgm) {
        bgm = this.sound.add("bgm", { loop: true, volume: 0.45 });
    }

    this.game.events.on(Phaser.Core.Events.BLUR, () => {
        if (bgm && bgm.isPlaying) bgm.pause();
    });

    this.game.events.on(Phaser.Core.Events.FOCUS, () => {
        if (bgm && musicOn && !gameOver && gameStarted) bgm.resume();
    });

    menuElements = [];
    hudElements = [];
    isPaused = false;

    let titleText = this.add.text(WIDTH / 2, 180, "BOLTU MORENAI", {
        fontSize: "38px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center"
    }).setOrigin(0.5).setDepth(500);
    menuElements.push(titleText);

    let playButton = this.add.text(WIDTH / 2 - 90, 290, "▶ PLAY", {
        fontSize: "30px",
        backgroundColor: "#1f1f1f",
        color: "#00ff55",
        padding: { left: 16, right: 16, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(500).setInteractive({ useHandCursor: true });
    menuElements.push(playButton);

    let musicButton = this.add.text(WIDTH / 2 + 90, 290, musicOn ? "🔊 MUSIC" : "🔇 MUSIC", {
        fontSize: "26px",
        backgroundColor: "#1f1f1f",
        color: "#ffffff",
        padding: { left: 14, right: 14, top: 12, bottom: 12 }
    }).setOrigin(0.5).setDepth(500).setInteractive({ useHandCursor: true });
    menuElements.push(musicButton);

    musicButton.on("pointerdown", () => {
        musicOn = !musicOn;
        if (bgm) {
            if (musicOn) bgm.resume();
            else bgm.pause();
        }
        musicButton.setText(musicOn ? "🔊 MUSIC" : "🔇 MUSIC");
    });

    let hsLabel = this.add.text(WIDTH / 2, 360, "HIGH SCORE", { 
        fontSize: "20px", color: "#aaaaaa", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(500);
    
    let hsValue = this.add.text(WIDTH / 2, 395, highScore, { 
        fontSize: "36px", fontStyle: "bold", color: "#ffff55" 
    }).setOrigin(0.5).setDepth(500);

    menuElements.push(hsLabel, hsValue);

    playButton.on("pointerdown", () => {
        if (bgm && musicOn && !bgm.isPlaying) bgm.play();
        menuElements.forEach(el => el.destroy());
        startGame.call(this);
    });
}

function createDynamicTextures(scene) {
    if (!scene.textures.exists('blast_particle')) {
        let pGraphics = scene.make.graphics({x: 0, y: 0, add: false});
        pGraphics.fillStyle(0xffaa00, 1);
        pGraphics.fillCircle(4, 4, 4);
        pGraphics.generateTexture('blast_particle', 8, 8);
    }

    if (!scene.textures.exists('blood_particle')) {
        let bGraphics = scene.make.graphics({x: 0, y: 0, add: false});
        bGraphics.fillStyle(0xcc0000, 1);
        bGraphics.fillCircle(3, 3, 3);
        bGraphics.generateTexture('blood_particle', 6, 6);
    }

    if (!scene.textures.exists('pause_icon')) {
        let pIcon = scene.make.graphics({x: 0, y: 0, add: false});
        pIcon.fillStyle(0x222222, 1);
        pIcon.fillRoundedRect(0, 0, 24, 24, 4);
        pIcon.fillStyle(0xffffff, 1);
        pIcon.fillRect(6, 5, 4, 14);
        pIcon.fillRect(14, 5, 4, 14);
        pIcon.generateTexture('pause_icon', 24, 24);
    }

    if (!scene.textures.exists('resume_icon')) {
        let rIcon = scene.make.graphics({x: 0, y: 0, add: false});
        rIcon.fillStyle(0x008800, 1);
        rIcon.fillRoundedRect(0, 0, 24, 24, 4);
        rIcon.fillStyle(0xffffff, 1);
        rIcon.fillTriangle(7, 5, 19, 12, 7, 19);
        rIcon.generateTexture('resume_icon', 24, 24);
    }

    if (!scene.textures.exists('quit_icon')) {
        let qIcon = scene.make.graphics({x: 0, y: 0, add: false});
        qIcon.fillStyle(0x222222, 1);
        qIcon.fillRoundedRect(0, 0, 24, 24, 4);
        qIcon.lineStyle(3, 0xff4444, 1);
        qIcon.lineBetween(6, 6, 18, 18);
        qIcon.lineBetween(18, 6, 6, 18);
        qIcon.generateTexture('quit_icon', 24, 24);
    }
}

function update(time, delta){
    if(!gameStarted || gameOver || isPaused) return;

    player.setVelocityX(0);

    if(cursors.left.isDown || keys.A.isDown) player.setVelocityX(-500);
    if(cursors.right.isDown || keys.D.isDown) player.setVelocityX(500);

    player.x = Phaser.Math.Clamp(
        player.x,
        player.displayHeight * 0.5,
        WIDTH - player.displayHeight * 0.5
    );

    bullets.children.each((bullet) => {
        if (bullet && bullet.active) {
            if (bullet.y < -40 || bullet.x < -40 || bullet.x > WIDTH + 40) {
                bullet.destroy();
            }
        }
    });

    targets.children.each((target) => {
        if (!target || !target.active) return;

        if (target.y > HEIGHT + 30) {
            target.destroy();
            endGame(this);
        }
    });
}

function startGame(){
    gameStarted = true;
    gameOver = false;
    isPaused = false;
    score = 0;
    targetSpeed = 220;
    spawnInterval = 650;
    hudElements = [];

    isPowerUpActive = false;
    lastPowerUpScore = 0;
    if (powerUpTimer) powerUpTimer.destroy();

    player = this.physics.add.sprite(WIDTH / 2, HEIGHT - 110, "stengun");
    player.setScale(0.25);
    player.setAngle(-90);
    player.body.allowGravity = false;
    player.setDepth(100);

    player.body.setSize(player.width * 0.2, player.height * 0.7);

    bullets = this.physics.add.group();
    targets = this.physics.add.group();

    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys({
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D
    });

    scoreText = this.add.text(25, 20, "SCORE : 0", { 
        fontSize: "24px", color: "#ffffff", fontStyle: "bold", stroke: "#000000", strokeThickness: 4
    }).setDepth(1000);

    highScoreText = this.add.text(25, 52, "HIGH : " + highScore, { 
        fontSize: "18px", color: "#ffe44d", fontStyle: "bold", stroke: "#000000", strokeThickness: 3
    }).setDepth(1000);

    let pauseBtn = this.add.image(45, 105, "pause_icon")
        .setScale(1.8).setDepth(1000).setInteractive({ useHandCursor: true });

    let quitBtn = this.add.image(100, 105, "quit_icon")
        .setScale(1.8).setDepth(1000).setInteractive({ useHandCursor: true });

    pauseBtn.on("pointerdown", () => {
        if (gameOver) return;
        isPaused = !isPaused;
        if (isPaused) {
            this.physics.pause();
            fireTimer.paused = true;
            spawnTimer.paused = true;
            if (powerUpTimer) powerUpTimer.paused = true;
            pauseBtn.setTexture("resume_icon");
        } else {
            this.physics.resume();
            fireTimer.paused = false;
            spawnTimer.paused = false;
            if (powerUpTimer) powerUpTimer.paused = false;
            pauseBtn.setTexture("pause_icon");
        }
    });

    quitBtn.on("pointerdown", () => {
        if (fireTimer) fireTimer.destroy();
        if (spawnTimer) spawnTimer.destroy();
        if (powerUpTimer) powerUpTimer.destroy();
        gameStarted = false;
        gameOver = false;
        this.scene.restart();
    });

    hudElements.push(scoreText, highScoreText, pauseBtn, quitBtn);

    this.input.on("pointermove", (pointer) => {
        if (!gameStarted || gameOver || isPaused || !pointer.isDown) return;
        
        player.x = Phaser.Math.Clamp(
            pointer.x,
            player.displayHeight * 0.5,
            WIDTH - player.displayHeight * 0.5
        );
    });

    fireTimer = this.time.addEvent({
        delay: 70,
        loop: true,
        callback: () => shoot(this)
    });

    scheduleNextSpawn(this);

    this.physics.add.overlap(bullets, targets, bulletHitTarget, null, this);
}

function scheduleNextSpawn(scene) {
    if (spawnTimer) spawnTimer.destroy();

    spawnTimer = scene.time.addEvent({
        delay: Math.max(250, spawnInterval),
        loop: false,
        callback: () => {
            if (!isPaused && !gameOver) {
                spawnTargetRow();
                targetSpeed += 1.5;
                spawnInterval = Math.max(250, spawnInterval - 3);
            }
            scheduleNextSpawn(scene);
        }
    });
}

function shoot(scene){
    if(!player || !player.active || isPaused || gameOver) return;

    const tipYOffset = -(player.displayWidth / 2); 
    const nozzleX = player.x;
    const nozzleY = player.y + tipYOffset;

    let fireEmitter = scene.add.particles(nozzleX, nozzleY, 'blast_particle', {
        speed: { min: 80, max: 180 },
        angle: { min: 240, max: 300 },
        scale: { start: isPowerUpActive ? 2.5 : 1.0, end: 0 },
        lifespan: 80,
        blendMode: 'ADD'
    });
    fireEmitter.setDepth(150);
    fireEmitter.explode(5);

    scene.time.delayedCall(100, () => fireEmitter.destroy());

    // Shoots 105°, 90°, and 75° during power-up
    const angles = isPowerUpActive ? [105, 90, 75] : [90];
    const bulletScale = isPowerUpActive ? 0.105 : 0.035;
    const bulletSpeed = isPowerUpActive ? 5500 : 1100;

    angles.forEach(angleDeg => {
        let rad = Phaser.Math.DegToRad(angleDeg);
        let vx = bulletSpeed * Math.cos(rad);
        let vy = -bulletSpeed * Math.sin(rad);

        let bullet = bullets.create(nozzleX, nozzleY, "bullet");
        bullet.setScale(bulletScale);
        bullet.setAngle(90 - angleDeg);
        bullet.body.allowGravity = false;
        bullet.setVelocity(vx, vy);
    });

    playSynthSFX(scene, 'fire');
}

function triggerPowerUp(scene) {
    isPowerUpActive = true;
    player.setScale(0.75);

    let powText = scene.add.text(WIDTH / 2, HEIGHT / 2 - 120, "3X TRIPLE SHOT!", {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#ff3300",
        stroke: "#ffff00",
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(2000);

    scene.tweens.add({
        targets: powText,
        y: HEIGHT / 2 - 180,
        alpha: 0,
        duration: 1200,
        onComplete: () => powText.destroy()
    });

    if (powerUpTimer) powerUpTimer.destroy();

    powerUpTimer = scene.time.delayedCall(5000, () => {
        isPowerUpActive = false;
        if (player && player.active) {
            player.setScale(0.25);
        }
    });
}

function spawnTargetRow(){
    const cols = 5;
    const colWidth = WIDTH / cols;
    
    let spawnCount = Phaser.Math.Between(2, 4);
    let chosenCols = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4]).slice(0, spawnCount);

    chosenCols.forEach(col => {
        let number = Phaser.Math.Between(1, 5);
        let targetKey = "target" + number;
        let spawnX = col * colWidth + colWidth / 2 + Phaser.Math.Between(-15, 15);
        let spawnY = -50 - Phaser.Math.Between(0, 40);

        let target = targets.create(spawnX, spawnY, targetKey);
        target.setScale(0.28);
        target.body.allowGravity = false;
        target.setVelocityY(Phaser.Math.Between(targetSpeed, targetSpeed + 40));
    });
}

function bulletHitTarget(bullet, target){
    bullet.destroy();

    playSynthSFX(this, 'hit');
    createHitEffects(this, target.x, target.y);

    target.destroy();

    score += 10;
    scoreText.setText("SCORE : " + score);

    // Trigger power-up every 1000 points threshold
    if (Math.floor(score / 1000) > Math.floor(lastPowerUpScore / 1000)) {
        lastPowerUpScore = score;
        triggerPowerUp(this);
    }

    if(score > highScore){
        highScore = score;
        localStorage.setItem("slbHighScore", highScore);
        highScoreText.setText("HIGH : " + highScore);
    }
}

function createHitEffects(scene, x, y) {
    let blastEmitter = scene.add.particles(x, y, 'blast_particle', {
        speed: { min: 80, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        lifespan: 200,
        blendMode: 'ADD'
    });
    blastEmitter.setDepth(800);
    blastEmitter.explode(10);

    let bloodEmitter = scene.add.particles(x, y, 'blood_particle', {
        speed: { min: 60, max: 160 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0.2 },
        gravityY: 300,
        lifespan: 300
    });
    bloodEmitter.setDepth(800);
    bloodEmitter.explode(12);

    scene.time.delayedCall(350, () => {
        blastEmitter.destroy();
        bloodEmitter.destroy();
    });
}

function endGame(scene){
    if(gameOver) return;
    gameOver = true;

    playSynthSFX(scene, 'gameover');

    if (fireTimer) fireTimer.destroy();
    if (spawnTimer) spawnTimer.destroy();
    if (powerUpTimer) powerUpTimer.destroy();

    if (player && player.body) player.setVelocity(0);

    scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.8).setDepth(2000);
    
    scene.add.text(WIDTH / 2, HEIGHT / 2 - 90, "GAME OVER", { 
        fontSize: "56px", color: "#ff3333", fontStyle: "bold" 
    }).setOrigin(0.5).setDepth(2001);

    scene.add.text(WIDTH / 2, HEIGHT / 2 - 20, "SCORE : " + score, { 
        fontSize: "30px", color: "#ffffff" 
    }).setOrigin(0.5).setDepth(2001);

    scene.add.text(WIDTH / 2, HEIGHT / 2 + 30, "HIGH : " + highScore, { 
        fontSize: "30px", color: "#ffff44" 
    }).setOrigin(0.5).setDepth(2001);

    let restart = scene.add.text(WIDTH / 2 - 80, HEIGHT / 2 + 120, "RESTART", {
        fontSize: "28px", backgroundColor: "#222222", color: "#00ff66",
        padding: { left: 16, right: 16, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true });

    let returnHome = scene.add.text(WIDTH / 2 + 80, HEIGHT / 2 + 120, "RETURN", {
        fontSize: "28px", backgroundColor: "#222222", color: "#ffdd00",
        padding: { left: 16, right: 16, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(2001).setInteractive({ useHandCursor: true });

    restart.on("pointerdown", () => {
        score = 0; targetSpeed = 220; spawnInterval = 650;
        gameStarted = false; gameOver = false;
        scene.scene.restart();
    });

    returnHome.on("pointerdown", () => {
        score = 0; targetSpeed = 220; spawnInterval = 650;
        gameStarted = false; gameOver = false;
        scene.scene.restart();
    });
}