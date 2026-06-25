// ==================================================
// 1. CANVAS SETUP
// ==================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// ==================================================
// 2. THE POOL / CHARITY: WATER-INSPIRED COLOR PALETTE
// ==================================================

const COLORS = {
  yellow: "#FFC908",
  deepTeal: "#214A4F",
  olive: "#8F9133",
  softPeach: "#E8C7B8",
  burntOrange: "#C24F21",
  cream: "#F5F2E0",
  peach: "#F5B89E",
  navy: "#1C2B40",
  black: "#000000",
  white: "#FFFFFF",
  cleanWater: "#77A8BB"
};

// ==================================================
// 3. GAME SETTINGS
// ==================================================

const gravity = 0.7;
const moveSpeed = 5;
const jumpPower = -14;

let keys = {};
let score = 0;
let lives = 3;
let gameWon = false;
let gameOver = false;
let attackCooldown = 0;
let invincibleTimer = 0;
let startTime = Date.now();

// ==================================================
// 4. PLAYER
// ==================================================

const player = {
  x: 60,
  y: 420,
  w: 40,
  h: 55,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1
};

// ==================================================
// 5. LEVEL OBJECTS
// ==================================================

let platforms;
let obstacles;
let germs;
let pipe;
let waterDrops;

function loadLevel() {
  player.x = 60;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;

  score = 0;
  lives = 3;
  gameWon = false;
  gameOver = false;
  attackCooldown = 0;
  invincibleTimer = 0;
  startTime = Date.now();

  platforms = [
    { x: 0, y: 500, w: 960, h: 40 },
    { x: 220, y: 420, w: 140, h: 25 },
    { x: 450, y: 350, w: 140, h: 25 },
    { x: 690, y: 280, w: 150, h: 25 }
  ];

  obstacles = [
    { x: 300, y: 360, w: 60, h: 60, hp: 2 },
    { x: 520, y: 290, w: 60, h: 60, hp: 3 },
    { x: 760, y: 220, w: 60, h: 60, hp: 3 }
  ];

  germs = [
    { x: 150, y: 460, w: 40, h: 40, vx: 2, minX: 90, maxX: 250 },
    { x: 450, y: 310, w: 40, h: 40, vx: 1.7, minX: 450, maxX: 560 },
    { x: 700, y: 240, w: 40, h: 40, vx: 1.5, minX: 690, maxX: 820 }
  ];

  pipe = {
    x: 880,
    y: 200,
    w: 55,
    h: 80
  };

  waterDrops = [
    { x: 40, y: 120, speed: 0.7 },
    { x: 170, y: 160, speed: 0.5 },
    { x: 330, y: 110, speed: 0.9 },
    { x: 610, y: 150, speed: 0.6 },
    { x: 790, y: 130, speed: 0.8 }
  ];
}

loadLevel();

// ==================================================
// 6. KEYBOARD CONTROLS
// ==================================================

document.addEventListener("keydown", function(event) {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === " " || key === "arrowup") {
    event.preventDefault();
  }

  if ((key === "e" || key === "f") && !gameWon && !gameOver) {
    attackObstacle();
  }

  if (key === "r") {
    loadLevel();
  }
});

document.addEventListener("keyup", function(event) {
  keys[event.key.toLowerCase()] = false;
});

// ==================================================
// 7. GAME LOOP
// ==================================================

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

// ==================================================
// 8. UPDATE GAME LOGIC
// ==================================================

function update() {
  animateBackgroundWater();

  if (gameWon || gameOver) {
    return;
  }

  if (attackCooldown > 0) attackCooldown--;
  if (invincibleTimer > 0) invincibleTimer--;

  movePlayer();
  moveGerms();
  checkGermDamage();
  checkPipeGoal();
}

function animateBackgroundWater() {
  waterDrops.forEach(function(drop) {
    drop.y += drop.speed;

    if (drop.y > 500) {
      drop.y = 90;
    }
  });
}

// ==================================================
// 9. PLAYER MOVEMENT
// ==================================================

function movePlayer() {
  player.vx = 0;

  if (keys["a"] || keys["arrowleft"]) {
    player.vx = -moveSpeed;
    player.facing = -1;
  }

  if (keys["d"] || keys["arrowright"]) {
    player.vx = moveSpeed;
    player.facing = 1;
  }

  if ((keys["w"] || keys[" "] || keys["arrowup"]) && player.onGround) {
    player.vy = jumpPower;
    player.onGround = false;
  }

  player.vy += gravity;

  moveWithCollision("x");
  moveWithCollision("y");

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > WIDTH) player.x = WIDTH - player.w;

  if (player.y > HEIGHT) {
    damagePlayer();
  }
}

// ==================================================
// 10. COLLISION
// ==================================================

function getSolidObjects() {
  return platforms.concat(obstacles);
}

function moveWithCollision(axis) {
  const solids = getSolidObjects();

  if (axis === "x") {
    player.x += player.vx;

    solids.forEach(function(solid) {
      if (isColliding(player, solid)) {
        if (player.vx > 0) {
          player.x = solid.x - player.w;
        } else if (player.vx < 0) {
          player.x = solid.x + solid.w;
        }

        player.vx = 0;
      }
    });
  }

  if (axis === "y") {
    player.y += player.vy;
    player.onGround = false;

    solids.forEach(function(solid) {
      if (isColliding(player, solid)) {
        if (player.vy > 0) {
          player.y = solid.y - player.h;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = solid.y + solid.h;
        }

        player.vy = 0;
      }
    });
  }
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ==================================================
// 11. BREAKABLE OBSTACLES
// ==================================================

function attackObstacle() {
  if (attackCooldown > 0) return;

  attackCooldown = 20;

  const attackBox = {
    x: player.facing === 1 ? player.x + player.w : player.x - 40,
    y: player.y + 10,
    w: 40,
    h: 35
  };

  obstacles.forEach(function(obstacle) {
    if (isColliding(attackBox, obstacle)) {
      obstacle.hp--;

      if (obstacle.hp <= 0) {
        obstacle.broken = true;
        score += 50;
      }
    }
  });

  obstacles = obstacles.filter(function(obstacle) {
    return !obstacle.broken;
  });
}

// ==================================================
// 12. GERM / BACTERIA ENEMIES
// ==================================================

function moveGerms() {
  germs.forEach(function(germ) {
    germ.x += germ.vx;

    if (germ.x < germ.minX || germ.x > germ.maxX) {
      germ.vx *= -1;
    }
  });
}

function checkGermDamage() {
  germs.forEach(function(germ) {
    if (isColliding(player, germ) && invincibleTimer <= 0) {
      damagePlayer();
    }
  });
}

function damagePlayer() {
  lives--;
  invincibleTimer = 90;

  player.x = 60;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;

  if (lives <= 0) {
    gameOver = true;
  }
}

// ==================================================
// 13. PIPE GOAL
// ==================================================

function checkPipeGoal() {
  if (isColliding(player, pipe)) {
    score += 200;
    gameWon = true;
  }
}

// ==================================================
// 14. DRAWING
// ==================================================

function draw() {
  drawBackground();
  drawPlatforms();
  drawObstacles();
  drawPipe();
  drawGerms();
  drawPlayer();
  drawUI();

  if (gameWon) {
    drawCenterMessage("Clean Water Restored!", "Press R to restart");
  }

  if (gameOver) {
    drawCenterMessage("Game Over", "Press R to try again");
  }
}

function drawBackground() {
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = COLORS.cleanWater;
  ctx.fillRect(0, 0, WIDTH, 360);

  ctx.fillStyle = COLORS.olive;
  ctx.fillRect(0, 360, WIDTH, 180);

  ctx.fillStyle = COLORS.deepTeal;
  ctx.fillRect(0, 500, WIDTH, 40);

  ctx.fillStyle = COLORS.yellow;
  ctx.beginPath();
  ctx.arc(80, 75, 34, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(180, 95);
  drawCloud(720, 90);

  waterDrops.forEach(function(drop) {
    drawWaterDrop(drop.x, drop.y, 8);
  });
}

function drawCloud(x, y) {
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.arc(x + 30, y - 12, 34, 0, Math.PI * 2);
  ctx.arc(x + 68, y, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaterDrop(x, y, size) {
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(x, y + size, size, 0, Math.PI * 2);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.lineTo(x + size, y + size);
  ctx.closePath();
  ctx.fill();
}

function drawPlatforms() {
  platforms.forEach(function(platform) {
    ctx.fillStyle = COLORS.deepTeal;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(platform.x, platform.y, platform.w, 5);
  });
}

function drawObstacles() {
  obstacles.forEach(function(obstacle) {
    ctx.fillStyle = COLORS.burntOrange;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);

    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 8);

    ctx.strokeStyle = COLORS.navy;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 12, obstacle.y + 20);
    ctx.lineTo(obstacle.x + 30, obstacle.y + 38);
    ctx.lineTo(obstacle.x + 22, obstacle.y + 58);
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = "16px Arial";
    ctx.fillText("HP " + obstacle.hp, obstacle.x + 10, obstacle.y + 38);
  });
}

function drawPipe() {
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);

  ctx.fillStyle = COLORS.deepTeal;
  ctx.fillRect(pipe.x + 8, pipe.y + 8, pipe.w - 16, pipe.h - 16);

  ctx.fillStyle = COLORS.cleanWater;
  ctx.fillRect(pipe.x + 16, pipe.y + 16, pipe.w - 32, pipe.h - 32);

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 4;
  ctx.strokeRect(pipe.x, pipe.y, pipe.w, pipe.h);

  ctx.fillStyle = COLORS.white;
  ctx.font = "15px Arial";
  ctx.fillText("PIPE", pipe.x + 8, pipe.y - 10);
}

function drawGerms() {
  germs.forEach(function(germ) {
    ctx.fillStyle = COLORS.deepTeal;
    ctx.beginPath();
    ctx.arc(germ.x + germ.w / 2, germ.y + germ.h / 2, germ.w / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.navy;
    ctx.lineWidth = 3;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const cx = germ.x + germ.w / 2;
      const cy = germ.y + germ.h / 2;
      const startX = cx + Math.cos(angle) * 18;
      const startY = cy + Math.sin(angle) * 18;
      const endX = cx + Math.cos(angle) * 27;
      const endY = cy + Math.sin(angle) * 27;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.white;
    ctx.font = "11px Arial";
    ctx.fillText("GERM", germ.x + 3, germ.y + 24);
  });
}

function drawPlayer() {
  if (invincibleTimer > 0 && Math.floor(invincibleTimer / 8) % 2 === 0) {
    return;
  }

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = COLORS.softPeach;
  ctx.beginPath();
  ctx.arc(player.x + player.w / 2, player.y - 8, 14, 0, Math.PI * 2);
  ctx.fill();

  drawJerryCan(player.x - 12, player.y + 12, 16, 24);

  ctx.fillStyle = COLORS.yellow;

  if (player.facing === 1) {
    ctx.fillRect(player.x + player.w - 8, player.y + 16, 8, 8);
  } else {
    ctx.fillRect(player.x, player.y + 16, 8, 8);
  }
}

// ==================================================
// 15. CHARITY: WATER-INSPIRED JERRY CAN ICON
// ==================================================

function drawJerryCan(x, y, w, h) {
  ctx.fillStyle = COLORS.yellow;
  roundRect(x, y, w, h, 3, true, false);

  ctx.fillStyle = COLORS.white;
  roundRect(x + w * 0.28, y + h * 0.08, w * 0.44, h * 0.13, 2, true, false);

  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.28);
  ctx.lineTo(x + w * 0.50, y + h * 0.55);
  ctx.lineTo(x + w * 0.75, y + h * 0.28);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.78);
  ctx.lineTo(x + w * 0.50, y + h * 0.55);
  ctx.lineTo(x + w * 0.75, y + h * 0.78);
  ctx.stroke();
}

function roundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// ==================================================
// 16. USER INTERFACE
// ==================================================

function drawUI() {
  const time = Math.floor((Date.now() - startTime) / 1000);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(14, 12, 425, 44);

  drawJerryCan(26, 20, 20, 28);

  ctx.fillStyle = COLORS.black;
  ctx.font = "22px Arial";
  ctx.fillText("charity: water", 58, 41);

  ctx.font = "18px Arial";
  ctx.fillText("Score: " + score, 205, 41);
  ctx.fillText("Lives: " + lives, 310, 41);
  ctx.fillText("Time: " + time, 375, 41);

  ctx.fillStyle = COLORS.navy;
  ctx.font = "16px Arial";
  ctx.fillText("Break barriers. Avoid contamination. Restore clean water.", 505, 41);
}

function drawCenterMessage(title, subtitle) {
  ctx.fillStyle = "rgba(28, 43, 64, 0.88)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(280, 175, 400, 170);

  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 5;
  ctx.strokeRect(280, 175, 400, 170);

  drawJerryCan(315, 212, 42, 62);

  ctx.fillStyle = COLORS.black;
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, WIDTH / 2 + 40, HEIGHT / 2 - 18);

  ctx.font = "22px Arial";
  ctx.fillText(subtitle, WIDTH / 2 + 40, HEIGHT / 2 + 28);

  ctx.textAlign = "left";
}
