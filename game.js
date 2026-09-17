const keys = {};
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const game = {
  state: 'ready',
  level: 1,
  score: 0,
  armor: 100,
  timeLeft: 60,
  pulse: 100,
  last: 0,
  cooldown: 0,
  stars: [],
  seeds: [],
  monsters: [],
  particles: [],
  player: { x: W / 2, y: H / 2, r: 15, speed: 250, invulnerable: 0 }
};

function buildLevel(level) {
  const world = 1 + Math.floor((level - 1) / 4);
  game.level = level;
  game.score = 0;
  game.timeLeft = Math.max(28, 70 - level * 1.6);
  game.armor = 100;
  game.pulse = 100;
  game.cooldown = 0;
  game.stars = Array.from({ length: 160 }, () => ({
    x: rand(0, W),
    y: rand(0, H),
    r: rand(0.8, 2.6),
    alpha: rand(0.2, 0.8),
    drift: rand(0, 10)
  }));

  game.seeds = Array.from({ length: 12 }, () => ({
    x: rand(50, W - 50),
    y: rand(50, H - 50),
    pulse: rand(0, 10)
  }));

  const count = 4 + level * 3;
  game.monsters = Array.from({ length: count }, () => ({
    x: rand(40, W - 40),
    y: rand(40, H - 40),
    r: rand(12, 22),
    vx: rand(-55, 55),
    vy: rand(-55, 55),
    boss: false,
    phase: rand(0, 10)
  }));

  if (level % 4 === 0) {
    const boss = game.monsters[0];
    boss.boss = true;
    boss.r = 32;
    boss.vx *= 1.5;
    boss.vy *= 1.5;
  }

  game.player.x = W / 2;
  game.player.y = H / 2;
  game.player.invulnerable = 0;

  document.getElementById('missionTitle').textContent = `Level ${level} · ${level % 4 === 0 ? 'Guardian' : 'First Light'}`;
  document.getElementById('levelDisplay').textContent = String(level);
  document.getElementById('timerDisplay').textContent = String(Math.ceil(game.timeLeft));
  document.getElementById('seedDisplay').textContent = '0';
  document.getElementById('armorDisplay').textContent = '100%';
}

function burst(x, y, color, count = 22) {
  for (let i = 0; i < count; i += 1) {
    game.particles.push({
      x,
      y,
      vx: rand(-180, 180),
      vy: rand(-180, 180),
      life: rand(0.3, 1),
      color
    });
  }
}

function startGameLoop() {
  game.state = 'playing';
  buildLevel(game.level);
}

function update(dt) {
  if (game.state !== 'playing') return;

  const p = game.player;
  let dx = 0;
  let dy = 0;

  if (keys.ArrowLeft || keys.a) dx -= 1;
  if (keys.ArrowRight || keys.d) dx += 1;
  if (keys.ArrowUp || keys.w) dy -= 1;
  if (keys.ArrowDown || keys.s) dy += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    p.x = clamp(p.x + (dx / len) * p.speed * dt, 18, W - 18);
    p.y = clamp(p.y + (dy / len) * p.speed * dt, 18, H - 18);
  }

  p.invulnerable = Math.max(0, p.invulnerable - dt);
  game.cooldown = Math.max(0, game.cooldown - dt);

  if (keys[' '] && game.pulse >= 35 && game.cooldown <= 0) {
    game.pulse -= 35;
    game.cooldown = 1.1;
    burst(p.x, p.y, '#86f7df', 30);
    game.monsters.forEach((m) => {
      const ax = m.x - p.x;
      const ay = m.y - p.y;
      const dist = Math.hypot(ax, ay) || 1;
      if (dist < 220) {
        m.vx += (ax / dist) * 120;
        m.vy += (ay / dist) * 120;
      }
    });
  }

  game.pulse = clamp(game.pulse + dt * 6, 0, 100);
  document.getElementById('armorDisplay').textContent = `${Math.round(game.pulse)}%`;

  game.seeds.forEach((seed) => {
    if (Math.hypot(p.x - seed.x, p.y - seed.y) < 25) {
      seed.x = rand(35, W - 35);
      seed.y = rand(35, H - 35);
      game.score += 1;
      document.getElementById('seedDisplay').textContent = String(game.score);
      burst(seed.x, seed.y, '#ffd479', 18);
      if (game.score >= 12) {
        game.state = 'won';
        window.dispatchEvent(new CustomEvent('loom-win'));
      }
    }
  });

  game.monsters.forEach((m) => {
    const chase = game.level * 0.9 + (m.boss ? 18 : 0);
    const ax = p.x - m.x;
    const ay = p.y - m.y;
    const dist = Math.hypot(ax, ay) || 1;

    m.x += m.vx * dt + (ax / dist) * chase * dt;
    m.y += m.vy * dt + (ay / dist) * chase * dt;

    if (m.x < m.r || m.x > W - m.r) m.vx *= -1;
    if (m.y < m.r || m.y > H - m.r) m.vy *= -1;

    if (dist < m.r + p.r + 6 && p.invulnerable <= 0) {
      p.invulnerable = 0.9;
      game.pulse = clamp(game.pulse - (12 + (m.boss ? 18 : 0)), 0, 100);
      burst(p.x, p.y, '#ff6879', 24);
      if (game.pulse <= 0) {
        game.state = 'lost';
        window.dispatchEvent(new CustomEvent('loom-lost'));
      }
    }
  });

  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) game.particles.splice(i, 1);
  }

  game.timeLeft -= dt;
  document.getElementById('timerDisplay').textContent = String(Math.max(0, Math.ceil(game.timeLeft)));
  if (game.timeLeft <= 0 && game.state === 'playing') {
    game.state = 'lost';
    window.dispatchEvent(new CustomEvent('loom-lost'));
  }
}

function draw() {
  const theme = ['#86f7df', '#9d8cff', '#ff75b6', '#ff6879', '#ffd479'][Math.min(Math.floor((game.level - 1) / 4), 4)];
  const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.8);
  bg.addColorStop(0, `${theme}30`);
  bg.addColorStop(1, '#070913');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  game.stars.forEach((star) => {
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  game.seeds.forEach((seed) => {
    const pulse = 0.5 + Math.sin(seed.pulse) * 0.5;
    ctx.fillStyle = '#ffd479';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#ffd479';
    ctx.beginPath();
    ctx.arc(seed.x, seed.y, 7 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  game.monsters.forEach((m) => {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.atan2(m.vy, m.vx));
    ctx.fillStyle = m.boss ? '#45152c' : '#24152f';
    ctx.strokeStyle = m.boss ? '#ffd479' : '#ff6879';
    ctx.lineWidth = m.boss ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(-m.r, 0);
    ctx.quadraticCurveTo(-m.r, -m.r, m.r * 0.2, -m.r * 0.6);
    ctx.lineTo(m.r + 10, 0);
    ctx.lineTo(m.r * 0.2, m.r * 0.6);
    ctx.quadraticCurveTo(-m.r, m.r, -m.r, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  game.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  const p = game.player;
  ctx.fillStyle = 'rgba(134,247,223,0.18)';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 26 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.invulnerable > 0 ? '#ffd479' : '#86f7df';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#071817';
  ctx.beginPath();
  ctx.arc(p.x + 4, p.y - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function animationFrame(ts) {
  const dt = Math.min((ts - (game.last || ts)) / 1000, 0.033);
  game.last = ts;
  update(dt);
  draw();
  requestAnimationFrame(animationFrame);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === ' ') event.preventDefault();
  if (key === 'p') {
    window.dispatchEvent(new CustomEvent('loom-pause-toggle'));
  }
  keys[key] = true;
});
window.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});

window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('done');
  }, 1000);
  requestAnimationFrame(animationFrame);
});

window.gameAPI = {
  startGameLoop,
  buildLevel,
  game,
  burst
};
