'use strict';

/* ============================================================
   GALAXIA DE FLORES AMARILLAS — script.js
   Motor con proyección 3D completa (rotación en todos los ejes)
   ============================================================
   Parámetros configurables en CONFIG.
   ============================================================ */

/* ──────────────────────────────────────────────────────────────
   0. CONFIGURACIÓN GLOBAL
   ────────────────────────────────────────────────────────────── */
const CONFIG = {
  // Estrellas de fondo
  STAR_COUNT:          350,
  STAR_MAX_SIZE:       2.5,

  // Galaxia 3D
  GALAXY_SCALE:        0.40,    // radio máximo respecto a la pantalla menor
  SPIRAL_ARMS:         3,
  ARM_TIGHTNESS:       4.2,
  FOV:                 900,     // campo de visión (perspectiva)

  // Rotación automática (eje Y = spin horizontal)
  AUTO_SPIN:           0.00014, // rad/frame

  // Inclinación inicial de la galaxia (eje X)
  INIT_TILT_X:         0.42,    // rad — ángulo de visión inicial (~24°)

  // Drag — sensibilidades
  DRAG_SENS_X:         0.0028,  // horizontal → rotY
  DRAG_SENS_Y:         0.0022,  // vertical   → rotX
  TILT_CLAMP:          1.45,    // límite de inclinación (rad) para no voltear la galaxia

  // Inercia post-drag
  INERTIA_FRICTION:    0.94,    // factor de frenado (0-1)
  INERTIA_MIN:         0.00004, // por debajo de esto se considera 0

  // Flores en la galaxia
  FLOWER_COUNT:        72,
  FLOWER_MIN_SIZE:     6,
  FLOWER_MAX_SIZE:     28,
  FLOWER_SELF_SPIN:    0.0008,

  // Flores de primer plano (fuera de la galaxia)
  FG_FLOWER_COUNT:     7,
  FG_MIN_SIZE:         34,
  FG_MAX_SIZE:         52,

  // Partículas
  PARTICLE_COUNT:      200,
  PARTICLE_SPEED:      0.20,

  // Núcleo
  NUCLEUS_RADIUS:      36,
  RING_RADIUS:         70,
  RING_ROTATION:       0.0006,
  PULSE_SPEED:         0.018,

  // Parallax (solo cuando NO se está arrastrando)
  PARALLAX_STR:        0.016,

  // Animación de entrada
  INTRO_STARS_END:     1200,
  INTRO_PARTICLES_END: 2200,
  INTRO_FLOWERS_END:   4000,
  INTRO_TEXT_DELAY:    4800,

  // Tap vs drag
  DRAG_THRESHOLD:      8,   // px mínimos para considerar drag
  TAP_MAX_MS:          220, // ms máximos para considerar tap
};

/* ──────────────────────────────────────────────────────────────
   1. DOM Y CONTEXTOS
   ────────────────────────────────────────────────────────────── */
const bgCanvas   = document.getElementById('galaxyCanvas');
const fgCanvas   = document.getElementById('flowerCanvas');
const bgCtx      = bgCanvas.getContext('2d');
const fgCtx      = fgCanvas.getContext('2d');
const titleEl    = document.getElementById('mainTitle');
const clickLayer = document.getElementById('clickParticles');

let W = 0, H = 0, CX = 0, CY = 0;

/* ──────────────────────────────────────────────────────────────
   2. ESTADO GLOBAL
   ────────────────────────────────────────────────────────────── */

// Rotación 3D de la galaxia
let rotX = CONFIG.INIT_TILT_X;   // inclinación (arrastrar arriba/abajo)
let rotY = 0;                     // giro    (arrastrar izquierda/derecha)

// Anillo y núcleo
let ringAngle  = 0;
let pulsePhase = 0;

// Intro
let introTime = 0, startTime = null;

// Mouse (parallax pasivo)
let mouse = { x: 0, y: 0 };

// Flags
let isMobile = false;
let isRunning = true;

// Estado de arrastre
let drag = {
  active:    false,
  moved:     false,
  startX:    0, startY:    0,
  lastX:     0, lastY:     0,
  startTime: 0,
  inertiaX:  0,   // velocidad angular en Y (giro) — horizontal
  inertiaY:  0,   // velocidad angular en X (tilt) — vertical
};

// Elementos
let stars = [], flowers = [], fgFlowers = [], particles = [];

/* ──────────────────────────────────────────────────────────────
   3. UTILIDADES MATEMÁTICAS
   ────────────────────────────────────────────────────────────── */
const rand    = (a, b)  => a + Math.random() * (b - a);
const randInt = (a, b)  => Math.floor(rand(a, b + 1));
const lerp    = (a, b, t) => a + (b - a) * t;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TAU     = Math.PI * 2;

/**
 * Proyecta un punto 3D al plano de pantalla aplicando las
 * rotaciones actuales rotX (eje X) y rotY (eje Y), más parallax.
 * Devuelve {sx, sy, scale, depth} para uso en el canvas.
 */
function project3D(x3, y3, z3) {
  // ── Rotación alrededor del eje Y (giro horizontal) ──
  const cosY = Math.cos(rotY + mouse.x * CONFIG.PARALLAX_STR);
  const sinY = Math.sin(rotY + mouse.x * CONFIG.PARALLAX_STR);
  const rx   =  x3 * cosY + z3 * sinY;
  const ry1  =  y3;
  const rz   = -x3 * sinY + z3 * cosY;

  // ── Rotación alrededor del eje X (inclinación vertical) ──
  const cosX = Math.cos(rotX + mouse.y * CONFIG.PARALLAX_STR);
  const sinX = Math.sin(rotX + mouse.y * CONFIG.PARALLAX_STR);
  const ry   =  ry1 * cosX - rz * sinX;
  const rz2  =  ry1 * sinX + rz * cosX;

  // ── Proyección perspectiva ──
  const fov   = CONFIG.FOV;
  const denom = fov + rz2;
  const scale = denom > 10 ? fov / denom : 0.01;

  return {
    sx:    rx * scale,
    sy:    ry * scale,
    scale,
    depth: rz2,   // Z relativo (positivo = lejos)
  };
}

/** Genera un punto 3D en un brazo espiral (galaxia en plano XZ, Y=0) */
function spiralPoint3D(arm, t) {
  const armAngle = (TAU / CONFIG.SPIRAL_ARMS) * arm;
  const angle    = armAngle + t * CONFIG.ARM_TIGHTNESS;
  const maxR     = Math.min(W, H) * CONFIG.GALAXY_SCALE;
  const radius   = Math.pow(t, 0.7) * maxR;
  const wobble   = rand(-0.18, 0.18) * (1 - t * 0.5);
  const wAngle   = angle + wobble;
  const wRadius  = radius * rand(0.82, 1.18);
  return {
    x: Math.cos(wAngle) * wRadius,
    y: 0,
    z: Math.sin(wAngle) * wRadius,
  };
}

/* ──────────────────────────────────────────────────────────────
   4. GIRASOL — dibujo puro
   ────────────────────────────────────────────────────────────── */
function drawSunflower(ctx, x, y, r, rot, alpha, glow) {
  if (alpha <= 0.01 || r < 1) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);

  const petalCount = 14;
  const petalLen   = r * 0.85;
  const diskR      = r * 0.42;

  // Halo
  if (glow && r > 7) {
    const g = ctx.createRadialGradient(0, 0, diskR * 0.5, 0, 0, r * 2.2);
    g.addColorStop(0,   `rgba(255,220,50,${0.22 * alpha})`);
    g.addColorStop(0.5, `rgba(255,180,10,${0.08 * alpha})`);
    g.addColorStop(1,   'rgba(255,140,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.2, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Pétalos
  for (let i = 0; i < petalCount; i++) {
    ctx.save();
    ctx.rotate((TAU / petalCount) * i);
    ctx.beginPath();
    ctx.ellipse(petalLen * 0.6, 0, petalLen * 0.5, petalLen * 0.22, 0, 0, TAU);
    const pg = ctx.createRadialGradient(petalLen * 0.3, 0, 0, petalLen * 0.6, 0, petalLen * 0.5);
    pg.addColorStop(0,   '#FFE033');
    pg.addColorStop(0.5, '#FFC20A');
    pg.addColorStop(1,   '#E88F00');
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();
  }

  // Disco
  const dg = ctx.createRadialGradient(0, 0, 0, 0, 0, diskR);
  dg.addColorStop(0,    '#6B3A00');
  dg.addColorStop(0.4,  '#4A2800');
  dg.addColorStop(0.85, '#2E1800');
  dg.addColorStop(1,    '#1A0D00');
  ctx.beginPath();
  ctx.arc(0, 0, diskR, 0, TAU);
  ctx.fillStyle = dg;
  ctx.fill();

  // Semillas
  if (r > 10) {
    const total = Math.floor(r * 0.18) * 5;
    ctx.fillStyle = 'rgba(180,100,20,0.6)';
    for (let si = 0; si < total; si++) {
      const sa  = si * 2.399;
      const sr  = Math.sqrt(si / total) * diskR * 0.88;
      const dot = Math.max(0.8, r * 0.025);
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, dot, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}

/* ──────────────────────────────────────────────────────────────
   5. INICIALIZACIÓN DE ELEMENTOS
   ────────────────────────────────────────────────────────────── */
function initStars() {
  stars = [];
  const n = isMobile ? Math.floor(CONFIG.STAR_COUNT * 0.65) : CONFIG.STAR_COUNT;
  for (let i = 0; i < n; i++) {
    stars.push({
      x:            Math.random() * W,
      y:            Math.random() * H,
      r:            rand(0.3, CONFIG.STAR_MAX_SIZE),
      brightness:   rand(0.3, 1.0),
      twinkleSpeed: rand(0.005, 0.025),
      twinklePhase: Math.random() * TAU,
      twinkleAmp:   rand(0.15, 0.5),
    });
  }
}

function initParticles() {
  particles = [];
  const n = isMobile ? Math.floor(CONFIG.PARTICLE_COUNT * 0.5) : CONFIG.PARTICLE_COUNT;
  for (let i = 0; i < n; i++) {
    const arm = randInt(0, CONFIG.SPIRAL_ARMS - 1);
    const t   = rand(0.03, 1.0);
    const pt  = spiralPoint3D(arm, t);
    const isYellow = Math.random() < 0.6;
    particles.push({
      x3: pt.x, y3: pt.y, z3: pt.z,
      offX: 0, offY: 0, offZ: 0,
      vx: rand(-CONFIG.PARTICLE_SPEED, CONFIG.PARTICLE_SPEED),
      vy: 0,
      vz: rand(-CONFIG.PARTICLE_SPEED, CONFIG.PARTICLE_SPEED),
      r:    rand(0.5, 2.8),
      color: isYellow
        ? `hsl(${rand(38,58)},${rand(80,100)}%,${rand(70,95)}%)`
        : `hsl(45,0%,${rand(80,100)}%)`,
      alpha:      rand(0.3, 0.9),
      alphaSpeed: rand(0.003, 0.015),
      alphaPhase: Math.random() * TAU,
    });
  }
}

function initFlowers() {
  flowers = [];
  for (let i = 0; i < CONFIG.FLOWER_COUNT; i++) {
    const arm = i % CONFIG.SPIRAL_ARMS;
    const t   = rand(0.04, 1.0);
    const pt  = spiralPoint3D(arm, t);

    const tNorm  = 1 - t;
    const size   = lerp(CONFIG.FLOWER_MIN_SIZE, CONFIG.FLOWER_MAX_SIZE,
                        Math.pow(tNorm, 1.6)) * rand(0.75, 1.25);
    const glow   = size > 14 || Math.random() < 0.3;

    flowers.push({
      x3: pt.x, y3: pt.y, z3: pt.z,
      size, glow,
      rot:         rand(0, TAU),
      spinSpeed:   rand(-CONFIG.FLOWER_SELF_SPIN, CONFIG.FLOWER_SELF_SPIN),
      enterDelay:  rand(0, 1),
      enterProgress: 0,
      clickScale:  1,
      clickAlpha:  0,
    });
  }
}

function initFgFlowers() {
  fgFlowers = [];
  const maxR = Math.min(W, H) * CONFIG.GALAXY_SCALE;
  for (let i = 0; i < CONFIG.FG_FLOWER_COUNT; i++) {
    const angle = rand(0, TAU);
    const dist  = rand(0.55, 0.95) * maxR;
    fgFlowers.push({
      x3:        Math.cos(angle) * dist,
      y3:        0,
      z3:        Math.sin(angle) * dist,
      size:      rand(CONFIG.FG_MIN_SIZE, CONFIG.FG_MAX_SIZE),
      rot:       rand(0, TAU),
      spinSpeed: rand(-CONFIG.FLOWER_SELF_SPIN * 0.5, CONFIG.FLOWER_SELF_SPIN * 0.5),
      alpha:     rand(0.6, 0.9),
      enterDelay: rand(0.5, 1),
    });
  }
}

/* ──────────────────────────────────────────────────────────────
   6. DIBUJO
   ────────────────────────────────────────────────────────────── */
function drawBackground() {
  bgCtx.clearRect(0, 0, W, H);
  const bg = bgCtx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.75);
  bg.addColorStop(0,   '#12100A');
  bg.addColorStop(0.4, '#090807');
  bg.addColorStop(1,   '#000000');
  bgCtx.fillStyle = bg;
  bgCtx.fillRect(0, 0, W, H);
}

function drawStars() {
  const progress = clamp(introTime / CONFIG.INTRO_STARS_END, 0, 1);
  for (const s of stars) {
    s.twinklePhase += s.twinkleSpeed;
    const tw = 1 - s.twinkleAmp * (0.5 + 0.5 * Math.sin(s.twinklePhase));
    const a  = s.brightness * tw * progress;

    bgCtx.beginPath();
    bgCtx.arc(s.x, s.y, s.r, 0, TAU);
    bgCtx.fillStyle = `rgba(255,252,240,${a})`;
    bgCtx.fill();

    if (s.r > 1.5 && Math.sin(s.twinklePhase) > 0.65) {
      bgCtx.save();
      bgCtx.globalAlpha = a * 0.5;
      bgCtx.strokeStyle = 'rgba(255,245,200,0.8)';
      bgCtx.lineWidth   = 0.5;
      const fl = s.r * 3;
      bgCtx.beginPath();
      bgCtx.moveTo(s.x - fl, s.y); bgCtx.lineTo(s.x + fl, s.y);
      bgCtx.moveTo(s.x, s.y - fl); bgCtx.lineTo(s.x, s.y + fl);
      bgCtx.stroke();
      bgCtx.restore();
    }
  }
}

function drawGalaxyGlow() {
  const maxR  = Math.min(W, H) * CONFIG.GALAXY_SCALE;
  const p     = clamp(introTime / 3000, 0, 1);

  // La galaxia ya no está alineada con el plano XY — dibujamos una
  // elipse proporcional al coseno de la inclinación visual
  const tiltCos = Math.abs(Math.cos(rotX));
  bgCtx.save();
  bgCtx.translate(CX, CY);
  bgCtx.scale(1, tiltCos * 0.8 + 0.2);   // aplana el glow según la vista

  const glow = bgCtx.createRadialGradient(0, 0, 0, 0, 0, maxR * 1.3);
  glow.addColorStop(0,   `rgba(255,220,60,${0.14 * p})`);
  glow.addColorStop(0.35,`rgba(255,180,20,${0.08 * p})`);
  glow.addColorStop(0.7, `rgba(200,130,10,${0.04 * p})`);
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  bgCtx.beginPath();
  bgCtx.arc(0, 0, maxR * 1.3, 0, TAU);
  bgCtx.fillStyle = glow;
  bgCtx.fill();
  bgCtx.restore();
}

function drawParticles() {
  const progress = clamp(
    (introTime - CONFIG.INTRO_STARS_END) / (CONFIG.INTRO_PARTICLES_END - CONFIG.INTRO_STARS_END),
    0, 1
  );

  for (const p of particles) {
    p.offX += p.vx; p.offX *= 0.998;
    p.offZ += p.vz; p.offZ *= 0.998;
    p.alphaPhase += p.alphaSpeed;

    const proj = project3D(p.x3 + p.offX, p.y3 + p.offY, p.z3 + p.offZ);
    const a = p.alpha * (0.6 + 0.4 * Math.sin(p.alphaPhase)) * progress * proj.scale;

    bgCtx.beginPath();
    bgCtx.arc(CX + proj.sx, CY + proj.sy, Math.max(0.3, p.r * proj.scale), 0, TAU);
    bgCtx.fillStyle = p.color;
    bgCtx.globalAlpha = clamp(a, 0, 1);
    bgCtx.fill();
    bgCtx.globalAlpha = 1;
  }
}

function drawNucleus() {
  const pulse  = 1 + 0.06 * Math.sin(pulsePhase);
  const nR     = CONFIG.NUCLEUS_RADIUS * pulse;
  const rR     = CONFIG.RING_RADIUS;
  const introP = clamp(introTime / CONFIG.INTRO_FLOWERS_END, 0, 1);

  // Halo exterior
  const outerGlow = bgCtx.createRadialGradient(0, 0, rR * 0.5, 0, 0, rR * 2.8);
  outerGlow.addColorStop(0,   `rgba(255,220,50,${0.22 * introP})`);
  outerGlow.addColorStop(0.4, `rgba(255,170,20,${0.12 * introP})`);
  outerGlow.addColorStop(1,   'rgba(0,0,0,0)');
  bgCtx.beginPath();
  bgCtx.arc(0, 0, rR * 2.8, 0, TAU);
  bgCtx.fillStyle = outerGlow;
  bgCtx.fill();

  // Núcleo
  const cg = bgCtx.createRadialGradient(0, 0, 0, 0, 0, nR);
  cg.addColorStop(0,   '#000000');
  cg.addColorStop(0.7, '#0A0600');
  cg.addColorStop(1,   '#1A0E00');
  bgCtx.beginPath();
  bgCtx.arc(0, 0, nR, 0, TAU);
  bgCtx.fillStyle = cg;
  bgCtx.fill();

  // Borde del núcleo
  bgCtx.save();
  bgCtx.beginPath();
  bgCtx.arc(0, 0, nR, 0, TAU);
  bgCtx.strokeStyle = `rgba(255,210,30,${0.7 * introP})`;
  bgCtx.lineWidth   = 2 * pulse;
  bgCtx.shadowColor = 'rgba(255,180,10,0.9)';
  bgCtx.shadowBlur  = 18 * pulse;
  bgCtx.stroke();
  bgCtx.restore();

  // Anillo orbital — se inclina con rotX
  bgCtx.save();
  bgCtx.rotate(ringAngle);
  const tiltCos = Math.cos(rotX);  // aplana el anillo según la vista
  bgCtx.scale(1, Math.abs(tiltCos) * 0.65 + 0.05);

  const rg = bgCtx.createLinearGradient(-rR, 0, rR, 0);
  rg.addColorStop(0,    'rgba(255,230,60,0)');
  rg.addColorStop(0.25, `rgba(255,220,40,${0.85 * introP})`);
  rg.addColorStop(0.5,  `rgba(255,240,80,${introP})`);
  rg.addColorStop(0.75, `rgba(255,200,20,${0.85 * introP})`);
  rg.addColorStop(1,    'rgba(255,180,10,0)');

  bgCtx.beginPath();
  bgCtx.arc(0, 0, rR, 0, TAU);
  bgCtx.strokeStyle = rg;
  bgCtx.lineWidth = 6 * pulse;
  bgCtx.shadowColor = 'rgba(255,200,0,0.8)';
  bgCtx.shadowBlur  = 22;
  bgCtx.stroke();

  bgCtx.beginPath();
  bgCtx.arc(0, 0, rR * 1.22, 0, TAU);
  bgCtx.strokeStyle = `rgba(255,200,40,${0.25 * introP})`;
  bgCtx.lineWidth   = 1.5;
  bgCtx.shadowBlur  = 8;
  bgCtx.stroke();
  bgCtx.restore();
}

function drawGalaxyFlowers() {
  const flowerProgress = clamp(
    (introTime - CONFIG.INTRO_PARTICLES_END) / (CONFIG.INTRO_FLOWERS_END - CONFIG.INTRO_PARTICLES_END),
    0, 1
  );

  // Ordenar por profundidad en cada frame para que las flores más
  // lejanas se dibujen primero (painter's algorithm)
  const sorted = flowers.map(f => {
    const proj = project3D(f.x3, f.y3, f.z3);
    return { f, proj };
  }).sort((a, b) => b.proj.depth - a.proj.depth);

  for (const { f, proj } of sorted) {
    const localP = clamp((flowerProgress - f.enterDelay * 0.4) / 0.6, 0, 1);
    if (localP <= 0) continue;

    f.rot += f.spinSpeed;

    const screenX = CX + proj.sx;
    const screenY = CY + proj.sy;

    // Tamaño basado en la escala de perspectiva
    const entryScale = 0.3 + 0.7 * localP;
    const finalSize  = f.size * proj.scale * entryScale * 1.2;

    // Brillo proporcional a la cercanía (prof. negativa = más cerca)
    const depthFade = clamp(1 - proj.depth / (Math.min(W, H) * CONFIG.GALAXY_SCALE * 1.5), 0.2, 1);
    const alpha     = depthFade * localP;

    bgCtx.save();
    drawSunflower(bgCtx, screenX, screenY, finalSize, f.rot, alpha, f.glow);
    bgCtx.restore();

    // Efecto destello post-click
    if (f.clickAlpha > 0) {
      bgCtx.save();
      bgCtx.globalAlpha = f.clickAlpha;
      const cg = bgCtx.createRadialGradient(screenX, screenY, 0, screenX, screenY, finalSize * 2.5);
      cg.addColorStop(0,   'rgba(255,230,60,0.8)');
      cg.addColorStop(1,   'rgba(255,200,0,0)');
      bgCtx.beginPath();
      bgCtx.arc(screenX, screenY, finalSize * 2.5, 0, TAU);
      bgCtx.fillStyle = cg;
      bgCtx.fill();
      bgCtx.restore();
      f.clickAlpha -= 0.025;
    }
    if (f.clickScale > 1) f.clickScale = lerp(f.clickScale, 1, 0.08);
  }
}

function drawForegroundFlowers() {
  fgCtx.clearRect(0, 0, W, H);
  const fp = clamp(
    (introTime - CONFIG.INTRO_PARTICLES_END) / (CONFIG.INTRO_FLOWERS_END - CONFIG.INTRO_PARTICLES_END),
    0, 1
  );

  for (const f of fgFlowers) {
    const localP = clamp((fp - f.enterDelay * 0.3) / 0.7, 0, 1);
    if (localP <= 0) continue;

    f.rot += f.spinSpeed;
    const proj    = project3D(f.x3, f.y3, f.z3);
    const entryS  = 0.2 + 0.8 * localP;
    const size    = f.size * proj.scale * entryS * 1.6;

    drawSunflower(fgCtx, CX + proj.sx, CY + proj.sy, size, f.rot, f.alpha * localP, true);
  }
}

/* ──────────────────────────────────────────────────────────────
   7. LOOP PRINCIPAL
   ────────────────────────────────────────────────────────────── */
function render(ts) {
  if (!isRunning) return;
  if (!startTime) startTime = ts;
  introTime = ts - startTime;

  // ── Inercia post-drag ──
  if (Math.abs(drag.inertiaX) > CONFIG.INERTIA_MIN) {
    rotY += drag.inertiaX;
    drag.inertiaX *= CONFIG.INERTIA_FRICTION;
  } else {
    drag.inertiaX = 0;
    rotY += CONFIG.AUTO_SPIN;   // rotación automática solo cuando no hay inercia
  }

  if (Math.abs(drag.inertiaY) > CONFIG.INERTIA_MIN) {
    rotX  = clamp(rotX + drag.inertiaY, -CONFIG.TILT_CLAMP, CONFIG.TILT_CLAMP);
    drag.inertiaY *= CONFIG.INERTIA_FRICTION;
  } else {
    drag.inertiaY = 0;
  }

  ringAngle  += CONFIG.RING_ROTATION;
  pulsePhase += CONFIG.PULSE_SPEED;

  // ── Capa de fondo ──
  drawBackground();
  drawGalaxyGlow();
  drawStars();
  drawParticles();

  bgCtx.save();
  bgCtx.translate(CX, CY);
  drawNucleus();
  bgCtx.restore();

  drawGalaxyFlowers();

  // ── Primer plano ──
  drawForegroundFlowers();

  // Texto
  if (introTime > CONFIG.INTRO_TEXT_DELAY && !titleEl.classList.contains('visible')) {
    titleEl.classList.add('visible');
  }

  requestAnimationFrame(render);
}

/* ──────────────────────────────────────────────────────────────
   8. REDIMENSIONADO
   ────────────────────────────────────────────────────────────── */
function resize() {
  W  = window.innerWidth;
  H  = window.innerHeight;
  CX = W / 2;
  CY = H / 2;
  bgCanvas.width  = fgCanvas.width  = W;
  bgCanvas.height = fgCanvas.height = H;
  isMobile = W < 600 || navigator.maxTouchPoints > 0;
  initStars();
  initFlowers();
  initFgFlowers();
  initParticles();
}

/* ──────────────────────────────────────────────────────────────
   9. INTERACCIÓN — DRAG EN TODOS LOS EJES
   ────────────────────────────────────────────────────────────── */

function startDrag(clientX, clientY) {
  drag.active    = true;
  drag.moved     = false;
  drag.startX    = drag.lastX = clientX;
  drag.startY    = drag.lastY = clientY;
  drag.startTime = performance.now();
  drag.inertiaX  = 0;
  drag.inertiaY  = 0;
  fgCanvas.style.cursor = 'grabbing';
}

function moveDrag(clientX, clientY) {
  const dx = clientX - drag.lastX;
  const dy = clientY - drag.lastY;

  // Girar alrededor de Y (horizontal) y X (vertical)
  const velX = dx * CONFIG.DRAG_SENS_X;
  const velY = dy * CONFIG.DRAG_SENS_Y;

  rotY          += velX;
  rotX           = clamp(rotX + velY, -CONFIG.TILT_CLAMP, CONFIG.TILT_CLAMP);
  drag.inertiaX  = velX;
  drag.inertiaY  = velY;

  drag.lastX = clientX;
  drag.lastY = clientY;

  if (!drag.moved) {
    const d = Math.hypot(clientX - drag.startX, clientY - drag.startY);
    if (d > CONFIG.DRAG_THRESHOLD) drag.moved = true;
  }

  // Parallax durante drag no actúa (solo se usa la rotación)
  mouse.x = 0;
  mouse.y = 0;
}

function endDrag(clientX, clientY) {
  if (!drag.active) return;
  drag.active = false;
  fgCanvas.style.cursor = 'grab';

  const elapsed = performance.now() - drag.startTime;
  if (!drag.moved && elapsed < CONFIG.TAP_MAX_MS) {
    activateTap(clientX, clientY);
  }
}

// ── Mouse ──
function handleMouseDown(e)  { startDrag(e.clientX, e.clientY); }
function handleMouseMove(e) {
  if (drag.active) {
    moveDrag(e.clientX, e.clientY);
  } else {
    mouse.x = (e.clientX / W - 0.5) * 2;
    mouse.y = (e.clientY / H - 0.5) * 2;
  }
}
function handleMouseUp(e)   { endDrag(e.clientX, e.clientY); }
function handleMouseLeave() {
  drag.active = false;
  fgCanvas.style.cursor = 'grab';
  mouse.x *= 0.5;
  mouse.y *= 0.5;
}

// ── Touch ──
function handleTouchStart(e) {
  const t = e.touches[0];
  startDrag(t.clientX, t.clientY);
}
function handleTouchMove(e) {
  e.preventDefault();
  const t = e.touches[0];
  moveDrag(t.clientX, t.clientY);
}
function handleTouchEnd(e) {
  const t = e.changedTouches[0];
  endDrag(t.clientX, t.clientY);
}

/* ── Tap: flores + destellos ── */
function activateTap(cx, cy) {
  const f = findNearestFlower(cx, cy);
  if (f) { f.clickScale = 1.45; f.clickAlpha = 0.75; }
  spawnClickSparks(cx, cy);
}

function findNearestFlower(cx, cy) {
  let best = null, bestD = Infinity;
  for (const f of flowers) {
    const proj = project3D(f.x3, f.y3, f.z3);
    const sx   = CX + proj.sx;
    const sy   = CY + proj.sy;
    const d    = Math.hypot(cx - sx, cy - sy);
    const hitR = f.size * proj.scale * 3;
    if (d < bestD && d < hitR) { bestD = d; best = f; }
  }
  return best;
}

function spawnClickSparks(cx, cy) {
  for (let i = 0; i < 14; i++) {
    const a = rand(0, TAU), dist = rand(20, 80);
    const sp = document.createElement('div');
    sp.className = 'click-spark';
    const sz = rand(3, 8);
    sp.style.cssText = `
      left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;
      background:hsl(${rand(40,55)},100%,${rand(65,85)}%);
      --tx:${Math.cos(a)*dist}px;--ty:${Math.sin(a)*dist}px;
      --dur:${rand(0.5,1.1).toFixed(2)}s;
      box-shadow:0 0 ${sz*2}px rgba(255,200,0,0.8);
    `;
    clickLayer.appendChild(sp);
    setTimeout(() => sp.remove(), 1200);
  }
}

/* ──────────────────────────────────────────────────────────────
   10. ARRANQUE
   ────────────────────────────────────────────────────────────── */
function init() {
  resize();
  fgCanvas.style.cursor = 'grab';

  window.addEventListener('resize',       resize,           { passive: true });
  window.addEventListener('mousemove',    handleMouseMove,  { passive: true });
  window.addEventListener('mouseup',      handleMouseUp,    { passive: true });
  window.addEventListener('mouseleave',   handleMouseLeave, { passive: true });
  fgCanvas.addEventListener('mousedown',  handleMouseDown,  { passive: true });

  fgCanvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  fgCanvas.addEventListener('touchmove',  handleTouchMove,  { passive: false });
  fgCanvas.addEventListener('touchend',   handleTouchEnd,   { passive: true });

  requestAnimationFrame(render);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
