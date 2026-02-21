const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const titleEl = document.getElementById('level-title');
const messageEl = document.getElementById('message');
const revealScreen = document.getElementById('reveal-screen');
const revealTrait = document.getElementById('reveal-trait');
const revealDesc = document.getElementById('reveal-description');
const startScreen = document.getElementById('start-screen');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State
let gameState = 'playing';
let currentLevel = 1;
const MAX_LEVELS = 7;

// Player Profile Telemetry
const telemetry = {
    totalDeaths: 0,
    levelDeaths: 0,
    trapTriggers: 0,
    timeSinceLastMove: 0,
    totalTimeMoving: 0,
    totalTimeStationary: 0,
    finalProfile: ''
};

// Player Object
let player = {
    x: 100,
    y: 100,
    size: 20,
    speed: 6,
    vx: 0,
    vy: 0,
    color: '#2962ff'
};

// Map Objects
let levelBounds = { w: 2000, h: 2000 };
let walls = [];
let traps = [];
let exit = null;
let dynamicObstacles = [];

// Camera
let camera = { x: 0, y: 0 };

// Inputs
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (gameState === 'start' && e.code === 'Space') {
        gameState = 'playing';
        startScreen.classList.add('hidden');
        telemetry.timeSinceLastMove = 0; // reset idle
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function aabb(r1, r2) {
    const w1 = r1.width || r1.size;
    const h1 = r1.height || r1.size;
    const w2 = r2.width || r2.size;
    const h2 = r2.height || r2.size;
    return r1.x < r2.x + w2 &&
        r1.x + w1 > r2.x &&
        r1.y < r2.y + h2 &&
        r1.y + h1 > r2.y;
}

function generateLevel(levelNum) {
    // Exponential difficulty scaling
    const scale = Math.pow(1.3, levelNum - 1); // 1, 1.3, 1.69, 2.19...
    levelBounds.w = 2000 * scale;
    levelBounds.h = 2000 * scale;

    player.x = 100;
    player.y = 100;

    exit = { x: levelBounds.w - 150, y: levelBounds.h - 150, width: 80, height: 80 };

    walls = [];
    traps = [];
    dynamicObstacles = [];

    // Base borders
    walls.push({ x: 0, y: 0, width: levelBounds.w, height: 20 });
    walls.push({ x: 0, y: levelBounds.w - 20, width: levelBounds.w, height: 20 });
    walls.push({ x: 0, y: 0, width: 20, height: levelBounds.h });
    walls.push({ x: levelBounds.w - 20, y: 0, width: 20, height: levelBounds.h });

    // Procedural generation of obstacles
    const wallCount = Math.floor(30 * scale);
    const trapCount = Math.floor(40 * scale);
    const movingCount = Math.floor(15 * scale);
    const predictiveCount = Math.floor(5 * scale);

    const safeStart = { x: 0, y: 0, width: 400, height: 400 };
    const safeExit = { x: levelBounds.w - 400, y: levelBounds.h - 400, width: 400, height: 400 };

    function inSafeZone(rect) {
        return aabb(rect, safeStart) || aabb(rect, safeExit);
    }

    // Seed walls
    for (let i = 0; i < wallCount; i++) {
        let w, attempts = 0;
        do {
            w = {
                x: 100 + Math.random() * (levelBounds.w - 200),
                y: 100 + Math.random() * (levelBounds.h - 200),
                width: Math.random() > 0.5 ? 400 : 40,
                height: Math.random() > 0.5 ? 40 : 400
            };
            attempts++;
        } while (inSafeZone(w) && attempts < 100);
        if (attempts < 100) walls.push(w);
    }

    // Seed static traps
    for (let i = 0; i < trapCount; i++) {
        let t, attempts = 0;
        do {
            t = {
                x: 100 + Math.random() * (levelBounds.w - 200),
                y: 100 + Math.random() * (levelBounds.h - 200),
                width: 40 + Math.random() * 60,
                height: 40 + Math.random() * 60
            };
            attempts++;
        } while (inSafeZone(t) && attempts < 100);
        if (attempts < 100) traps.push(t);
    }

    // Seed moving traps
    for (let i = 0; i < movingCount; i++) {
        const isHorizontal = Math.random() > 0.5;
        let d, attempts = 0;
        do {
            d = {
                type: 'moving-trap',
                x: 150 + Math.random() * (levelBounds.w - 300),
                y: 150 + Math.random() * (levelBounds.h - 300),
                width: 40, height: 40,
                baseVx: isHorizontal ? (Math.random() > 0.5 ? 4 : -4) : 0,
                baseVy: isHorizontal ? 0 : (Math.random() > 0.5 ? 4 : -4),
                vx: 0, vy: 0,
                tBound: 100, bBound: levelBounds.h - 100,
                lBound: 100, rBound: levelBounds.w - 100
            };
            attempts++;
        } while (inSafeZone(d) && attempts < 100);
        if (attempts < 100) dynamicObstacles.push(d);
    }

    // Seed predictive traps
    for (let i = 0; i < predictiveCount; i++) {
        dynamicObstacles.push({
            type: 'predictive-trap',
            x: levelBounds.w / 2 + (Math.random() - 0.5) * levelBounds.w * 0.8,
            y: levelBounds.h / 2 + (Math.random() - 0.5) * levelBounds.h * 0.8,
            width: 30, height: 30,
            speed: 3
        });
    }

    titleEl.innerText = levelNum === MAX_LEVELS ? "Final Level" : `Level ${levelNum}`;
    messageEl.innerText = `Establishing Uplink...`;

    telemetry.levelDeaths = 0;
    telemetry.timeSinceLastMove = 0;
    gameState = 'playing';
}

function die() {
    if (gameState === 'dead') return;
    gameState = 'dead';
    telemetry.totalDeaths++;
    telemetry.levelDeaths++;
    telemetry.trapTriggers++;

    // Quick red flash
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#ffcccc';
    setTimeout(() => { document.body.style.backgroundColor = originalBg; }, 150);

    setTimeout(() => {
        // Respawn without regenerating level to allow learning
        player.x = 100;
        player.y = 100;
        telemetry.timeSinceLastMove = 0;
        gameState = 'start';
        startScreen.classList.remove('hidden');
    }, 500);
}

function showReveal() {
    gameState = 'reveal';
    revealScreen.classList.remove('hidden');

    const moveRatio = telemetry.totalTimeMoving / Math.max(1, (telemetry.totalTimeMoving + telemetry.totalTimeStationary));
    let prof = '';

    if (telemetry.totalDeaths > 30) prof = 'Struggling but Persistent';
    else if (moveRatio > 0.8 && telemetry.totalDeaths > 15) prof = 'Recklessly Aggressive';
    else if (moveRatio < 0.4) prof = 'Overly Cautious';
    else if (telemetry.totalDeaths < 10) prof = 'Adept & Calculating';
    else prof = 'Balanced Survivor';

    revealTrait.innerText = `You are ${prof}.`;
    revealDesc.innerText = `You died ${telemetry.totalDeaths} times and spent ${Math.round(telemetry.totalTimeStationary / 1000)} seconds standing still. The environment continuously shifted its speed and geometry to your behavior. The simulation recognizes your approach.`;
}

function update(dt) {
    if (gameState !== 'playing') return;

    let dx = 0;
    let dy = 0;
    if (keys.w || keys.arrowup) dy -= 1;
    if (keys.s || keys.arrowdown) dy += 1;
    if (keys.a || keys.arrowleft) dx -= 1;
    if (keys.d || keys.arrowright) dx += 1;

    let isMovingNow = (dx !== 0 || dy !== 0);

    if (isMovingNow) {
        telemetry.totalTimeMoving += dt;
        telemetry.timeSinceLastMove = 0;
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
    } else {
        telemetry.totalTimeStationary += dt;
        telemetry.timeSinceLastMove += dt;
    }

    player.vx = dx * player.speed;
    player.vy = dy * player.speed;

    // IDLE DETECTION: Spawn trap under player
    if (telemetry.timeSinceLastMove > 3000) {
        traps.push({
            x: player.x - 10,
            y: player.y - 10,
            width: 40, height: 40
        });
        telemetry.timeSinceLastMove = 0; // reset to prevent infinite spawn
    }

    const timeScale = dt / (1000 / 60) || 1;

    // CONTINUOUS ADAPTATION
    // If you die a lot, speed multiplier decreases (easier). If you don't die, it stays fast or gets faster.
    let adaptationMult = Math.max(0.6, 1.2 - (telemetry.levelDeaths * 0.05));

    // X Move
    player.x += player.vx * timeScale;
    if (player.x < 0) player.x = 0;
    if (player.x + player.size > levelBounds.w) player.x = levelBounds.w - player.size;
    for (let w of walls) {
        if (aabb(player, w)) {
            if (player.vx > 0) player.x = w.x - player.size;
            else if (player.vx < 0) player.x = w.x + w.width;
        }
    }

    // Y Move
    player.y += player.vy * timeScale;
    if (player.y < 0) player.y = 0;
    if (player.y + player.size > levelBounds.h) player.y = levelBounds.h - player.size;
    for (let w of walls) {
        if (aabb(player, w)) {
            if (player.vy > 0) player.y = w.y - player.size;
            else if (player.vy < 0) player.y = w.y + w.height;
        }
    }

    // CAMERA UPDATE (Center on player)
    camera.x = player.x + player.size / 2 - canvas.width / 2;
    camera.y = player.y + player.size / 2 - canvas.height / 2;

    // Clamp camera to map bounds
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x + canvas.width > levelBounds.w) camera.x = Math.max(0, levelBounds.w - canvas.width);
    if (camera.y + canvas.height > levelBounds.h) camera.y = Math.max(0, levelBounds.h - canvas.height);

    // Dynamics
    for (let d of dynamicObstacles) {
        if (d.type === 'moving-trap') {
            d.vx = d.baseVx * adaptationMult;
            d.vy = d.baseVy * adaptationMult;

            d.x += d.vx * timeScale;
            d.y += d.vy * timeScale;

            if (d.x < d.lBound || d.x + d.width > d.rBound) d.baseVx *= -1;
            if (d.y < d.tBound || d.y + d.height > d.bBound) d.baseVy *= -1;

            if (aabb(player, d)) die();
        }

        if (d.type === 'predictive-trap') {
            // Predict player position slightly in the future
            let targetX = player.x + player.vx * 15;
            let targetY = player.y + player.vy * 15;

            let angle = Math.atan2(targetY - d.y, targetX - d.x);
            let speed = d.speed * adaptationMult;

            d.x += Math.cos(angle) * speed * timeScale;
            d.y += Math.sin(angle) * speed * timeScale;

            if (aabb(player, d)) die();
        }
    }

    // Static Traps
    for (let t of traps) {
        if (aabb(player, t)) die();
    }

    // Exit
    if (aabb(player, exit)) {
        currentLevel++;
        if (currentLevel > MAX_LEVELS) {
            showReveal();
        } else {
            gameState = 'transition';
            setTimeout(() => { generateLevel(currentLevel); }, 500);
        }
    } else if (exit && gameState === 'playing') {
        const relX = Math.round((exit.x + exit.width / 2) - (player.x + player.size / 2));
        const relY = Math.round((exit.y + exit.height / 2) - (player.y + player.size / 2));
        messageEl.innerText = `Relative Exit Coordinates: X [${relX}]  Y [${relY}]`;
    }
}

function drawRect(obj, color, useCamera = true) {
    ctx.fillStyle = color;
    const w = obj.width || obj.size;
    const h = obj.height || obj.size;

    let drawX = obj.x;
    let drawY = obj.y;

    if (useCamera) {
        drawX -= camera.x;
        drawY -= camera.y;

        // Culling (don't draw if off screen)
        if (drawX + w < 0 || drawX > canvas.width || drawY + h < 0 || drawY > canvas.height) {
            return;
        }
    }

    ctx.fillRect(drawX, drawY, w, h);
}

function drawGrid() {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    const gridSize = 100;

    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
    }
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
    }
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid(); // Adds to the visual sizing feel

    if (exit) {
        // Distinct Exit Design: Pulsing concentric squares
        const pulse = Math.abs(Math.sin(performance.now() / 400)) * 12;
        ctx.fillStyle = '#00ff00';
        const ex = exit.x - camera.x;
        const ey = exit.y - camera.y;
        if (ex + exit.width > 0 && ex < canvas.width && ey + exit.height > 0 && ey < canvas.height) {
            ctx.fillRect(ex + pulse / 2, ey + pulse / 2, exit.width - pulse, exit.height - pulse);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(ex + 8, ey + 8, exit.width - 16, exit.height - 16);
        }

        // Draw an indicator pointing to the exit around the player
        const dx = (exit.x + exit.width / 2) - (player.x + player.size / 2);
        const dy = (exit.y + exit.height / 2) - (player.y + player.size / 2);
        const angle = Math.atan2(dy, dx);

        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        const indicatorX = (player.x + player.size / 2 - camera.x) + Math.cos(angle) * 45;
        const indicatorY = (player.y + player.size / 2 - camera.y) + Math.sin(angle) * 45;

        // Draw Arrow Head
        ctx.moveTo(indicatorX + Math.cos(angle) * 10, indicatorY + Math.sin(angle) * 10);
        ctx.lineTo(indicatorX + Math.cos(angle + Math.PI * 0.75) * 8, indicatorY + Math.sin(angle + Math.PI * 0.75) * 8);
        ctx.lineTo(indicatorX + Math.cos(angle - Math.PI * 0.75) * 8, indicatorY + Math.sin(angle - Math.PI * 0.75) * 8);
        ctx.fill();
    }

    walls.forEach(w => drawRect(w, '#888899'));
    traps.forEach(t => drawRect(t, '#888899'));

    dynamicObstacles.forEach(d => {
        if (d.type === 'moving-trap' || d.type === 'predictive-trap') {
            drawRect(d, '#888899');
        }
    });

    // Distinct Player Design: Core-lit square
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    ctx.fillStyle = player.color;
    ctx.fillRect(px, py, player.size, player.size);
    ctx.fillStyle = '#ffffff'; // White inner core
    ctx.fillRect(px + 4, py + 4, player.size - 8, player.size - 8);
}

let lastTime = performance.now();
function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Start
generateLevel(currentLevel);
gameState = 'start';
requestAnimationFrame(gameLoop);
