// ===================== GAME =====================
const $ = id => document.getElementById(id);
const ARCADE_LINK = '<a class="arcade" href="../AlienGameLauncher/AlienGameLauncher.html">← Back to Alien Arcade</a>';
const ALIENS = ["blip", "jelly", "runner"];
// Difficulty is the alien you pick: hearts, enemy speed, boss toughness, how fast the goo flood chases you.
const DIFF = {
  blip:   { label: "Easy",   hearts: 5, enemy: 0.8,  bossHp: 3, chase: 0.85, par: 1.35 },
  jelly:  { label: "Normal", hearts: 4, enemy: 1,    bossHp: 4, chase: 1,    par: 1.15 },
  runner: { label: "Hard",   hearts: 3, enemy: 1.22, bossHp: 5, chase: 1.15, par: 1 },
};
const STYLE = [ // Oort Gate ice station, Jupiter storm, Mars lava, Earth forest
  { sky: ["#050817", "#14204f"], ground: "#4d5f93", dark: "#27335a", top: "#d8f0ff", edge: "#9fd3ff", plank: "#8fa9d8", accent: "#8fe9dc", music: [0, 3, 7, 10] },
  { sky: ["#1b1030", "#a3593a"], ground: "#8a5a3a", dark: "#4d2f22", top: "#f6cf94", edge: "#ffe1b0", plank: "#c99a6a", accent: "#ffb27a", music: [0, 5, 7, 12] },
  { sky: ["#170608", "#6b2018"], ground: "#7a3324", dark: "#401a13", top: "#ff9b6a", edge: "#ffc29e", plank: "#a8573c", accent: "#ff8a6a", music: [0, 3, 5, 7] },
  { sky: ["#0d2747", "#4fb0e8"], ground: "#5a3d2a", dark: "#33231a", top: "#5ccf5a", edge: "#a6f08f", plank: "#8b6a43", accent: "#7ce08a", music: [0, 4, 7, 11] },
];
// g walker · h heavy (BASH it) · f flyer · t turret · s gunship (hovers and shoots). Mars and Earth flyers are ships too, so they shoot.
const ENEMY = [
  { g: "Goo", h: "Chonk", f: "Probe", t: "Hover Pod", s: "Saucer" },
  { g: "Stalker", h: "Brute", f: "Shrieker", t: "Skitter", s: "Hover Pod" },
  { g: "Ripper", h: "Hover Tank", f: "Saucer", t: "Probe", s: "Interceptor" },
  { g: "Tripod", h: "Juggernaut", f: "Phase Saucer", t: "Nanite Trio", s: "Saucer" },
];
const SHIP_FLYERS = [false, false, true, true];

// ===================== SAVE =====================
const SAVE_KEY = "alien-starhop.v1";
let SAVE = { alien: "blip", sound: true, music: true, prog: {} };
try { SAVE = { ...SAVE, ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") }; } catch { /* storage can be off */ }
if (!ALIENS.includes(SAVE.alien)) SAVE.alien = "blip";
for (const a of ALIENS) SAVE.prog[a] = Array.from({ length: TOTAL_LEVELS }, (_, i) => ({ m: 0, t: 0, g: 0, ...((SAVE.prog[a] || [])[i] || {}) }));
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch { /* keep session progress */ } }
// Star bits: 1 = exit (boss: beaten), 2 = buddy freed (boss: kept half your health), 4/8/16 = Star Shards (boss: no damage, all three).
const starsOf = m => (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + ((m & 28) === 28 ? 1 : 0);
const unlocked = (a, i) => i === 0 || (SAVE.prog[a][i - 1].m & 1) > 0;
const worldStars = (a, w) => SAVE.prog[a].slice(w * LEVELS_PER_WORLD, (w + 1) * LEVELS_PER_WORLD).reduce((s, p) => s + starsOf(p.m), 0);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const levelName = i => `${Math.floor(i / LEVELS_PER_WORLD) + 1}-${i % LEVELS_PER_WORLD + 1}`;

// ===================== SOUND =====================
let actx = null, musicGain = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); musicGain = actx.createGain(); musicGain.gain.value = 0.05; musicGain.connect(actx.destination); } catch { /* no audio */ } }
  if (actx && actx.state === "suspended") actx.resume();
}
function tone(f, d = 0.12, type = "square", v = 0.06, delay = 0, slide = 0, out = null) {
  if (!actx || (!out && !SAVE.sound)) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(out || actx.destination); o.start(t); o.stop(t + d + 0.02);
}
const SFX = {
  jump: () => tone(380, 0.12, "square", 0.04, 0, 1.8), double: () => tone(520, 0.14, "triangle", 0.06, 0, 1.9), walljump: () => tone(460, 0.1, "square", 0.04, 0, 1.6),
  dash: () => tone(900, 0.16, "sawtooth", 0.03, 0, 0.4), pound: () => tone(160, 0.2, "square", 0.06, 0, 0.5), land: () => tone(120, 0.05, "triangle", 0.03),
  gem: () => { tone(988, 0.07, "square", 0.03); tone(1319, 0.1, "square", 0.03, 0.05); }, shard: () => [0, 4, 7, 12, 16].forEach((s, i) => tone(660 * 2 ** (s / 12), 0.16, "triangle", 0.06, i * 0.06)),
  stomp: () => tone(300, 0.12, "square", 0.05, 0, 0.5), hurt: () => tone(220, 0.25, "sawtooth", 0.06, 0, 0.5), die: () => tone(440, 0.5, "triangle", 0.07, 0, 0.25),
  spring: () => tone(260, 0.3, "triangle", 0.07, 0, 3), check: () => [0, 7, 12].forEach((s, i) => tone(523 * 2 ** (s / 12), 0.15, "triangle", 0.06, i * 0.08)),
  free: () => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(523 * 2 ** (s / 12), 0.14, "triangle", 0.06, i * 0.07)), crate: () => tone(140, 0.15, "sawtooth", 0.05, 0, 0.6),
  win: () => [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(392 * 2 ** (s / 12), 0.25, "triangle", 0.07, i * 0.09)), boss: () => tone(90, 0.4, "sawtooth", 0.08, 0, 0.6),
  shoot: () => tone(700, 0.1, "square", 0.025, 0, 0.5), crystal: () => tone(1200, 0.15, "sine", 0.06, 0, 1.5),
};
// Tiny looping tune per world (bass + arpeggio), quiet under the effects.
let musicStep = 0, musicNext = 0;
function musicTick() {
  if (!actx || !SAVE.music || !L || phase !== "play") return;
  const now = actx.currentTime; if (musicNext < now - 0.5) musicNext = now;
  while (musicNext < now + 0.2) {
    const sc = STYLE[L.world].music, beat = musicStep % 16, root = [0, 0, 5, 7][Math.floor(musicStep / 16) % 4] + (L.boss ? -2 : 0), base = 110 * 2 ** (root / 12);
    if (beat % 4 === 0) tone(base, 0.22, "triangle", 0.5, musicNext - now, 0, musicGain);
    if (beat % 2 === 0) tone(base * 4 * 2 ** (sc[(beat / 2) % 4] / 12), 0.12, "square", 0.18, musicNext - now, 0, musicGain);
    musicNext += L.boss ? 0.115 : 0.135; musicStep++;
  }
}

// ===================== INPUT =====================
const keys = new Set(), press = { jump: false, dash: false, down: false };
const KEYMAP = { ArrowLeft: "l", a: "l", A: "l", ArrowRight: "r", d: "r", D: "r", ArrowDown: "down", s: "down", S: "down", " ": "jump", z: "jump", Z: "jump", ArrowUp: "jump", w: "jump", W: "jump", x: "dash", X: "dash", Shift: "dash", c: "dash", C: "dash" };
addEventListener("keydown", e => {
  if (e.key === "Escape" || e.key === "p" || e.key === "P") { if (phase === "play") pauseMenu(); else if (phase === "paused" && !overlay.hidden && panel.querySelector("[data-act=resume]")) resume(); return; }
  const k = KEYMAP[e.key]; if (!k) return;
  if (phase === "play") e.preventDefault();
  if (!keys.has(k)) { if (k === "jump") press.jump = true; if (k === "dash") press.dash = true; if (k === "down") press.down = true; }
  keys.add(k); audio();
});
addEventListener("keyup", e => { const k = KEYMAP[e.key]; if (k) keys.delete(k); });
addEventListener("blur", () => keys.clear());
const touchHeld = new Set();
for (const [id, k] of [["bLeft", "l"], ["bRight", "r"], ["bDown", "down"], ["bJump", "jump"], ["bDash", "dash"]]) {
  const b = $(id);
  b.addEventListener("pointerdown", e => { e.preventDefault(); touchHeld.add(k); b.classList.add("on"); if (k in press) press[k] = true; try { b.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ } audio(); });
  const up = () => { touchHeld.delete(k); b.classList.remove("on"); };
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
}
addEventListener("touchstart", () => document.body.classList.add("touch"), { passive: true });
if (matchMedia("(pointer: coarse)").matches) document.body.classList.add("touch");
let padPrev = {};
function readPad() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (!gp) return {};
  const b = i => gp.buttons[i] && gp.buttons[i].pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const s = { l: ax < -0.4 || b(14), r: ax > 0.4 || b(15), down: ay > 0.6 || b(13), jump: b(0), dash: b(2) || b(1) || b(5) };
  if (s.jump && !padPrev.jump) press.jump = true; if (s.dash && !padPrev.dash) press.dash = true; if (s.down && !padPrev.down) press.down = true;
  if (b(9) && !padPrev.start && phase === "play") pauseMenu();
  padPrev = { ...s, start: b(9) }; return s;
}
const held = (k, pad) => keys.has(k) || touchHeld.has(k) || !!pad[k];

// ===================== LEVEL RUNTIME =====================
let L = null, P = null, phase = "menu", alien = SAVE.alien, level = 0, started = false;
let hearts = 3, gems = 0, shardsGot = [false, false, false], buddy = false, elapsed = 0, inv = 0, deadT = 0, hurtCount = 0, deaths = 0;
let cam = { x: 0, y: 0 }, shake = 0, parts = [], shots = [], signText = "", bannerT = 0;
function startLevel(index) {
  alien = SAVE.alien; level = index; started = true;
  const def = buildLevel(index, Math.max(0, LEVEL_VARIANTS[index] || 0)), d = DIFF[alien];
  L = { ...def, crumbled: new Float32Array(def.t.length), crumbleT: new Float32Array(def.t.length), broken: new Uint8Array(def.t.length), time: 0,
    gemsList: [], shards: [], cage: null, enemies: [], plats: [], crystals: [], checks: [], signs: [], exit: null, spawn: null, chaseX: -1e9, boss: null };
  let signN = 0;
  for (const e of def.ents) {
    const cx = e.x * TILE + TILE / 2, cy = e.y * TILE + TILE / 2;
    if (e.type === "A") L.spawn = { x: e.x * TILE + (TILE - PH.pw) / 2, y: (e.y + 1) * TILE - PH.ph };
    else if (e.type === "o") L.gemsList.push({ x: cx, y: cy, got: false });
    else if (e.type === "*") L.shards.push({ x: cx, y: cy, i: e.shard, got: false });
    else if (e.type === "K") L.cage = { x: cx, y: (e.y + 1) * TILE, open: false, t: 0, pal: ALIENS.filter(a => a !== alien)[index % 2] };
    else if (e.type === "d") L.crystals.push({ x: cx, y: cy, off: 0 });
    else if (e.type === "P") L.checks.push({ x: cx, y: (e.y + 1) * TILE, on: false });
    else if (e.type === "E") L.exit = { x: cx, y: (e.y + 1) * TILE };
    else if (e.type === "i") L.signs.push({ x: cx, y: (e.y + 1) * TILE, text: SIGNS[signN++] || "" });
    else if ("ghft".includes(e.type)) L.enemies.push(makeEnemy(e.type, cx, (e.y + 1) * TILE, d));
    else if (e.type === "m" || e.type === "M") {
      const vert = e.type === "M", mates = def.ents.filter(n => n.type === (vert ? "N" : "n") && (vert ? n.x === e.x : n.y === e.y));
      const n = mates.sort((a, b) => (vert ? Math.abs(a.y - e.y) : Math.abs(a.x - e.x)) - (vert ? Math.abs(b.y - e.y) : Math.abs(b.x - e.x)))[0];
      if (!n) continue;
      const a0 = vert ? e.y * TILE : e.x * TILE, a1 = vert ? n.y * TILE : n.x * TILE;
      L.plats.push({ vert, a0, a1, fixed: vert ? e.x * TILE : e.y * TILE, w: TILE * 3, x: 0, y: 0, ph: 0, dx: 0, dy: 0, speed: 70 / Math.max(TILE, Math.abs(a1 - a0)) });
    }
  }
  if (def.boss) L.boss = makeBoss(def.world, d);
  addFoes(index, d);
  if (def.chase) L.chaseX = L.spawn.x - TILE * 9;
  L.respawn = { ...L.spawn }; L.chaseStart = L.chaseX;
  updatePlats(0);
  hearts = d.hearts; gems = 0; shardsGot = [false, false, false]; buddy = false; elapsed = 0; inv = 0; deadT = 0; hurtCount = 0; deaths = 0;
  parts = []; shots = []; P = newPlayer(L.spawn.x, L.spawn.y); P.onGround = true;
  cam.x = P.x - 200; cam.y = 0;
  for (const k in press) press[k] = false;
  closeMenu(); phase = "play"; document.body.classList.add("playing"); $("hud").hidden = false;
  showBanner(def.boss ? `${ATK_BOSS[def.world]}!` : index === 0 ? "Oort Gate Training" : WORLDS[def.world].name, def.boss ? "Boss battle" : def.chase ? `Level ${levelName(index)} · Run from the goo!` : `Level ${levelName(index)}`);
  updateHud();
}
const ATK_BOSS = ["Mother Blob", "Hive Queen", "Command Ship", "Mothership"];
function makeEnemy(type, x, footY, d) {
  const size = type === "h" ? 40 : type === "s" ? 36 : 28, air = type === "f" || type === "s";
  // Enemies get a little quicker deeper into each world and in later worlds.
  const ramp = 1 + (level % LEVELS_PER_WORLD) * 0.035 + Math.floor(level / LEVELS_PER_WORLD) * 0.05, speed = d.enemy * ramp;
  return { type, x: x - size / 2, y: air ? footY - TILE * 1.6 - size / 2 : footY - size, w: size, h: type === "s" ? 28 : size, vx: (type === "g" ? 60 : type === "h" ? 38 : 0) * speed * -1,
    home: x, homeY: footY - TILE * 1.6, t: Math.random() * 6, alive: true, squash: 0, fire: 2 + Math.random() * 1.5, charge: 0, speed,
    shoots: type === "s" || type === "t" || (type === "f" && SHIP_FLYERS[L.world]) };
}
// Extra enemies on top of the ones built into each level piece. Few early on, lots by the end of each world;
// gunships start at level 1-4 and become common later. Placed with a fixed seed so a level always has the same foes.
function addFoes(index, d) {
  const k = index % LEVELS_PER_WORLD, w = L.world;
  if (index === 0 || L.boss) return;
  const rand = mulberry32(hashStr(`foes|${index}`));
  let n = Math.round((2 + k * 1.05 + w * 1.7) * (L.chase ? 0.6 : 1));
  const T = (x, y) => tileAt(L, x, y), empty = (x, y) => ".rlz".includes(T(x, y)), floor = (x, y) => T(x, y) === "#" || T(x, y) === "=";
  const keepOut = [[L.spawn.x / TILE, 11], ...(L.exit ? [[L.exit.x / TILE, 5]] : []), ...L.checks.map(c => [c.x / TILE, 4]), ...(L.cage ? [[L.cage.x / TILE, 3]] : []), ...L.signs.map(s => [s.x / TILE, 3])];
  const taken = L.enemies.map(e => (e.x + e.w / 2) / TILE);
  const clear = x => keepOut.every(([kx, r]) => Math.abs(x - kx) > r) && taken.every(tx => Math.abs(x - tx) > 4.5);
  const ground = [], air = [];
  for (let x = 2; x < L.w - 2; x++) {
    for (let y = 2; y < ROWS - 1; y++) {
      // A walker needs a 3-wide stretch of plain floor with headroom.
      if ([-1, 0, 1].every(dx => empty(x + dx, y) && empty(x + dx, y - 1) && floor(x + dx, y + 1))) ground.push({ x, y });
      // Flyers and ships need open sky around them, and stay well above the floor.
      if (y >= 2 && y <= 6 && [-1, 0, 1].every(dx => [-1, 0, 1].every(dy => empty(x + dx, y + dy))) && [1, 2, 3].every(dy => empty(x, y + dy))) air.push({ x, y });
    }
  }
  const shipShare = Math.min(0.4, Math.max(0, (k - 2) * 0.06 + w * 0.09)), heavyShare = k >= 4 || w > 0 ? 0.15 : 0, flyShare = 0.25;
  for (let i = 0; i < n; i++) {
    const r = rand(), type = r < shipShare ? "s" : r < shipShare + flyShare ? "f" : r < shipShare + flyShare + heavyShare ? "h" : "g";
    const pool = (type === "s" || type === "f" ? air : ground).filter(c => clear(c.x));
    if (!pool.length) continue;
    // Spread them out: aim for the i-th slice of the level, then take the nearest free spot.
    const want = 12 + (L.w - 20) * (i + rand()) / n;
    const c = pool.sort((a, b) => Math.abs(a.x - want) - Math.abs(b.x - want))[Math.floor(rand() * Math.min(3, pool.length))];
    const e = makeEnemy(type, c.x * TILE + TILE / 2, type === "s" || type === "f" ? (c.y + 1) * TILE + TILE * 1.1 : (c.y + 1) * TILE, d);
    L.enemies.push(e); taken.push(c.x);
  }
}
function updatePlats(dt) {
  for (const m of L.plats) {
    m.ph += dt * m.speed * Math.PI; const k = 0.5 - 0.5 * Math.cos(m.ph), pos = m.a0 + (m.a1 - m.a0) * k;
    const nx = m.vert ? m.fixed : pos, ny = m.vert ? pos : m.fixed;
    m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
  }
}

// ===================== BOSSES =====================
// Every boss cycles: move → attack → tired. While tired it sits low and glows: stomp or ground-pound it.
function makeBoss(world, d) {
  const arenaMid = L.w * TILE / 2, floor = 11 * TILE;
  return { world, name: ATK_BOSS[world], x: arenaMid + 200, y: floor - 150, w: 110, h: 96, vx: 0, vy: 0, hp: d.bossHp, max: d.bossHp, state: "intro", t: 0, hitT: 0, dead: false, deadT: 0,
    floor, speed: d.enemy, attacks: 0, beamX: -1, face: -1 };
}
function bossUpdate(b, dt) {
  b.t += dt; b.hitT = Math.max(0, b.hitT - dt);
  const px = P.x + PH.pw / 2, minX = 2 * TILE + 10, maxX = (L.w - 2) * TILE - b.w - 10, hover = b.floor - 230;
  const go = (s) => { b.state = s; b.t = 0; };
  if (b.dead) { b.deadT += dt; if (Math.random() < 0.5) burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, ["#ffd25d", "#ff6d86", "#fff"], 3); return; }
  if (b.state === "intro") { b.y += (hover - b.y) * dt * 2; if (b.t > 1.5) go("move"); return; }
  const fast = b.speed * (1 + (b.max - b.hp) * 0.12);
  if (b.state === "tired") {
    b.y += (b.floor - b.h - b.y) * Math.min(1, dt * 8); b.beamX = -1;
    if (b.t > 2.8 / Math.sqrt(fast)) go("move");
    return;
  }
  if (b.state === "move") {
    const tx = Math.max(minX, Math.min(maxX, px - b.w / 2 + Math.sin(b.t * 1.3) * 160));
    b.x += (tx - b.x) * dt * 1.2 * fast; b.face = Math.sign(px - (b.x + b.w / 2)) || -1;
    const ty = b.world === 0 ? b.floor - b.h - Math.abs(Math.sin(b.t * 3.2)) * 120 : hover + Math.sin(b.t * 2) * 30;
    b.y += (ty - b.y) * dt * 4;
    if (b.t > 2.4 / fast) go("attack");
    return;
  }
  // attack
  const W = b.world;
  if (W === 0) { // Mother Blob: big slam sending shockwaves both ways, then goo spit
    if (b.t < 0.6) b.y += (b.floor - b.h - 200 - b.y) * dt * 6;
    else if (b.t < 0.9) { b.y = Math.min(b.floor - b.h, b.y + 1400 * dt); if (b.y >= b.floor - b.h && !b.slam) { b.slam = true; shake = 0.4; SFX.pound();
      for (const s of [-1, 1]) shots.push({ x: b.x + b.w / 2, y: b.floor - 14, vx: s * 260 * fast, vy: 0, r: 14, wave: true, life: 4 }); } }
    else if (b.t < 1.6 && !b.spit) { b.spit = true; for (const k of [-1, 0, 1]) shots.push({ x: b.x + b.w / 2, y: b.y + 20, vx: (px - b.x - b.w / 2) * 0.9 + k * 120, vy: -520, r: 10, grav: true, life: 4 }); SFX.shoot(); }
    if (b.t > 2) { b.slam = b.spit = false; go("tired"); }
  } else if (W === 1) { // Hive Queen: telegraphed dive at you, gets stuck in the floor
    if (b.t < 0.8) { b.x += (px - b.w / 2 - b.x) * dt * 3; b.y += (hover - 60 - b.y) * dt * 4; b.diveX = px; }
    else if (b.y < b.floor - b.h) { b.y += 1300 * fast * dt; if (b.y >= b.floor - b.h) { b.y = b.floor - b.h; shake = 0.35; SFX.pound(); for (let k = 0; k < 6; k++) shots.push({ x: b.x + b.w / 2, y: b.floor - 20, vx: (k - 2.5) * 110, vy: -420, r: 8, grav: true, life: 3 }); } }
    else go("tired");
  } else if (W === 2) { // Command Ship: tractor beam sweeps across the arena, drops probes
    if (b.t < 0.2) b.beamX = b.x + b.w / 2;
    b.x += (b.face || 1) * 150 * fast * dt; if (b.x < minX || b.x > maxX) { b.face *= -1; b.x = Math.max(minX, Math.min(maxX, b.x)); }
    b.beamX = b.x + b.w / 2;
    if (Math.floor(b.t * 1.5) !== Math.floor((b.t - dt) * 1.5)) { shots.push({ x: b.x + b.w / 2, y: b.y + b.h, vx: 0, vy: 120, r: 11, grav: true, life: 5, bounce: true }); SFX.shoot(); }
    if (b.t > 3.2) { b.beamX = -1; go("tired"); }
  } else { // Mothership: rings of shots, then a beam sweep
    if (Math.floor(b.t / 0.9) !== Math.floor((b.t - dt) / 0.9) && b.t < 2.8) {
      const n = 10; for (let k = 0; k < n; k++) { const a = k / n * TAU + b.t; shots.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: Math.cos(a) * 200 * fast, vy: Math.sin(a) * 200 * fast, r: 8, life: 4 }); } SFX.shoot();
    }
    b.x += Math.sin(b.t * 2) * 120 * dt;
    if (b.t > 2.8 && b.t < 4.4) b.beamX = b.x + b.w / 2 + Math.sin((b.t - 2.8) * 2.4) * 260; else b.beamX = -1;
    if (b.t > 4.6) { b.beamX = -1; go("tired"); }
  }
  b.x = Math.max(minX, Math.min(maxX, b.x));
}
function bossHitTest(b) {
  if (b.dead || b.state === "intro") return;
  const ov = P.x < b.x + b.w - 8 && P.x + PH.pw > b.x + 8 && P.y < b.y + b.h - 6 && P.y + PH.ph > b.y + 10;
  if (b.beamX > 0 && Math.abs(P.x + PH.pw / 2 - b.beamX) < 26 && P.y + PH.ph > b.y + b.h) hurt(Math.sign(P.x - b.beamX) || 1);
  if (!ov) return;
  const fromAbove = P.vy > 0 && P.y + PH.ph - P.vy * DT * 3 <= b.y + 26;
  if (fromAbove) {
    P.vy = -PH.jumpV * 0.9; P.pound = false; P.canDouble = true; P.dash = 1;
    if (b.state === "tired" && b.hitT <= 0) {
      b.hp--; b.hitT = 1; SFX.boss(); shake = 0.3; burst(b.x + b.w / 2, b.y, ["#fff", "#ffd25d"], 18);
      if (b.hp <= 0) { b.dead = true; shots = []; showBanner(`${b.name} defeated!`, "Head for the portal"); L.exit = { x: L.w * TILE / 2, y: b.floor, appear: 0 }; }
      else { b.state = "move"; b.t = 0; b.y -= 40; }
    } else SFX.stomp();
  } else if (inv <= 0) hurt(Math.sign(P.x - b.x - b.w / 2) || 1);
}

// ===================== PLAY LOOP =====================
function hurt(dir) {
  if (inv > 0 || deadT > 0) return;
  hearts--; hurtCount++; inv = 1.3; P.vx = dir * 260; P.vy = -420; P.pound = false; P.dashT = 0; SFX.hurt(); shake = 0.2;
  const lose = Math.min(gems, 5); gems -= lose;
  for (let k = 0; k < lose; k++) L.gemsList.push({ x: P.x + 10, y: P.y + 6, vx: (k - 2) * 70, vy: -300 - k * 30, got: false, loose: 2.5 });
  if (hearts <= 0) die("knocked out");
  updateHud();
}
function die(why) {
  if (deadT > 0) return;
  deadT = 0.9; deaths++; SFX.die(); burst(P.x + 10, P.y + 14, [CHARS.byId(alien).color, "#fff"], 24);
  if (why !== "knocked out") { hearts--; if (hearts <= 0) why = "knocked out"; }
  L.deathWhy = why;
}
function respawn() {
  const d = DIFF[alien];
  if (hearts <= 0) { hearts = d.hearts; showBanner("Back to the beacon", "Health refilled"); }
  P = newPlayer(L.respawn.x, L.respawn.y); P.onGround = true; inv = 1.2;
  if (L.chase) L.chaseX = Math.min(L.chaseX, L.respawn.x - TILE * 9);
  if (L.boss && !L.boss.dead) { shots = []; L.boss.state = "move"; L.boss.t = 0; }
  updateHud();
}
function step(dt) {
  const pad = readPad();
  L.time += dt; updatePlats(dt);
  if (P.standOn) { P.x += P.standOn.dx; P.y += P.standOn.dy; }
  if (deadT > 0) { deadT -= dt; if (deadT <= 0) respawn(); stepWorld(dt); return; }
  elapsed += dt; inv = Math.max(0, inv - dt);
  const inp = { l: held("l", pad), r: held("r", pad), down: held("down", pad), downP: press.down, jumpP: press.jump, jumpH: held("jump", pad), dashP: press.dash };
  press.jump = press.dash = press.down = false;
  const prevY = P.y;
  stepPlayer(P, inp, L, L.plats, dt);
  for (const ev of P.events) {
    if (ev === "jump") { SFX.jump(); dust(P.x + 10, P.y + PH.ph, 6); }
    else if (ev === "double") { SFX.double(); burst(P.x + 10, P.y + PH.ph, ["#fff", STYLE[L.world].accent], 10); }
    else if (ev === "walljump") { SFX.walljump(); dust(P.x + (P.facing > 0 ? 0 : PH.pw), P.y + 14, 6); }
    else if (ev === "dash") SFX.dash();
    else if (ev === "pound") SFX.dash();
    else if (ev === "land") { if (prevY + 2 < P.y || true) dust(P.x + 10, P.y + PH.ph, 4); }
    else if (ev === "poundland") { SFX.pound(); shake = 0.25; dust(P.x + 10, P.y + PH.ph, 16); poundAt(); }
    else if (ev === "spring" || ev === "cloud") { SFX.spring(); burst(P.x + 10, P.y + PH.ph, ["#fff", "#ffe36b"], 8); }
    else if (ev === "pad") { if (Math.random() < 0.3) burst(P.x + 10, P.y + PH.ph, ["#ffd25d"], 2); }
    else if (ev.startsWith("crumble:")) { const [x, y] = ev.slice(8).split(",").map(Number), i = y * L.w + x; if (L.crumbleT[i] <= 0 && L.crumbled[i] <= 0) L.crumbleT[i] = 0.001; }
    else if (ev.startsWith("bump:") || ev.startsWith("head:")) { const [x, y] = ev.slice(5).split(",").map(Number); breakCrate(x, y); }
  }
  if (P.dead) { die(P.deadBy); return; }
  stepWorld(dt);
  collide();
  // Checkpoint beacons.
  for (const c of L.checks) if (!c.on && Math.abs(P.x + 10 - c.x) < 24 && Math.abs(P.y + PH.ph - c.y) < 70) {
    c.on = true; L.respawn = { x: c.x - PH.pw / 2, y: c.y - PH.ph }; SFX.check(); burst(c.x, c.y - 40, ["#5dff9b", "#fff"], 20); hearts = Math.min(DIFF[alien].hearts, hearts + 1); showBanner("Checkpoint!", ""); updateHud();
  }
  // Chase flood.
  if (L.chase && L.time > 1.2) { L.chaseX += TILE * 3.3 * DIFF[alien].chase * dt; if (P.x < L.chaseX + 30) die("goo"); }
  // Signs.
  const sg = L.signs.find(s => Math.abs(P.x + 10 - s.x) < 90 && Math.abs(P.y - s.y) < 140);
  setSign(sg ? sg.text : "");
  if (L.boss) { bossUpdate(L.boss, dt); bossHitTest(L.boss); }
  // Exit portal.
  if (L.exit && (!L.boss || L.boss.dead && L.boss.deadT > 1.2) && Math.abs(P.x + 10 - L.exit.x) < 26 && P.y + PH.ph > L.exit.y - 80 && P.y < L.exit.y) win();
}
function stepWorld(dt) {
  // Crumble blocks fall away and come back.
  for (let i = 0; i < L.t.length; i++) {
    if (L.crumbleT[i] > 0) { L.crumbleT[i] += dt; if (L.crumbleT[i] > 0.45) { L.crumbleT[i] = 0; L.crumbled[i] = 2.6; burst((i % L.w) * TILE + 16, Math.floor(i / L.w) * TILE + 16, [STYLE[L.world].ground], 6); } }
    else if (L.crumbled[i] > 0) { L.crumbled[i] -= dt; if (L.crumbled[i] <= 0) { const tx = i % L.w, ty = Math.floor(i / L.w); if (P.x < (tx + 1) * TILE && P.x + PH.pw > tx * TILE && P.y < (ty + 1) * TILE && P.y + PH.ph > ty * TILE) L.crumbled[i] = 0.3; } }
  }
  for (const c of L.crystals) c.off = Math.max(0, c.off - dt);
  for (const e of L.enemies) enemyUpdate(e, dt);
  for (const g of L.gemsList) if (g.loose) { g.loose -= dt; g.vy += 1400 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
    const ty = Math.floor((g.y + 6) / TILE), tx = Math.floor(g.x / TILE); if (g.vy > 0 && isSolid(L, tx, ty)) { g.y = ty * TILE - 6; g.vy *= -0.45; g.vx *= 0.7; } if (g.loose <= 0) g.got = true; }
  for (const s of shots) {
    s.life -= dt; if (s.grav) s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.bounce && s.y > 11 * TILE - s.r) { s.y = 11 * TILE - s.r; s.vy = -Math.abs(s.vy) * 0.6; s.vx = (Math.random() - 0.5) * 220; }
    if (!s.wave && !s.bounce && isSolid(L, Math.floor(s.x / TILE), Math.floor(s.y / TILE))) s.life = 0;
  }
  shots = shots.filter(s => s.life > 0);
  for (const p of parts) { p.t -= dt; p.vy += (p.g ?? 600) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.t > 0);
  if (L.cage && L.cage.open) L.cage.t += dt;
}
function enemyUpdate(e, dt) {
  if (!e.alive) { e.squash += dt; return; }
  e.t += dt;
  if (e.type === "g" || e.type === "h") {
    e.x += e.vx * dt;
    const ahead = e.vx > 0 ? e.x + e.w + 2 : e.x - 2, feet = Math.floor((e.y + e.h + 4) / TILE), mid = Math.floor((e.y + e.h / 2) / TILE), col = Math.floor(ahead / TILE);
    const floorAhead = isSolid(L, col, feet) || "=O".includes(tileAt(L, col, feet)), hazard = "^L".includes(tileAt(L, col, feet - 1)) || "^L".includes(tileAt(L, col, feet));
    if (isSolid(L, col, mid) || !floorAhead || hazard) e.vx *= -1;
  } else if (e.type === "f") {
    e.x = e.home - e.w / 2 + Math.sin(e.t * 1.1 * e.speed) * TILE * 2.2; e.y = e.homeY - e.h / 2 + Math.sin(e.t * 2.3) * 14;
  } else if (e.type === "s") {
    e.x = e.home - e.w / 2 + Math.sin(e.t * 0.55 * e.speed) * TILE * 3; e.y = e.homeY - e.h / 2 + Math.sin(e.t * 1.7) * 10;
  }
  if (!e.shoots) return;
  // Shooters glow red for half a second before an aimed shot, so there's time to dodge.
  const dx = P.x + 10 - (e.x + e.w / 2), dy = P.y + 14 - (e.y + e.h / 2), dist = Math.hypot(dx, dy);
  if (e.charge > 0) {
    e.charge -= dt;
    if (e.charge <= 0) { const sp = (e.type === "t" ? 170 : 190) * e.speed; shots.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: dx / dist * sp, vy: dy / dist * sp, r: 6, life: 5, enemy: true }); SFX.shoot(); }
    return;
  }
  e.fire -= dt;
  if (e.fire <= 0 && dist < TILE * 10 && deadT <= 0) { e.charge = 0.5; e.fire = (e.type === "t" ? 2.4 : 2.8) / e.speed + Math.random() * 0.6; }
}
function collide() {
  const px0 = P.x, py0 = P.y, px1 = P.x + PH.pw, py1 = P.y + PH.ph, near = (x, y, r) => x > px0 - r && x < px1 + r && y > py0 - r && y < py1 + r;
  for (const g of L.gemsList) if (!g.got && (!g.loose || g.loose < 2.2) && near(g.x, g.y, 10)) { g.got = true; gems++; SFX.gem(); parts.push({ x: g.x, y: g.y, vx: 0, vy: -40, t: 0.3, g: 0, c: "#fff", r: 3 }); updateHud(); }
  for (const s of L.shards) if (!s.got && near(s.x, s.y, 14)) { s.got = true; shardsGot[s.i] = true; SFX.shard(); burst(s.x, s.y, ["#ffd25d", "#fff"], 26); showBanner("Star Shard!", `${shardsGot.filter(Boolean).length} of 3`); updateHud(); }
  if (L.cage && !L.cage.open && near(L.cage.x, L.cage.y - 24, 22)) { L.cage.open = true; buddy = true; SFX.free(); burst(L.cage.x, L.cage.y - 24, ["#5dff9b", "#fff", "#ffd25d"], 30); showBanner("Buddy rescued!", `${CHARS.byId(L.cage.pal).name} is free`); updateHud(); }
  for (const c of L.crystals) if (c.off <= 0 && P.dash < 1 && near(c.x, c.y, 14)) { c.off = 2.5; P.dash = 1; P.canDouble = true; SFX.crystal(); burst(c.x, c.y, ["#4fd1ff", "#fff"], 12); }
  for (const s of shots) if (s.life > 0 && near(s.x, s.y, s.r - 2)) { if (P.dashT > 0 && s.enemy) { s.life = 0; continue; } hurt(Math.sign(P.x - s.x) || 1); if (!s.wave) s.life = 0; }
  for (const e of L.enemies) {
    if (!e.alive || !(P.x < e.x + e.w - 3 && P.x + PH.pw > e.x + 3 && P.y < e.y + e.h - 3 && P.y + PH.ph > e.y + 4)) continue;
    const fromAbove = P.vy > 0 && P.y + PH.ph - P.vy * DT * 3 <= e.y + 12;
    if (P.pound || (fromAbove && e.type !== "h") || (P.dashT > 0 && e.type !== "h")) { kill(e); if (!P.pound) { P.vy = -(held("jump", {}) ? 760 : 520); P.canDouble = true; P.dash = 1; } }
    else if (fromAbove) { P.vy = -560; SFX.stomp(); e.squash = 0; showSignOnce("Too tough to stomp! Press BASH in the air to ground-pound it."); }
    else hurt(Math.sign(P.x - e.x) || 1);
  }
}
function kill(e) { e.alive = false; e.squash = 0; SFX.stomp(); burst(e.x + e.w / 2, e.y + e.h / 2, ["#fff", STYLE[L.world].accent], 14); gems++; updateHud(); }
function poundAt() {
  const fy = Math.floor((P.y + PH.ph + 2) / TILE);
  for (const fx of [Math.floor((P.x + 2) / TILE), Math.floor((P.x + PH.pw - 2) / TILE)]) breakCrate(fx, fy);
  for (const e of L.enemies) if (e.alive && Math.abs(e.x + e.w / 2 - P.x - 10) < TILE * 2 && Math.abs(e.y + e.h - P.y - PH.ph) < 20) kill(e);
}
function breakCrate(x, y) {
  const i = y * L.w + x; if (tileAt(L, x, y) !== "B" || L.broken[i]) return;
  L.broken[i] = 1; SFX.crate(); shake = Math.max(shake, 0.12);
  for (let k = 0; k < 8; k++) parts.push({ x: x * TILE + 16, y: y * TILE + 16, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, t: 0.8, c: "#c99a5a", r: 4 });
  // Crates stacked on a broken crate break too.
  if (tileAt(L, x, y - 1) === "B") setTimeout(() => L && breakCrate(x, y - 1), 60);
}
function win() {
  phase = "done"; SFX.win(); burst(P.x + 10, P.y, ["#ffd25d", "#fff", "#5dff9b"], 40);
  const pr = SAVE.prog[alien][level], before = pr.m;
  let m = 1;
  if (L.boss) { if (hearts * 2 >= DIFF[alien].hearts && deaths === 0) m |= 2; if (hurtCount === 0 && deaths === 0) m |= 28; }
  else { if (buddy) m |= 2; shardsGot.forEach((g, i) => { if (g) m |= 4 << i; }); }
  pr.m |= m; if (!pr.t || elapsed < pr.t) pr.t = Math.ceil(elapsed); pr.g = Math.max(pr.g, gems); persist();
  setTimeout(() => resultMenu(m, before), 900);
}

// ===================== DRAWING =====================
const cv = $("game"), cx = cv.getContext("2d");
let VW = 0, VH = 0, SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  SC = Math.min(VH / (13.5 * TILE), VW / (13 * TILE));
}
addEventListener("resize", resize); resize();
function camera(dt) {
  const viewW = VW / SC, viewH = VH / SC, padB = (document.body.classList.contains("touch") ? 110 : 12) / SC, padT = 54 / SC;
  const tx = P.x + PH.pw / 2 - viewW * 0.42 + P.facing * viewW * 0.06;
  cam.x += (tx - cam.x) * Math.min(1, dt * 6);
  cam.x = Math.max(0, Math.min(L.w * TILE - viewW, cam.x)); if (L.w * TILE < viewW) cam.x = (L.w * TILE - viewW) / 2;
  const maxY = ROWS * TILE - viewH + padB, minY = Math.min(maxY, -padT - TILE);
  const ty = P.y - viewH * 0.48;
  cam.y += (Math.max(minY, Math.min(maxY, ty)) - cam.y) * Math.min(1, dt * 5);
  cam.y = Math.max(minY, Math.min(maxY, cam.y));
}
function drawBackground(t) {
  const st = STYLE[L.world], c = cx, g = c.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  // stars
  c.fillStyle = "#fff";
  for (let i = 0; i < 70; i++) { const x = ((i * 137.5 - cam.x * 0.05) % VW + VW) % VW, y = (i * 61.7) % (VH * 0.7), a = 0.3 + 0.3 * Math.sin(t * 2 + i); c.globalAlpha = L.world === 3 ? a * 0.2 : a; c.fillRect(x, y, 1.6, 1.6); }
  c.globalAlpha = 1;
  const par = (k, f) => { for (let i = -1; i < 4; i++) f(((i * 520 - cam.x * k) % 2080 + 2080) % 2080 - 520); };
  if (L.world === 0) { // ringed planet and station girders
    c.fillStyle = "#6a7fd0"; c.beginPath(); c.arc(VW * 0.78 - cam.x * 0.02, VH * 0.22, 60, 0, TAU); c.fill();
    c.strokeStyle = "#c8d6ff88"; c.lineWidth = 6; c.beginPath(); c.ellipse(VW * 0.78 - cam.x * 0.02, VH * 0.22, 105, 22, -0.3, 0, TAU); c.stroke();
    c.strokeStyle = "#27335a"; c.lineWidth = 8; par(0.3, x => { c.beginPath(); c.moveTo(x, VH); c.lineTo(x + 90, VH * 0.45); c.lineTo(x + 180, VH); c.stroke(); c.beginPath(); c.moveTo(x + 40, VH * 0.75); c.lineTo(x + 140, VH * 0.75); c.stroke(); });
  } else if (L.world === 1) { // banded gas giant sky and drifting storm clouds
    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? "#e0a06a22" : "#7a3e2a22"; c.fillRect(0, VH * (0.1 + k * 0.12) + Math.sin(t * 0.3 + k) * 6, VW, VH * 0.06); }
    c.fillStyle = "#c0504088"; c.beginPath(); c.ellipse(VW * 0.7 - cam.x * 0.03, VH * 0.3, 70, 34, 0, 0, TAU); c.fill();
    c.fillStyle = "#ffffff18"; par(0.2, x => { for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 50 + t * 8 % 520, VH * 0.55 + (k % 2) * 16, 40, 0, TAU); c.fill(); } });
  } else if (L.world === 2) { // red mesas and a small sun
    c.fillStyle = "#ffcf8f"; c.beginPath(); c.arc(VW * 0.2, VH * 0.2, 26, 0, TAU); c.fill();
    c.fillStyle = "#4a1a16"; par(0.25, x => { c.beginPath(); c.moveTo(x, VH); c.lineTo(x + 40, VH * 0.55); c.lineTo(x + 200, VH * 0.55); c.lineTo(x + 250, VH); c.fill(); });
    c.fillStyle = "#30100e"; par(0.5, x => { c.beginPath(); c.moveTo(x + 260, VH); c.lineTo(x + 300, VH * 0.7); c.lineTo(x + 420, VH * 0.68); c.lineTo(x + 470, VH); c.fill(); });
  } else { // hills, trees and the Armada's shadow in the sky
    c.fillStyle = "#ffffffcc"; for (let k = 0; k < 4; k++) { const x = ((k * 400 - cam.x * 0.08 + t * 6) % (VW + 300)) - 150; c.beginPath(); c.ellipse(x, VH * (0.15 + k * 0.05), 60, 18, 0, 0, TAU); c.fill(); }
    c.fillStyle = "#2f7a4a"; par(0.25, x => { c.beginPath(); c.ellipse(x + 260, VH, 300, VH * 0.4, 0, Math.PI, TAU); c.fill(); });
    c.fillStyle = "#1f5a35"; par(0.45, x => { for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 120, VH * 0.9); c.lineTo(x + k * 120 + 30, VH * 0.55); c.lineTo(x + k * 120 + 60, VH * 0.9); c.fill(); } });
  }
}
function drawTiles(t) {
  const st = STYLE[L.world], c = cx;
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), x1 = Math.min(L.w - 1, Math.ceil((cam.x + VW / SC) / TILE) + 1);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = L.t[ty * L.w + tx], X = tx * TILE, Y = ty * TILE, i = ty * L.w + tx;
    if (ch === ".") continue;
    if (ch === "#") {
      c.fillStyle = (tx + ty) % 2 ? st.ground : shadeHex(st.ground, -0.06); c.fillRect(X, Y, TILE, TILE);
      if (!isSolid(L, tx, ty - 1) && ty > 0) { c.fillStyle = st.top; c.fillRect(X, Y, TILE, 7); c.fillStyle = st.edge; c.fillRect(X, Y, TILE, 2); }
      else if (ty > 10) { c.fillStyle = st.dark + "66"; c.fillRect(X, Y, TILE, TILE); }
    } else if (ch === "B") {
      if (L.broken[i]) continue;
      c.fillStyle = "#a8743c"; c.fillRect(X + 1, Y + 1, TILE - 2, TILE - 2); c.strokeStyle = "#6b4520"; c.lineWidth = 3; c.strokeRect(X + 3, Y + 3, TILE - 6, TILE - 6);
      c.beginPath(); c.moveTo(X + 4, Y + 4); c.lineTo(X + TILE - 4, Y + TILE - 4); c.moveTo(X + TILE - 4, Y + 4); c.lineTo(X + 4, Y + TILE - 4); c.stroke();
    } else if (ch === "C") {
      if (L.crumbled[i] > 0) continue;
      const sh = L.crumbleT[i] > 0 ? (Math.random() - 0.5) * 3 : 0;
      c.fillStyle = shadeHex(st.ground, 0.12); c.fillRect(X + sh + 1, Y + 1, TILE - 2, TILE - 2); c.fillStyle = st.top; c.fillRect(X + sh + 1, Y + 1, TILE - 2, 5);
      c.strokeStyle = st.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(X + 8 + sh, Y + 8); c.lineTo(X + 16 + sh, Y + 18); c.lineTo(X + 12 + sh, Y + 28); c.moveTo(X + 16 + sh, Y + 18); c.lineTo(X + 26 + sh, Y + 14); c.stroke();
    } else if (ch === "=") {
      c.fillStyle = st.plank; c.fillRect(X, Y, TILE, 9); c.fillStyle = st.edge; c.fillRect(X, Y, TILE, 2); c.fillStyle = st.dark; c.fillRect(X + 4, Y + 9, 3, 5); c.fillRect(X + TILE - 7, Y + 9, 3, 5);
    } else if (ch === "O") {
      c.fillStyle = "#ffffffdd"; for (const [dx, dy, r] of [[8, 10, 9], [17, 7, 11], [26, 11, 8]]) { c.beginPath(); c.arc(X + dx, Y + dy + Math.sin(t * 3 + tx) * 1.5, r, 0, TAU); c.fill(); }
    } else if (ch === "^") {
      c.fillStyle = "#d9dde8"; c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(X + k * 11, Y + TILE); c.lineTo(X + k * 11 + 5.5, Y + TILE * 0.45); c.lineTo(X + k * 11 + 11, Y + TILE); } c.fill();
      c.fillStyle = "#8e97ad"; c.fillRect(X, Y + TILE - 3, TILE, 3);
    } else if (ch === "L") {
      const lg = c.createLinearGradient(0, Y, 0, Y + TILE); lg.addColorStop(0, "#ffd25d"); lg.addColorStop(0.4, "#ff6a2a"); lg.addColorStop(1, "#a3160f");
      c.fillStyle = lg; c.beginPath(); c.moveTo(X, Y + TILE);
      if (!["L"].includes(tileAt(L, tx, ty - 1))) { for (let k = 0; k <= 4; k++) c.lineTo(X + k * 8, Y + 6 + Math.sin(t * 4 + tx * 2 + k) * 3); } else { c.lineTo(X, Y); c.lineTo(X + TILE, Y); }
      c.lineTo(X + TILE, Y + TILE); c.fill();
    } else if (ch === "S") {
      c.fillStyle = "#8e97ad"; c.fillRect(X + 6, Y + 20, 20, 12); c.strokeStyle = "#dfe5f1"; c.lineWidth = 3; c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(X + 8, Y + 22 - k * 5); c.lineTo(X + 24, Y + 19 - k * 5); } c.stroke();
      c.fillStyle = "#ff5d7a"; c.fillRect(X + 3, Y + 6, 26, 6);
    } else if (ch === ">" || ch === "<") {
      c.fillStyle = st.ground; c.fillRect(X, Y, TILE, TILE); c.fillStyle = "#ffd25d"; const s = ch === ">" ? 1 : -1, ph = (t * 3) % 1;
      for (let k = 0; k < 2; k++) { const ax = X + 16 + s * ((k * 0.5 + ph) % 1 - 0.5) * 24; c.beginPath(); c.moveTo(ax - s * 6, Y + 1); c.lineTo(ax + s * 4, Y + 5); c.lineTo(ax - s * 6, Y + 9); c.fill(); }
    } else if (ch === "w" || ch === "r" || ch === "l") {
      c.strokeStyle = "#ffffff30"; c.lineWidth = 2; c.beginPath();
      for (let k = 0; k < 2; k++) { const o = ((t * 90 + k * 16 + tx * 7 + ty * 13) % TILE);
        if (ch === "w") { c.moveTo(X + 8 + k * 14, Y + TILE - o); c.lineTo(X + 8 + k * 14, Y + TILE - o - 8); }
        else { const s = ch === "r" ? 1 : -1, xx = s > 0 ? X + o : X + TILE - o; c.moveTo(xx, Y + 8 + k * 14); c.lineTo(xx + s * 10, Y + 8 + k * 14); } }
      c.stroke();
    } else if (ch === "z") {
      c.fillStyle = "#b48cff14"; c.fillRect(X, Y, TILE, TILE);
      if ((tx * 7 + ty * 3) % 5 === 0) { c.fillStyle = "#d6c2ff55"; c.beginPath(); c.arc(X + 16, Y + 16 - ((t * 10 + tx * 5) % 16), 2, 0, TAU); c.fill(); }
    }
  }
}
function shadeHex(hex, f) { const n = parseInt(hex.slice(1, 7), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = f < 0 ? 0 : 255, a = Math.abs(f);
  return `rgb(${Math.round(r + (m - r) * a)},${Math.round(g + (m - g) * a)},${Math.round(b + (m - b) * a)})`; }
function drawStar(c, x, y, r, rot, fill) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = rot + k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = fill; c.fill(); }
function drawEntities(t) {
  const c = cx, st = STYLE[L.world];
  for (const m of L.plats) { c.fillStyle = st.plank; c.fillRect(m.x, m.y, m.w, 12); c.fillStyle = st.edge; c.fillRect(m.x, m.y, m.w, 3); c.fillStyle = st.accent; c.fillRect(m.x + m.w / 2 - 6, m.y + 12, 12, 4); }
  for (const g of L.gemsList) if (!g.got) {
    const s = Math.abs(Math.cos(t * 3 + g.x * 0.05)), y = g.y + (g.loose ? 0 : Math.sin(t * 3 + g.x) * 2);
    if (g.loose && g.loose < 0.8 && Math.floor(t * 12) % 2) continue;
    const s2 = 0.35 + 0.65 * s; c.fillStyle = st.accent; c.beginPath(); c.moveTo(g.x, y - 10); c.lineTo(g.x + 9 * s2, y); c.lineTo(g.x, y + 10); c.lineTo(g.x - 9 * s2, y); c.fill(); c.strokeStyle = "#ffffff99"; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = "#ffffffaa"; c.fillRect(g.x - 1, y - 5, 2, 4);
  }
  for (const s of L.shards) if (!s.got) { c.save(); c.shadowColor = "#ffd25d"; c.shadowBlur = 16; drawStar(c, s.x, s.y + Math.sin(t * 2.5) * 3, 12, t, "#ffd25d"); c.restore(); drawStar(c, s.x, s.y + Math.sin(t * 2.5) * 3, 5, t, "#fff8d0"); }
  for (const cr of L.crystals) { c.globalAlpha = cr.off > 0 ? 0.2 : 1; c.save(); c.translate(cr.x, cr.y + Math.sin(t * 3) * 3); c.rotate(Math.PI / 4); c.shadowColor = "#4fd1ff"; c.shadowBlur = cr.off > 0 ? 0 : 14; c.fillStyle = "#7fe6ff"; c.fillRect(-8, -8, 16, 16); c.fillStyle = "#fff"; c.fillRect(-3, -3, 6, 6); c.restore(); c.globalAlpha = 1; }
  for (const s of L.signs) { c.fillStyle = "#6b4520"; c.fillRect(s.x - 3, s.y - 30, 6, 30); c.fillStyle = "#c99a5a"; c.fillRect(s.x - 16, s.y - 40, 32, 20); c.fillStyle = "#3a2410"; c.font = "900 14px system-ui"; c.textAlign = "center"; c.fillText("?", s.x, s.y - 25); }
  for (const ck of L.checks) {
    c.fillStyle = "#8e97ad"; c.fillRect(ck.x - 3, ck.y - 62, 6, 62); c.fillStyle = "#4a5068"; c.fillRect(ck.x - 10, ck.y - 6, 20, 6);
    c.save(); if (ck.on) { c.shadowColor = "#5dff9b"; c.shadowBlur = 18; } c.fillStyle = ck.on ? "#5dff9b" : "#59608c"; c.beginPath(); c.arc(ck.x, ck.y - 66, 9 + (ck.on ? Math.sin(t * 6) * 2 : 0), 0, TAU); c.fill(); c.restore();
  }
  if (L.cage) {
    const k = L.cage, bob = Math.sin(t * 3) * 2;
    if (!k.open || k.t < 3) {
      c.save(); c.translate(k.x, k.y - 22 - (k.open ? Math.min(60, k.t * 50) : 0)); if (k.open) c.globalAlpha = Math.max(0, 1 - k.t / 3);
      CHARS.byId(k.pal).draw(c, t, 11, k.open ? 0 : 0.2); c.restore(); c.globalAlpha = 1;
    }
    if (!k.open) { c.strokeStyle = "#cfd6e8"; c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(k.x - 20 + i * 10, k.y - 48 + bob * 0); c.lineTo(k.x - 20 + i * 10, k.y); c.stroke(); }
      c.fillStyle = "#8e97ad"; c.fillRect(k.x - 24, k.y - 52, 48, 6); c.fillRect(k.x - 24, k.y - 4, 48, 4); c.fillStyle = "#ffd25d"; c.fillRect(k.x - 4, k.y - 30, 8, 9); }
  }
  if (L.exit && (!L.boss || L.boss.dead)) {
    const e = L.exit, a = L.boss ? Math.min(1, L.boss.deadT / 1.2) : 1;
    c.save(); c.globalAlpha = a; c.translate(e.x, e.y - 40);
    for (let k = 0; k < 4; k++) { c.strokeStyle = ["#8fe9dc", "#c77dff", "#ffd25d", "#ffffff"][k]; c.lineWidth = 4; c.beginPath(); c.ellipse(0, 0, 22 - k * 4, 38 - k * 7, 0, t * (2 + k) , t * (2 + k) + 4.5); c.stroke(); }
    c.restore();
  }
  for (const e of L.enemies) {
    if (!e.alive && e.squash > 0.4) continue;
    const name = ENEMY[L.world][e.type], ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    c.save(); c.translate(ex, ey); if (!e.alive) { c.scale(1 + e.squash, 1 - e.squash * 2.2); c.globalAlpha = 1 - e.squash * 2; }
    if (e.charge > 0 && e.alive) { c.save(); c.shadowColor = "#ff3d5a"; c.shadowBlur = 20; c.fillStyle = `rgba(255,61,90,${0.35 + 0.35 * Math.sin(t * 40)})`; c.beginPath(); c.arc(0, 0, e.w * 0.62, 0, TAU); c.fill(); c.restore(); }
    if (e.vx > 0 || (e.shoots && e.type !== "t" && P.x > e.x)) c.scale(-1, 1);
    ATK.draw(name, c, t + e.home * 0.01, e.w * 0.48); c.restore();
  }
  if (L.boss && !(L.boss.dead && L.boss.deadT > 1.5)) {
    const b = L.boss;
    if (b.beamX > 0) { const bg = c.createLinearGradient(b.beamX - 26, 0, b.beamX + 26, 0); bg.addColorStop(0, "#5dff9b00"); bg.addColorStop(0.5, "#5dff9baa"); bg.addColorStop(1, "#5dff9b00");
      c.fillStyle = bg; c.fillRect(b.beamX - 26, b.y + b.h, 52, b.floor - b.y - b.h); }
    c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2);
    if (b.hitT > 0 && Math.floor(t * 20) % 2) c.globalAlpha = 0.4;
    if (b.dead) { c.rotate(Math.sin(t * 30) * 0.1); c.globalAlpha = Math.max(0, 1 - b.deadT / 1.5); }
    if (b.state === "tired") { c.shadowColor = "#ffd25d"; c.shadowBlur = 25; }
    ATK.draw(b.name, c, t, b.w * 0.5, b.state === "tired" ? 1 : 0); c.restore();
    if (b.state === "tired" && !b.dead) { c.fillStyle = "#ffd25d"; c.font = "900 16px system-ui"; c.textAlign = "center"; c.fillText("▼ STOMP!", b.x + b.w / 2, b.y - 12 + Math.sin(t * 8) * 3); }
  }
  for (const s of shots) { c.save(); c.shadowColor = s.wave ? "#ff8bd0" : "#ff5d7a"; c.shadowBlur = 10; c.fillStyle = s.wave ? "#ff8bd0" : s.enemy ? "#ffb35d" : "#ff5d7a";
    if (s.wave) { c.beginPath(); c.ellipse(s.x, s.y + 4, s.r * 1.3, s.r, 0, Math.PI, TAU); c.fill(); } else { c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); } c.restore(); }
}
function drawPlayer(t) {
  if (deadT > 0) return;
  const c = cx, ch = CHARS.byId(alien);
  if (inv > 0 && Math.floor(t * 16) % 2) return;
  if (P.dashT > 0) for (let k = 1; k <= 3; k++) { c.globalAlpha = 0.18; c.save(); c.translate(P.x + 10 - P.dashDir * k * 14, P.y + 16); c.scale(P.facing, 1); ch.draw(c, t, 12, 0); c.restore(); }
  c.globalAlpha = 1;
  const stretch = P.onGround ? 1 : Math.max(0.85, Math.min(1.18, 1 + -P.vy / 3000));
  c.save(); c.translate(P.x + PH.pw / 2, P.y + PH.ph); c.scale(P.facing / stretch ** 0.5, stretch); c.translate(0, -14);
  ch.draw(c, P.onGround && Math.abs(P.vx) > 20 ? t * 1.6 : t, 12, 0); c.restore();
  if (P.pound) { c.strokeStyle = "#ffffff88"; c.lineWidth = 3; c.beginPath(); c.moveTo(P.x + 4, P.y - 6); c.lineTo(P.x + 4, P.y - 26); c.moveTo(P.x + 16, P.y - 6); c.lineTo(P.x + 16, P.y - 26); c.stroke(); }
}
function drawChase(t) {
  if (!L.chase) return;
  const c = cx, x = L.chaseX;
  if (x < cam.x - 200) return;
  const g = c.createLinearGradient(x - 300, 0, x + 40, 0); g.addColorStop(0, "#c2408f"); g.addColorStop(1, "#ff8bd0");
  c.fillStyle = g; c.beginPath(); c.moveTo(x - 2000, -200); c.lineTo(x, -200);
  for (let y = -200; y <= ROWS * TILE + 40; y += 24) c.lineTo(x + Math.sin(t * 5 + y * 0.05) * 18, y);
  c.lineTo(x - 2000, ROWS * TILE + 40); c.fill();
  for (let k = 0; k < 4; k++) { const ey = 80 + k * 90 + Math.sin(t * 2 + k) * 20; c.fillStyle = "#fff"; c.beginPath(); c.arc(x - 30, ey, 10, 0, TAU); c.fill(); c.fillStyle = "#3a0a22"; c.beginPath(); c.arc(x - 26, ey, 5, 0, TAU); c.fill(); }
}
function drawParts() { for (const p of parts) { cx.globalAlpha = Math.min(1, p.t * 2); cx.fillStyle = p.c; cx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); } cx.globalAlpha = 1; }
function burst(x, y, colors, n) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU, s = 60 + Math.random() * 220; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, t: 0.5 + Math.random() * 0.5, c: colors[k % colors.length], r: 3 + Math.random() * 3 }); } }
function dust(x, y, n) { for (let k = 0; k < n; k++) parts.push({ x: x + (Math.random() - 0.5) * 16, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 80, t: 0.35, g: 200, c: "#ffffff99", r: 3 }); }
function render(t, dt) {
  const c = cx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground(t);
  shake = Math.max(0, shake - dt);
  const sx = shake > 0 ? (Math.random() - 0.5) * shake * 30 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 30 : 0;
  c.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * (-cam.x * SC + sx), DPR * (-cam.y * SC + sy));
  drawTiles(t); drawEntities(t); drawPlayer(t); drawChase(t); drawParts();
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (L.boss && !L.boss.dead && L.boss.state !== "intro") { // boss health bar
    const w = Math.min(320, VW * 0.5), x = (VW - w) / 2, y = VH - (document.body.classList.contains("touch") ? 120 : 34);
    c.fillStyle = "#0d1230dd"; c.fillRect(x - 4, y - 4, w + 8, 22); c.fillStyle = "#3a1622"; c.fillRect(x, y, w, 14); c.fillStyle = "#ff5d7a"; c.fillRect(x, y, w * L.boss.hp / L.boss.max, 14);
    c.fillStyle = "#fff"; c.font = "800 11px system-ui"; c.textAlign = "center"; c.fillText(L.boss.name.toUpperCase(), VW / 2, y + 11);
  }
  if (deadT > 0) { c.fillStyle = `rgba(5,5,16,${Math.max(0, 0.9 - deadT) * 0.9})`; c.fillRect(0, 0, VW, VH); }
}

// ===================== HUD =====================
let signShown = "", signOnceUntil = 0;
function setSign(text) { if (performance.now() < signOnceUntil) return; if (text === signShown) return; signShown = text; $("sign").textContent = text; $("sign").classList.toggle("show", !!text); }
function showSignOnce(text) { signShown = text; $("sign").textContent = text; $("sign").classList.add("show"); signOnceUntil = performance.now() + 3500; setTimeout(() => { if (performance.now() >= signOnceUntil) { signShown = ""; $("sign").classList.remove("show"); } }, 3600); }
let bannerTimer = 0;
function showBanner(big, small) { const b = $("banner"); b.innerHTML = `${big}${small ? `<small>${small}</small>` : ""}`; b.classList.add("show"); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove("show"), 1800); }
function updateHud() {
  if (!L) return;
  $("hudWorld").textContent = WORLDS[L.world].name; $("hudLevel").textContent = levelName(level);
  $("hudGems").textContent = gems;
  const max = DIFF[alien].hearts;
  $("hudHearts").innerHTML = "♥".repeat(Math.max(0, hearts)) + `<i>${"♥".repeat(Math.max(0, max - hearts))}</i>`;
  if (L.boss) { $("hudShards").textContent = "—"; $("hudBuddy").textContent = "—"; }
  else { $("hudShards").innerHTML = shardsGot.map(g => g ? "★" : "<i>★</i>").join(""); $("hudBuddy").textContent = buddy ? "Free!" : "🔒"; $("hudBuddy").classList.toggle("got", buddy); }
  const m = SAVE.prog[alien][level].m; $("best").textContent = m ? "★".repeat(starsOf(m)) + "☆".repeat(3 - starsOf(m)) : "—";
}

// ===================== MENUS =====================
const overlay = $("overlay"), panel = $("panel");
function showMenu(html) {
  if (phase === "play") phase = "paused";
  panel.innerHTML = html; overlay.hidden = false; panel.scrollTop = 0; setSign("");
  document.body.classList.remove("playing");
  panel.querySelector("button.primary, button")?.focus({ preventScroll: true });
}
function closeMenu() { overlay.hidden = true; }
function resume() { closeMenu(); phase = "play"; document.body.classList.add("playing"); last = performance.now(); }
const soundBtns = () => `<button data-act="sound" aria-pressed="${SAVE.sound}">Sound: ${SAVE.sound ? "On" : "Off"}</button><button data-act="music" aria-pressed="${SAVE.music}">Music: ${SAVE.music ? "On" : "Off"}</button>`;
const alienName = id => CHARS.byId(id).name;
function mainMenu() {
  if (phase === "play") phase = "paused";
  const a = SAVE.alien, d = DIFF[a], total = SAVE.prog[a].reduce((s, p) => s + starsOf(p.m), 0), canResume = started && phase === "paused" && alien === a && L;
  $("hud").hidden = true;
  showMenu(`<div class="mm"><div class="mm-a"><canvas class="hero" data-hero="1" width="640" height="220"></canvas>
    <p class="kicker">Alien Arcade</p><h1>Alien Starhop</h1>
    <p class="blurb">Run, jump, wall-kick and dash across four worlds. Free trapped buddies, find Star Shards, and beat the Armada's bosses.</p>
    ${canResume ? `<button class="primary" data-act="resume">Resume level ${levelName(level)}</button>` : ""}
    <p class="kicker">Choose your alien</p>
    <div class="chars">${ALIENS.map(id => `<button class="charBtn" data-act="alien" data-id="${id}" aria-pressed="${id === a}"><canvas data-char="${id}" width="140" height="140"></canvas><span>${alienName(id)}<small>${DIFF[id].label} · ${DIFF[id].hearts} ♥</small></span></button>`).join("")}</div></div>
    <div class="mm-b"><p class="kicker">${alienName(a)} · ${d.label} · ${total}/${TOTAL_LEVELS * 3} ★</p>
    <div class="arcade-stages">${WORLDS.map((w, i) => {
      const first = i * LEVELS_PER_WORLD, open = unlocked(a, first);
      return `<button class="arcade-stage" data-act="world" data-id="${i}" ${open ? "" : "disabled"}><span class="arcade-planet" data-world="${i}" aria-hidden="true"></span><span>${i + 1} · ${w.name}<small>${open ? `${worldStars(a, i)}/${LEVELS_PER_WORLD * 3} ★` : `🔒 Beat the ${ATK_BOSS[i - 1]} first`}</small></span></button>`;
    }).join("")}</div></div></div>
    <div class="actions"><button data-act="help">How to Play</button>${soundBtns()}</div>
    <div class="arcade-footer">${ARCADE_LINK}</div>`);
}
function worldMenu(w) {
  const a = SAVE.alien, W = WORLDS[w], nextOpen = SAVE.prog[a].findIndex((p, i) => !p.m && unlocked(a, i));
  showMenu(`<p class="kicker">${alienName(a)} · ${DIFF[a].label} · ${worldStars(a, w)}/${LEVELS_PER_WORLD * 3} ★</p><h2>${w + 1} · ${W.name}${w === 0 ? "" : ""}</h2>
    <p>${W.sub}. Level ${w + 1}-6 is a goo escape, and ${w + 1}-10 is the ${ATK_BOSS[w]}. Finish a level to unlock the next.</p>
    <div class="levels">${Array.from({ length: LEVELS_PER_WORLD }, (_, k) => {
      const i = w * LEVELS_PER_WORLD + k, open = unlocked(a, i), n = starsOf(SAVE.prog[a][i].m), boss = isBoss(i);
      return `<button data-act="level" data-id="${i}" class="${i === nextOpen ? "next" : ""} ${boss ? "boss" : ""}" ${open ? "" : "disabled"} aria-label="Level ${k + 1}${boss ? " boss" : ""}, ${open ? n + " stars" : "locked"}"><span>${open ? (boss ? "👾" : k + 1) : "🔒"}</span><small>${open ? (n ? "★".repeat(n) : "—") : ""}</small></button>`;
    }).join("")}</div>
    <div class="arcade-footer"><button data-act="main">Back</button>${ARCADE_LINK}</div>`);
}
function pauseMenu() {
  if (phase !== "play") return;
  showMenu(`<p class="kicker">${WORLDS[L.world].name} · Level ${levelName(level)} · ${alienName(alien)}</p><h2>Paused</h2>
    <button class="primary" data-act="resume">Resume</button>
    <div class="actions"><button data-act="again">Restart level</button><button data-act="levels">All levels</button><button data-act="help">How to Play</button>${soundBtns()}<button data-act="main">Back</button></div>
    <div class="arcade-footer">${ARCADE_LINK}</div>`);
}
function resultMenu(m, before) {
  const boss = L.boss, w = L.world, last = level + 1 >= TOTAL_LEVELS, nextWorld = isBoss(level) && !last, total = starsOf(SAVE.prog[alien][level].m);
  const goal = (ok, label, note) => `<div class="${ok ? "" : "miss"}"><span>${label}</span><b>${ok ? "★" : "☆"}${note ? ` ${note}` : ""}</b></div>`;
  const goals = boss
    ? goal(true, `Beat the ${boss.name}`) + goal(m & 2, "Finish with half your health") + goal((m & 28) === 28, "No damage taken")
    : goal(true, "Reach the portal") + goal(m & 2, "Rescue the caged buddy") + goal((m & 28) === 28, "Find all 3 Star Shards", `${shardsGot.filter(Boolean).length}/3`);
  const n = starsOf(m);
  showMenu(`<canvas class="hero" data-hero="win" width="640" height="220"></canvas>
    <p class="kicker">${WORLDS[w].name} · Level ${levelName(level)} · ${alienName(alien)}</p>
    <h2>${last ? "Earth is saved!" : boss ? `${boss.name} defeated!` : n === 3 ? "Perfect run!" : "Level clear!"}</h2>
    <p class="bigstars" aria-label="${n} of 3 stars this run">${"★".repeat(n)}<i>${"★".repeat(3 - n)}</i></p>
    <div class="goals">${goals}</div>
    <p>Time ${fmtTime(elapsed)} · ${gems} gems${deaths ? ` · ${deaths} retr${deaths > 1 ? "ies" : "y"}` : ""}${total > n ? ` · best for this level: ${total} ★` : ""}</p>
    ${last ? `<p>You beat the Mothership and saved Earth with ${alienName(alien)}! Collect every star, or try a harder alien.</p>` : `<button class="primary" data-act="next">${nextWorld ? `Next world: ${WORLDS[w + 1].name}` : "Next level"}</button>`}
    <div class="actions"><button data-act="again">Play again</button><button data-act="levels">All levels</button></div>
    <div class="arcade-footer"><button data-act="main">Back</button>${ARCADE_LINK}</div>`);
}
const HELP = [
  { title: "Run and jump", text: "◀ ▶ (or arrow keys / A D) to run. JUMP (Space, Z or ↑) to hop. Hold it to jump higher, tap for a short hop. You can still jump just after running off a ledge.", art: "jump" },
  { title: "Double jump and wall jump", text: "Press JUMP again in the air for a double jump. Slide down a wall and press JUMP to kick off it, then kick off the other side to climb.", art: "wall" },
  { title: "Dash and ground-pound", text: "DASH (X or Shift) zooms you forward and knocks out small aliens. Blue crystals refill your dash in mid-air. BASH (▼ or S on a keyboard) in the air ground-pounds: it smashes crates and flattens tough Chonk-type aliens.", art: "dash" },
  { title: "Three stars every level", text: "★ Reach the portal. ★ Free the caged buddy. ★ Find all 3 hidden Star Shards. Shards and buddies stay found, so you can come back for them. Beacons are checkpoints.", art: "stars" },
  { title: "Bosses and escapes", text: "Level 6 of each world is a goo escape: keep moving! Level 10 is a boss. Dodge its attacks, and when it gets tired and glows, stomp it or BASH it.", art: "boss" },
];
let helpPage = 0, helpFrom = "main";
function helpMenu() {
  const p = HELP[helpPage], lastP = helpPage === HELP.length - 1;
  showMenu(`<p class="step">Step ${helpPage + 1} of ${HELP.length}</p><h2>${p.title}</h2>${helpArt(p.art)}<p>${p.text}</p>
    <div class="actions"><button data-act="helpback">Back</button><button class="primary" data-act="${lastP ? "helpdone" : "helpnext"}">${lastP ? "Done" : "Next"}</button></div>`);
}
function helpArt(kind) {
  const ground = `<rect x="0" y="96" width="360" height="24" fill="#4d5f93"/><rect x="0" y="96" width="360" height="5" fill="#d8f0ff"/>`, hero = (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="#5dff9b"/><circle cx="${x + 2}" cy="${y - 2}" r="4" fill="#fff"/><circle cx="${x + 3}" cy="${y - 2}" r="2" fill="#10261a"/>`;
  if (kind === "jump") return `<svg class="guide" viewBox="0 0 360 120">${ground}<path d="M60 85 Q120 10 180 85" fill="none" stroke="#5dff9b" stroke-width="3" stroke-dasharray="6 5"/><path d="M200 85 Q230 50 260 85" fill="none" stroke="#7ab8ff" stroke-width="3" stroke-dasharray="6 5"/>${hero(60, 85)}<text x="120" y="30" fill="#c9ffe0" font-size="12" font-weight="800" text-anchor="middle">hold = high</text><text x="230" y="44" fill="#bcd8ff" font-size="12" font-weight="800" text-anchor="middle">tap = hop</text></svg>`;
  if (kind === "wall") return `<svg class="guide" viewBox="0 0 360 120">${ground}<rect x="150" y="10" width="14" height="86" fill="#27335a"/><rect x="230" y="10" width="14" height="86" fill="#27335a"/><path d="M60 85 Q70 30 100 20" fill="none" stroke="#ffd25d" stroke-width="3" stroke-dasharray="6 5"/><path d="M168 80 L224 55 L168 30 L224 12" fill="none" stroke="#5dff9b" stroke-width="3" stroke-dasharray="6 5"/>${hero(60, 85)}<text x="90" y="40" fill="#ffe9a8" font-size="12" font-weight="800">double!</text></svg>`;
  if (kind === "dash") return `<svg class="guide" viewBox="0 0 360 120">${ground}<path d="M60 60 H180" stroke="#4fd1ff" stroke-width="6" stroke-linecap="round" opacity=".6"/>${hero(190, 60)}<rect x="270" y="72" width="24" height="24" fill="#a8743c" stroke="#6b4520" stroke-width="3"/><path d="M282 20 V60" stroke="#fff" stroke-width="3" stroke-dasharray="4 4"/><path d="M276 54 l6 10 l6 -10" fill="none" stroke="#fff" stroke-width="3"/><g transform="translate(120 30) rotate(45)"><rect x="-7" y="-7" width="14" height="14" fill="#7fe6ff"/></g></svg>`;
  if (kind === "stars") return `<svg class="guide" viewBox="0 0 360 120">${ground}<ellipse cx="70" cy="60" rx="18" ry="30" fill="none" stroke="#c77dff" stroke-width="4"/><g stroke="#cfd6e8" stroke-width="3">${[160, 170, 180, 190, 200].map(x => `<line x1="${x}" y1="48" x2="${x}" y2="96"/>`).join("")}</g><circle cx="180" cy="78" r="10" fill="#7ab8ff"/><text x="290" y="70" fill="#ffd25d" font-size="40" text-anchor="middle">★</text><text x="70" y="114" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">portal</text><text x="180" y="114" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">buddy</text><text x="290" y="114" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">3 shards</text></svg>`;
  return `<svg class="guide" viewBox="0 0 360 120">${ground}<ellipse cx="230" cy="70" rx="50" ry="26" fill="#ff5d7a"/><circle cx="215" cy="64" r="7" fill="#fff"/><circle cx="245" cy="64" r="7" fill="#fff"/><path d="M120 20 Q190 -10 225 38" fill="none" stroke="#ffd25d" stroke-width="3" stroke-dasharray="6 5"/>${hero(120, 30)}<text x="230" y="30" fill="#ffd25d" font-size="13" font-weight="900" text-anchor="middle">▼ STOMP!</text><path d="M0 60 Q20 40 0 20 Z" fill="#ff8bd0"/></svg>`;
}
panel.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  audio();
  const act = b.dataset.act, id = b.dataset.id;
  if (act === "alien") { SAVE.alien = id; persist(); mainMenu(); }
  else if (act === "world") worldMenu(+id);
  else if (act === "level") startLevel(+id);
  else if (act === "main") mainMenu();
  else if (act === "resume") { $("hud").hidden = false; resume(); }
  else if (act === "again") startLevel(level);
  else if (act === "next") startLevel(level + 1);
  else if (act === "levels") worldMenu(Math.floor(level / LEVELS_PER_WORLD));
  else if (act === "sound") { SAVE.sound = !SAVE.sound; persist(); b.textContent = `Sound: ${SAVE.sound ? "On" : "Off"}`; b.setAttribute("aria-pressed", SAVE.sound); }
  else if (act === "music") { SAVE.music = !SAVE.music; persist(); b.textContent = `Music: ${SAVE.music ? "On" : "Off"}`; b.setAttribute("aria-pressed", SAVE.music); }
  else if (act === "help") { helpFrom = panel.querySelector("h2")?.textContent === "Paused" ? "pause" : "main"; helpPage = 0; helpMenu(); }
  else if (act === "helpnext") { helpPage++; helpMenu(); }
  else if (act === "helpback") { if (helpPage) { helpPage--; helpMenu(); } else helpDone(); }
  else if (act === "helpdone") helpDone();
});
function helpDone() { if (helpFrom === "pause") { phase = "play"; pauseMenu(); } else mainMenu(); }
$("pauseBtn").addEventListener("click", () => { audio(); pauseMenu(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && phase === "play") pauseMenu(); });

// ===================== MENU ART + MAIN LOOP =====================
function drawCharCanvas(cvs, id, t) { const c = cvs.getContext("2d"), w = cvs.width, h = cvs.height; c.clearRect(0, 0, w, h); c.save(); c.translate(w / 2, h * 0.58); CHARS.byId(id).draw(c, t, w * 0.3, 0); c.restore(); }
function drawHero(cvs, t) {
  const c = cvs.getContext("2d"), w = cvs.width, h = cvs.height, win = cvs.dataset.hero === "win";
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0b1240"); g.addColorStop(1, "#2a3a8a"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = "#fff"; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % w, (i * 53) % (h * 0.6), 2, 2);
  c.fillStyle = "#4d5f93"; c.fillRect(0, h - 40, w, 40); c.fillStyle = "#d8f0ff"; c.fillRect(0, h - 40, w, 6);
  for (const [x, y] of [[180, 150], [300, 110], [420, 150]]) { c.fillStyle = "#8fa9d8"; c.fillRect(x, y, 90, 10); }
  for (let k = 0; k < 5; k++) { const x = 120 + k * 90, y = 70 + Math.sin(t * 3 + k) * 6; c.fillStyle = "#8fe9dc"; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 6, y); c.lineTo(x, y + 9); c.lineTo(x - 6, y); c.fill(); }
  drawStar(c, w * 0.86, 60 + Math.sin(t * 2) * 5, 18, t, "#ffd25d");
  const ids = win ? [alien] : ALIENS;
  ids.forEach((id, k) => { const x = win ? w * 0.5 : w * (0.22 + k * 0.28), arc = Math.abs(Math.sin(t * 2.4 + k * 1.3)); c.save(); c.translate(x, h - 70 - arc * (win ? 60 : 70)); CHARS.byId(id).draw(c, t, 30, 0); c.restore(); });
}
let last = performance.now(), acc = 0, artT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const t = now / 1000;
  if (L && phase === "play") {
    acc += dt; let n = 0;
    while (acc >= DT && n < 12 && phase === "play") { step(DT); acc -= DT; n++; }
    if (n >= 12) acc = 0;
    musicTick();
    if (Math.floor(elapsed) !== Math.floor(elapsed - dt)) $("hudTime").textContent = fmtTime(elapsed);
  }
  if (L) { if (phase === "play" || phase === "done") { camera(dt); if (phase === "done") stepWorld(dt); } render(t, dt); }
  else { cx.setTransform(DPR, 0, 0, DPR, 0, 0); const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, "#050817"); g.addColorStop(1, "#14204f"); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH); }
  artT += dt;
  if (artT > 1 / 30) {
    artT = 0;
    if (L) drawCharCanvas($("hudFace"), alien, t);
    if (!overlay.hidden) { panel.querySelectorAll("canvas[data-char]").forEach(c => drawCharCanvas(c, c.dataset.char, t)); panel.querySelectorAll("canvas[data-hero]").forEach(c => drawHero(c, t)); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
mainMenu();
