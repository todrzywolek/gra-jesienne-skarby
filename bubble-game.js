const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game configuration
const BUBBLE_RADIUS = 35;
const BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D']; // Red, Teal, Yellow - only 3 colors for young kids
const ROWS = 4;

// Game state
let bubbles = [];
let projectile = null;
let nextColor = null;
let score = 0;
let gameActive = true;
let aimX = 0;
let aimY = 0;
let cols = 0;
let offsetX = 0;

// UI elements
const scoreDisplay = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');

// Draw heart shape
function drawHeart(x, y, size, color, withShadow = true) {
    // Draw shadow first
    if (withShadow) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        const sx = x + 3;
        const sy = y + 3;
        ctx.moveTo(sx, sy + size * 0.3);
        ctx.bezierCurveTo(sx, sy - size * 0.3, sx - size, sy - size * 0.3, sx - size, sy + size * 0.3);
        ctx.bezierCurveTo(sx - size, sy + size * 0.7, sx, sy + size, sx, sy + size * 1.2);
        ctx.bezierCurveTo(sx, sy + size, sx + size, sy + size * 0.7, sx + size, sy + size * 0.3);
        ctx.bezierCurveTo(sx + size, sy - size * 0.3, sx, sy - size * 0.3, sx, sy + size * 0.3);
        ctx.fill();
    }

    // Draw heart
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y + size * 0.7, x, y + size, x, y + size * 1.2);
    ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.7, x + size, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
    ctx.fill();

    // Draw shine/highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(x - size * 0.4, y, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y - size * 0.3, x - size, y - size * 0.3, x - size, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y + size * 0.7, x, y + size, x, y + size * 1.2);
    ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.7, x + size, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y - size * 0.3, x, y - size * 0.3, x, y + size * 0.3);
    ctx.stroke();
}

// Set canvas size
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const header = document.querySelector('.game-header');

    // Use container dimensions (max 500x750)
    const containerWidth = Math.min(500, window.innerWidth);
    const containerHeight = Math.min(750, window.innerHeight);

    canvas.width = containerWidth;
    canvas.height = containerHeight - header.offsetHeight;

    // Calculate grid dimensions - fewer columns for smaller canvas
    cols = 5; // Fixed 5 columns for simplicity
    offsetX = (canvas.width - (cols * BUBBLE_RADIUS * 2)) / 2 + BUBBLE_RADIUS;

    // Reinitialize if game is active
    if (bubbles.length === 0) {
        initGame();
    }
}

// Bubble class - static bubbles in grid
class Bubble {
    constructor(row, col, color) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.radius = BUBBLE_RADIUS;
        this.alive = true;
        this.updatePosition();
    }

    updatePosition() {
        // Offset every other row
        const rowOffset = (this.row % 2 === 1) ? BUBBLE_RADIUS : 0;
        this.x = offsetX + this.col * BUBBLE_RADIUS * 2 + rowOffset;
        this.y = BUBBLE_RADIUS + this.row * BUBBLE_RADIUS * 1.8;
    }

    draw() {
        if (!this.alive) return;
        drawHeart(this.x, this.y - this.radius * 0.3, this.radius * 0.8, this.color);
    }
}

// Projectile class - the bubble being shot
class Projectile {
    constructor(x, y, targetX, targetY, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = BUBBLE_RADIUS;
        this.alive = true;

        // Calculate velocity toward target
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 15;

        this.vx = (dx / distance) * speed;
        this.vy = (dy / distance) * speed;
    }

    update() {
        if (!this.alive) return;

        // Move projectile
        this.x += this.vx;
        this.y += this.vy;

        // Wall collision - bounce off walls
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -1;
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -1;
        }

        // Top wall - attach bubble
        if (this.y - this.radius < 0) {
            this.alive = false;
            attachBubble(this);
            return;
        }

        // Check collision with existing bubbles
        for (let bubble of bubbles) {
            if (bubble.alive && this.collidesWidth(bubble)) {
                this.alive = false;
                attachBubble(this);
                return;
            }
        }
    }

    collidesWidth(bubble) {
        const dx = this.x - bubble.x;
        const dy = this.y - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + bubble.radius - 5;
    }

    draw() {
        if (!this.alive) return;
        drawHeart(this.x, this.y - this.radius * 0.3, this.radius * 0.8, this.color);
    }
}

// Find the best grid position for the projectile
function attachBubble(proj) {
    // Find nearest grid position
    let bestRow = Math.round((proj.y - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 1.8));
    bestRow = Math.max(0, bestRow);

    const rowOffset = (bestRow % 2 === 1) ? BUBBLE_RADIUS : 0;
    let bestCol = Math.round((proj.x - offsetX - rowOffset) / (BUBBLE_RADIUS * 2));

    // Clamp to valid range
    const maxCols = (bestRow % 2 === 1) ? cols - 1 : cols;
    bestCol = Math.max(0, Math.min(bestCol, maxCols - 1));

    // Check if position is already taken
    const existingBubble = bubbles.find(b => b.alive && b.row === bestRow && b.col === bestCol);
    if (existingBubble) {
        // Try adjacent positions
        const alternatives = [
            { row: bestRow, col: bestCol - 1 },
            { row: bestRow, col: bestCol + 1 },
            { row: bestRow + 1, col: bestCol },
            { row: bestRow + 1, col: bestCol - 1 },
            { row: bestRow + 1, col: bestCol + 1 },
        ];

        for (let alt of alternatives) {
            const maxC = (alt.row % 2 === 1) ? cols - 1 : cols;
            if (alt.col >= 0 && alt.col < maxC && alt.row >= 0) {
                const taken = bubbles.find(b => b.alive && b.row === alt.row && b.col === alt.col);
                if (!taken) {
                    bestRow = alt.row;
                    bestCol = alt.col;
                    break;
                }
            }
        }
    }

    // Create new bubble at grid position
    const newBubble = new Bubble(bestRow, bestCol, proj.color);
    bubbles.push(newBubble);

    // Check for matches
    const matches = findMatches(newBubble);
    if (matches.length >= 3) {
        // Pop matching bubbles
        for (let match of matches) {
            match.alive = false;
        }
        score += matches.length * 10;

        // Bonus for big matches
        if (matches.length >= 5) score += 50;
        if (matches.length >= 7) score += 100;

        // Remove floating bubbles
        removeFloatingBubbles();

        // Update next color since some colors may no longer be on the field
        nextColor = pickNextColor();
    }

    updateScore();
    checkGameState();
}

// Find all connected bubbles of the same color
function findMatches(startBubble) {
    const matches = [startBubble];
    const checked = new Set();
    checked.add(`${startBubble.row},${startBubble.col}`);

    const queue = [startBubble];

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = getNeighbors(current);

        for (let neighbor of neighbors) {
            const key = `${neighbor.row},${neighbor.col}`;
            if (!checked.has(key) && neighbor.color === startBubble.color) {
                checked.add(key);
                matches.push(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return matches;
}

// Get neighboring bubbles
function getNeighbors(bubble) {
    const neighbors = [];
    const row = bubble.row;
    const col = bubble.col;
    const isOddRow = row % 2 === 1;

    // Adjacent positions depend on whether we're in an odd or even row
    const offsets = isOddRow ? [
        { dr: -1, dc: 0 },  // top-left
        { dr: -1, dc: 1 },  // top-right
        { dr: 0, dc: -1 },  // left
        { dr: 0, dc: 1 },   // right
        { dr: 1, dc: 0 },   // bottom-left
        { dr: 1, dc: 1 },   // bottom-right
    ] : [
        { dr: -1, dc: -1 }, // top-left
        { dr: -1, dc: 0 },  // top-right
        { dr: 0, dc: -1 },  // left
        { dr: 0, dc: 1 },   // right
        { dr: 1, dc: -1 },  // bottom-left
        { dr: 1, dc: 0 },   // bottom-right
    ];

    for (let offset of offsets) {
        const nr = row + offset.dr;
        const nc = col + offset.dc;

        const neighbor = bubbles.find(b => b.alive && b.row === nr && b.col === nc);
        if (neighbor) {
            neighbors.push(neighbor);
        }
    }

    return neighbors;
}

// Remove bubbles not connected to the top
function removeFloatingBubbles() {
    // Mark all bubbles as not visited
    const connected = new Set();

    // Start from top row bubbles
    const topBubbles = bubbles.filter(b => b.alive && b.row === 0);
    const queue = [...topBubbles];

    for (let b of topBubbles) {
        connected.add(`${b.row},${b.col}`);
    }

    // BFS to find all connected bubbles
    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = getNeighbors(current);

        for (let neighbor of neighbors) {
            const key = `${neighbor.row},${neighbor.col}`;
            if (!connected.has(key)) {
                connected.add(key);
                queue.push(neighbor);
            }
        }
    }

    // Remove floating bubbles
    let floatingCount = 0;
    for (let bubble of bubbles) {
        if (bubble.alive) {
            const key = `${bubble.row},${bubble.col}`;
            if (!connected.has(key)) {
                bubble.alive = false;
                floatingCount++;
            }
        }
    }

    // Bonus for dropping floating bubbles
    if (floatingCount > 0) {
        score += floatingCount * 15;
    }
}

// Check if game is won or lost
function checkGameState() {
    const aliveBubbles = bubbles.filter(b => b.alive);

    // Win - all bubbles cleared
    if (aliveBubbles.length === 0) {
        endGame(true);
        return;
    }

    // Lose - bubbles reached bottom
    const maxRow = Math.max(...aliveBubbles.map(b => b.row));
    const bottomY = BUBBLE_RADIUS + maxRow * BUBBLE_RADIUS * 1.8 + BUBBLE_RADIUS;
    if (bottomY > canvas.height - 120) {
        endGame(false);
    }
}

// Initialize game
function initGame() {
    bubbles = [];
    projectile = null;
    score = 0;
    gameActive = true;
    gameOverScreen.classList.remove('show');

    // Create initial bubble grid
    for (let row = 0; row < ROWS; row++) {
        const maxCols = (row % 2 === 1) ? cols - 1 : cols;
        for (let col = 0; col < maxCols; col++) {
            const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
            bubbles.push(new Bubble(row, col, color));
        }
    }

    // Pick first projectile color from colors on the field
    nextColor = pickNextColor();

    updateScore();
}

function updateScore() {
    scoreDisplay.textContent = score;
}

// Get colors that are still on the field
function getAvailableColors() {
    const colorsOnField = new Set();
    for (let bubble of bubbles) {
        if (bubble.alive) {
            colorsOnField.add(bubble.color);
        }
    }
    return Array.from(colorsOnField);
}

// Pick a random color from available colors on the field
function pickNextColor() {
    const available = getAvailableColors();
    if (available.length === 0) {
        return BUBBLE_COLORS[0]; // Fallback if no bubbles left
    }
    return available[Math.floor(Math.random() * available.length)];
}

function endGame(won) {
    gameActive = false;
    gameOverScreen.classList.add('show');
    finalScoreDisplay.textContent = score;

    const titleElement = document.getElementById('gameOverTitle');
    if (won) {
        titleElement.textContent = 'Gratulacje! Wygrałeś!';
        titleElement.style.color = '#4ECDC4';
    } else {
        titleElement.textContent = 'GAME OVER!';
        titleElement.style.color = '#ff6b6b';
    }
}

// Draw aiming guide
function drawAimGuide() {
    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - 60;

    // Calculate aim direction
    const dx = aimX - shooterX;
    const dy = aimY - shooterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && dy < 0) {
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Draw dotted line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(shooterX, shooterY);
        ctx.lineTo(shooterX + dirX * 400, shooterY + dirY * 400);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw shooter base
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(shooterX, shooterY + 20, 50, 0, Math.PI * 2);
    ctx.fill();

    // Draw next heart (the one to be shot)
    drawHeart(shooterX, shooterY - BUBBLE_RADIUS * 0.3, BUBBLE_RADIUS * 0.8, nextColor);

    // Draw white border around shooter heart
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    const y = shooterY - BUBBLE_RADIUS * 0.3;
    const size = BUBBLE_RADIUS * 0.8;
    ctx.beginPath();
    ctx.moveTo(shooterX, y + size * 0.3);
    ctx.bezierCurveTo(shooterX, y - size * 0.3, shooterX - size, y - size * 0.3, shooterX - size, y + size * 0.3);
    ctx.bezierCurveTo(shooterX - size, y + size * 0.7, shooterX, y + size, shooterX, y + size * 1.2);
    ctx.bezierCurveTo(shooterX, y + size, shooterX + size, y + size * 0.7, shooterX + size, y + size * 0.3);
    ctx.bezierCurveTo(shooterX + size, y - size * 0.3, shooterX, y - size * 0.3, shooterX, y + size * 0.3);
    ctx.stroke();
}

// Shoot bubble
function shootBubble(targetX, targetY) {
    if (!gameActive || projectile) return;

    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - 60;

    // Only shoot upward
    if (targetY >= shooterY - 30) return;

    projectile = new Projectile(shooterX, shooterY, targetX, targetY, nextColor);

    // Pick next color only from colors still on the field
    nextColor = pickNextColor();
}

// Game loop
function gameLoop() {
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameActive) {
        // Draw all bubbles
        for (let bubble of bubbles) {
            bubble.draw();
        }

        // Update and draw projectile
        if (projectile) {
            projectile.update();
            projectile.draw();

            if (!projectile.alive) {
                projectile = null;
            }
        }

        // Draw aiming guide
        drawAimGuide();
    }

    requestAnimationFrame(gameLoop);
}

// Event listeners
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Touch controls
canvas.addEventListener('touchmove', (e) => {
    if (!gameActive) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    aimX = touch.clientX - rect.left;
    aimY = touch.clientY - rect.top;
});

canvas.addEventListener('touchend', (e) => {
    if (!gameActive || projectile) return;
    e.preventDefault();

    shootBubble(aimX, aimY);
});

// Mouse controls
canvas.addEventListener('mousemove', (e) => {
    if (!gameActive) return;

    const rect = canvas.getBoundingClientRect();
    aimX = e.clientX - rect.left;
    aimY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    if (!gameActive || projectile) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    shootBubble(clickX, clickY);
});

// Start game
initGame();
gameLoop();
