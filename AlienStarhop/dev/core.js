// ===================== CORE (pure JS, no DOM): tiles, physics, level building =====================
const TILE = 32, ROWS = 14, DT = 1 / 120;
// Movement tuning (pixels, seconds). Jump ~4.3 tiles, double jump ~3.5 more, single-jump gap ~5 tiles.
const PH = {
  run: 300, accG: 3200, accA: 2300, fric: 3000, grav: 2600, fallMul: 1.7, maxFall: 820,
  jumpV: 850, doubleV: 760, coyote: 0.1, buffer: 0.12,
  wallSlide: 150, wallJumpVX: 340, wallJumpVY: 800, wallLock: 0.15,
  dashV: 720, dashT: 0.15, poundV: 1100, springV: 1250, cloudV: 1050, padV: 620, padT: 0.7,
  lowGrav: 0.45, windUp: 2500, windSide: 900,
  pw: 20, ph: 28,
};
// Tile legend. Solid: # B C ; one-way: = O m-track ; hazards: ^ L ; zones: w r l z ; pads: > < ; items/entities handled by the level builder.
const SOLID = new Set(["#", "B", "C"]), ONEWAY = new Set(["=", "O", "_"]);

function tileAt(lv, tx, ty) { if (tx < 0 || tx >= lv.w) return "#"; if (ty < 0) return "."; if (ty >= ROWS) return "."; return lv.t[ty * lv.w + tx]; }
function isSolid(lv, tx, ty) {
  const c = tileAt(lv, tx, ty);
  if (c === "C" && lv.crumbled && lv.crumbled[ty * lv.w + tx] > 0) return false;
  if (c === "B" && lv.broken && lv.broken[ty * lv.w + tx]) return false;
  return SOLID.has(c);
}
function newPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, onGround: false, coyote: 0, buf: 0, canDouble: true, dash: 1, dashT: 0, dashDir: 1, wall: 0, lock: 0,
    pound: false, facing: 1, padT: 0, dead: false, deadBy: "", landed: false, pounded: false, sprung: false, doubled: false, dashed: false, wallJumped: false, jumped: false, standOn: null, events: [] };
}
// One fixed step. inp: { l, r, down, downP, jumpP, jumpH, dashP }. plats: moving platforms [{x,y,w,vx,vy}] (one-way, carry the player).
function stepPlayer(p, inp, lv, plats, dt = DT) {
  p.events.length = 0;
  const cx = p.x + PH.pw / 2, cy = p.y + PH.ph / 2, zone = tileAt(lv, Math.floor(cx / TILE), Math.floor(cy / TILE));
  if (inp.jumpP) p.buf = PH.buffer; else p.buf = Math.max(0, p.buf - dt);
  p.coyote = p.onGround ? PH.coyote : Math.max(0, p.coyote - dt);
  p.lock = Math.max(0, p.lock - dt); p.padT = Math.max(0, p.padT - dt);
  const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  if (dir && p.lock <= 0) p.facing = dir;
  // Dash: a short burst in the held (or facing) direction, no gravity.
  if (inp.dashP && p.dash > 0 && p.dashT <= 0 && !p.pound) { p.dash--; p.dashT = PH.dashT; p.dashDir = dir || p.facing; p.events.push("dash"); p.dashed = true; }
  if (p.dashT > 0) {
    p.dashT -= dt; p.vx = p.dashDir * PH.dashV; p.vy = 0;
  } else if (p.pound) {
    p.vx = 0; p.vy = PH.poundV;
  } else {
    const max = p.padT > 0 ? PH.padV : PH.run;
    const want = p.lock > 0 ? p.vx : dir * PH.run;
    const acc = p.onGround ? (dir ? PH.accG : PH.fric) : PH.accA;
    if (p.padT > 0 && !dir) { /* keep the boost */ }
    else if (p.vx < want) p.vx = Math.min(want, p.vx + acc * dt); else if (p.vx > want) p.vx = Math.max(want, p.vx - acc * dt);
    if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * max;
    let g = PH.grav * (zone === "z" ? PH.lowGrav : 1);
    if (p.vy > 0 || !inp.jumpH) g *= PH.fallMul;
    p.vy += g * dt;
    if (zone === "w") { p.vy -= PH.windUp * dt; if (p.vy < -520) p.vy = -520; p.canDouble = true; }
    if (zone === "r") p.vx += PH.windSide * dt; if (zone === "l") p.vx -= PH.windSide * dt;
    const slide = p.wall && !p.onGround && p.vy > 0 && dir === p.wall;
    p.vy = Math.min(p.vy, slide ? PH.wallSlide : PH.maxFall);
    // Jumps: ground/coyote first, then wall jump, then double jump.
    if (p.buf > 0 && (p.onGround || p.coyote > 0)) { p.vy = -PH.jumpV; p.buf = 0; p.coyote = 0; p.onGround = false; p.events.push("jump"); p.jumped = true; }
    else if (p.buf > 0 && p.wall && !p.onGround) { p.vy = -PH.wallJumpVY; p.vx = -p.wall * PH.wallJumpVX; p.lock = PH.wallLock; p.facing = -p.wall; p.buf = 0; p.events.push("walljump"); p.wallJumped = true; }
    else if (inp.jumpP && p.canDouble && !p.onGround) { p.vy = -PH.doubleV; p.canDouble = false; p.buf = 0; p.events.push("double"); p.doubled = true; }
    if (inp.downP && !p.onGround && !p.pound) { p.pound = true; p.vy = PH.poundV; p.events.push("pound"); }
  }
  // Move and collide, X then Y.
  const wasGround = p.onGround; p.onGround = false; p.standOn = null;
  moveX(p, p.vx * dt, lv);
  const prevBottom = p.y + PH.ph;
  moveY(p, p.vy * dt, lv, prevBottom, inp.down && wasGround, plats);
  // Wall contact (for slides and wall jumps).
  p.wall = 0;
  if (!p.onGround) {
    const top = Math.floor((p.y + 4) / TILE), bot = Math.floor((p.y + PH.ph - 4) / TILE);
    for (let ty = top; ty <= bot; ty++) {
      if (isSolid(lv, Math.floor((p.x + PH.pw + 1) / TILE), ty)) p.wall = 1;
      if (isSolid(lv, Math.floor((p.x - 1) / TILE), ty)) p.wall = -1;
    }
  }
  if (p.onGround) {
    if (!wasGround) { p.events.push(p.pound ? "poundland" : "land"); if (p.pound) p.pounded = true; }
    p.pound = false; p.canDouble = true; if (p.dashT <= 0) p.dash = 1;
    // Floor specials under the feet.
    const fy = Math.floor((p.y + PH.ph + 1) / TILE);
    for (const fx of [Math.floor((p.x + 2) / TILE), Math.floor((p.x + PH.pw - 2) / TILE)]) {
      const c = tileAt(lv, fx, fy);
      if (c === "S") { p.vy = -PH.springV; p.onGround = false; p.canDouble = true; p.dash = 1; p.events.push("spring"); p.sprung = true; break; }
      if (c === "O") { p.vy = -PH.cloudV; p.onGround = false; p.canDouble = true; p.events.push("cloud"); break; }
      if (c === ">" || c === "<") { p.padT = PH.padT; p.vx = (c === ">" ? 1 : -1) * PH.padV; p.events.push("pad"); }
      if (c === "C") p.events.push("crumble:" + fx + "," + fy);
    }
  }
  // Hazards.
  const hx0 = Math.floor((p.x + 3) / TILE), hx1 = Math.floor((p.x + PH.pw - 3) / TILE), hy0 = Math.floor((p.y + 4) / TILE), hy1 = Math.floor((p.y + PH.ph - 1) / TILE);
  for (let ty = hy0; ty <= hy1; ty++) for (let tx = hx0; tx <= hx1; tx++) {
    const c = tileAt(lv, tx, ty);
    if (c === "L") { p.dead = true; p.deadBy = "lava"; }
    // Spikes fill the lower half of their tile.
    if (c === "^" && p.y + PH.ph > ty * TILE + TILE * 0.5) { p.dead = true; p.deadBy = "spikes"; }
  }
  if (p.y > ROWS * TILE + 40) { p.dead = true; p.deadBy = "pit"; }
}
function moveX(p, dx, lv) {
  p.x += dx;
  const top = Math.floor((p.y + 1) / TILE), bot = Math.floor((p.y + PH.ph - 1) / TILE);
  if (dx > 0) {
    const tx = Math.floor((p.x + PH.pw) / TILE);
    for (let ty = top; ty <= bot; ty++) if (isSolid(lv, tx, ty)) { p.x = tx * TILE - PH.pw - 0.01; p.vx = 0; if (p.dashT > 0) p.events.push("bump:" + tx + "," + ty); break; }
  } else if (dx < 0) {
    const tx = Math.floor(p.x / TILE);
    for (let ty = top; ty <= bot; ty++) if (isSolid(lv, tx, ty)) { p.x = (tx + 1) * TILE + 0.01; p.vx = 0; if (p.dashT > 0) p.events.push("bump:" + tx + "," + ty); break; }
  }
}
function moveY(p, dy, lv, prevBottom, dropThrough, plats) {
  p.y += dy;
  const l = Math.floor((p.x + 1) / TILE), r = Math.floor((p.x + PH.pw - 1) / TILE);
  if (dy > 0) {
    const bottom = p.y + PH.ph, ty = Math.floor(bottom / TILE);
    for (let tx = l; tx <= r; tx++) {
      const c = tileAt(lv, tx, ty);
      const oneway = ONEWAY.has(c) || c === "S" || c === ">" || c === "<";
      if (isSolid(lv, tx, ty) || (oneway && prevBottom <= ty * TILE + 0.5 && !(dropThrough && (c === "=" || c === "_")))) {
        p.y = ty * TILE - PH.ph; p.vy = 0; p.onGround = true; break;
      }
    }
    if (!p.onGround && plats) for (const m of plats) {
      if (p.x + PH.pw > m.x + 2 && p.x < m.x + m.w - 2 && prevBottom <= m.y + 1 && p.y + PH.ph >= m.y && !dropThrough) { p.y = m.y - PH.ph; p.vy = 0; p.onGround = true; p.standOn = m; break; }
    }
  } else if (dy < 0) {
    const ty = Math.floor(p.y / TILE);
    for (let tx = l; tx <= r; tx++) if (isSolid(lv, tx, ty)) { p.y = (ty + 1) * TILE; p.vy = 0; p.events.push("head:" + tx + "," + ty); break; }
  }
}

// ===================== LEVEL BUILDING =====================
// Each level is a run of hand-made chunks (14 rows tall). Every chunk starts and ends on floor (rows 11-13 solid in its two edge columns),
// so any order works. A seed picks the chunks, may mirror them, and decides which candidate spots hold the 3 Star Shards and the caged buddy.
const WORLDS = [
  { id: "oort", name: "Oort Gate", sub: "Ice station on the edge of the system", world: 0, enemies: { g: "Goo", h: "Chonk", f: "Jelly*", t: "Probe" }, boss: "Mother Blob" },
  { id: "jupiter", name: "Jupiter", sub: "Storm clouds, gusts and bounce pads", world: 1, enemies: { g: "Stalker", h: "Brute", f: "Shrieker", t: "Skitter" }, boss: "Hive Queen" },
  { id: "mars", name: "Mars", sub: "Crumbling cliffs over hot lava", world: 2, enemies: { g: "Hover Pod", h: "Hover Tank", f: "Saucer", t: "Probe" }, boss: "Command Ship" },
  { id: "earth", name: "Earth", sub: "The final stand against the Armada", world: 3, enemies: { g: "Tripod", h: "Juggernaut", f: "Phase Saucer", t: "Nanite Trio" }, boss: "Mothership" },
];
const LEVELS_PER_WORLD = 10, TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;
const isBoss = i => i % LEVELS_PER_WORLD === LEVELS_PER_WORLD - 1;
const isChase = i => i % LEVELS_PER_WORLD === 5;
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MIRROR = { ">": "<", "<": ">", r: "l", l: "r" };
const mirrorRows = rows => rows.map(r => [...r].reverse().map(c => MIRROR[c] || c).join(""));
// Builds level `index` with build variant `variant` (the checker picks a variant that is fully beatable).
function buildLevel(index, variant = 0) {
  const w = Math.floor(index / LEVELS_PER_WORLD), k = index % LEVELS_PER_WORLD, W = WORLDS[w];
  const rand = mulberry32(hashStr(`starhop|${index}|${variant}`));
  let parts;
  if (isBoss(index)) parts = [CHUNKS.find(c => c.id === "boss").rows];
  else if (index === 0) parts = ["start", "t_jump", "t_double", "t_wall", "t_dash", "t_pound", "end"].map(id => CHUNKS.find(c => c.id === id).rows);
  else {
    const maxDiff = k < 3 ? 1 : k < 6 ? 2 : 3, n = 4 + Math.floor(k / 2) + (w >= 2 ? 1 : 0);
    const pool = CHUNKS.filter(c => c.diff && c.diff <= maxDiff && (c.worlds === "all" || c.worlds.includes(W.id)) && !(isChase(index) && c.noChase));
    const sig = pool.filter(c => c.worlds !== "all"), picks = [];
    // At least two chunks show off this world's own gimmick.
    for (let i = 0; i < 2 && sig.length; i++) picks.push(sig.splice(Math.floor(rand() * sig.length), 1)[0]);
    const rest = pool.filter(c => !picks.includes(c));
    while (picks.length < n && rest.length) picks.push(rest.splice(Math.floor(rand() * rest.length), 1)[0]);
    for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
    parts = [CHUNKS.find(c => c.id === "start").rows];
    picks.forEach((c, i) => { parts.push(rand() < 0.5 ? mirrorRows(c.rows) : c.rows); if (i === Math.floor(picks.length / 2) - 1) parts.push(CHUNKS.find(c => c.id === "checkpoint").rows); });
    parts.push(CHUNKS.find(c => c.id === "end").rows);
  }
  const rows = Array.from({ length: ROWS }, (_, y) => parts.map(p => p[y]).join(""));
  const width = rows[0].length, t = [], ents = [], shardSpots = [], cageSpots = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < width; x++) {
    let c = rows[y][x];
    if ("gohftmnMNdKP*AEi".includes(c)) {
      if (c === "*") shardSpots.push({ x, y }); else if (c === "K") cageSpots.push({ x, y }); else ents.push({ type: c, x, y });
      t.push("."); continue;
    }
    t.push(c);
  }
  // Star shards: three spots spread along the level. Cage: one spot. Unused candidates become gems.
  shardSpots.sort((a, b) => a.x - b.x);
  const chosen = [];
  if (shardSpots.length >= 3) { const third = shardSpots.length / 3; for (let i = 0; i < 3; i++) chosen.push(shardSpots[Math.floor(i * third + rand() * third)]); }
  for (const s of shardSpots) ents.push({ type: chosen.includes(s) ? "*" : "o", x: s.x, y: s.y, shard: chosen.indexOf(s) });
  const cage = cageSpots.length ? cageSpots[Math.floor(rand() * cageSpots.length)] : null;
  for (const s of cageSpots) ents.push({ type: s === cage ? "K" : "o", x: s.x, y: s.y });
  return { index, w: width, t, ents, world: w, boss: isBoss(index), chase: isChase(index), ok: chosen.length === 3 && (!!cage || isBoss(index)) };
}
