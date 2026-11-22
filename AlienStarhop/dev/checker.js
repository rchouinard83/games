// Proves levels are beatable with the game's own physics. Usage: node checker.js [index...]
const fs = require("fs"), vm = require("vm");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/chunks.js", "utf8") + "\n" + fs.readFileSync(__dirname + "/core.js", "utf8") + "\nthis.API={CHUNKS,buildLevel,stepPlayer,newPlayer,PH,TILE,ROWS,TOTAL_LEVELS,isBoss,DT};", ctx);
const { CHUNKS, buildLevel, stepPlayer, newPlayer, PH, TILE, ROWS, TOTAL_LEVELS, isBoss, DT } = ctx.API;

function validateChunks() {
  let bad = 0;
  for (const c of CHUNKS) {
    if (c.rows.length !== 14) { console.log("rows", c.id, c.rows.length); bad++; }
    const w = c.rows[0].length;
    c.rows.forEach((r, i) => { if (r.length !== w) { console.log("width", c.id, "row", i, r.length, "vs", w); bad++; } });
    if (c.id !== "boss") for (const x of [0, 1, w - 2, w - 1]) {
      for (let y = 11; y < 14; y++) if (c.rows[y][x] !== "#") { console.log("edge floor", c.id, x, y); bad++; }
      for (let y = 4; y < 11; y++) if (!".A".includes(c.rows[y][x])) { console.log("edge open", c.id, x, y, c.rows[y][x]); bad++; }
    }
  }
  return bad;
}
// Checker copy of a level: moving-platform tracks become one-way ledges, crates are treated as breakable (open).
function prep(lv) {
  const t = lv.t.slice(), at = (x, y) => y * lv.w + x;
  for (let i = 0; i < t.length; i++) if (t[i] === "B") t[i] = ".";
  const ms = lv.ents.filter(e => e.type === "m"), ns = lv.ents.filter(e => e.type === "n");
  for (const m of ms) { const n = ns.filter(n => n.y === m.y).sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0]; if (!n) continue;
    for (let x = Math.min(m.x, n.x); x <= Math.max(m.x, n.x) + 2; x++) if (t[at(x, m.y)] === ".") t[at(x, m.y)] = "_"; }
  const Ms = lv.ents.filter(e => e.type === "M"), Ns = lv.ents.filter(e => e.type === "N");
  for (const m of Ms) { const n = Ns.filter(n => n.x === m.x).sort((a, b) => Math.abs(a.y - m.y) - Math.abs(b.y - m.y))[0]; if (!n) continue;
    for (let y = Math.min(m.y, n.y); y <= Math.max(m.y, n.y); y++) for (let x = m.x; x <= m.x + 2; x++) if (t[at(x, y)] === ".") t[at(x, y)] = "_"; }
  return { w: lv.w, t, ents: lv.ents };
}
const ACTIONS = [];
for (const dir of [-1, 0, 1]) for (const hold of [0, 0.1, 0.35]) for (const dbl of [-1, 0.2, 0.38]) for (const dash of [-1, 0.15, 0.32, 0.5, 0.7, 0.85]) {
  if (dir === 0 && hold === 0) continue;
  ACTIONS.push({ dir, hold, dbl, dash });
}
for (const dir of [-1, 1]) for (const mode of ["chimney", "wall"]) for (const dbl of [-1, 0.3]) ACTIONS.push({ dir, hold: 9, dbl, dash: -1, climb: mode });

function check(lv0) {
  const lv = prep(lv0), A = lv.ents.find(e => e.type === "A");
  const startX = A.x * TILE + (TILE - PH.pw) / 2, startY = (A.y + 1) * TILE - PH.ph;
  const seen = new Set(), queue = [[startX, startY]], touched = new Set();
  const key = p => `${Math.floor((p.x + PH.pw / 2) / TILE)},${Math.floor((p.y + PH.ph + 1) / TILE)}`;
  seen.add(key({ x: startX, y: startY }));
  let sims = 0;
  while (queue.length) {
    const [sx, sy] = queue.shift();
    for (const a of ACTIONS) {
      sims++;
      const p = newPlayer(sx, sy); p.onGround = true;
      let dir = a.dir, t = 0, left = false;
      for (let step = 0; step < 300; step++, t += DT) {
        const inp = { l: dir < 0, r: dir > 0, down: false, downP: false, jumpP: false, jumpH: false, dashP: false };
        if (a.climb) {
          inp.jumpH = true;
          if (step === 0) inp.jumpP = true;
          if (p.wall && p.vy > -150 && !p.onGround) inp.jumpP = true;
          if (a.dbl > 0 && Math.abs(t - a.dbl) < DT / 2) inp.jumpP = true;
          if (a.climb === "chimney") dir = p.lock > 0 ? Math.sign(p.vx) || dir : dir; else if (p.wall) dir = p.wall;
          inp.l = dir < 0; inp.r = dir > 0;
        } else {
          if (a.hold > 0) { if (step === 0) inp.jumpP = true; inp.jumpH = t < a.hold; }
          if (a.dbl > 0 && t >= a.dbl - DT / 2) { if (t - a.dbl < DT / 2) inp.jumpP = true; inp.jumpH = t < a.dbl + 0.4; }
          if (a.dash > 0 && Math.abs(t - a.dash) < DT / 2) inp.dashP = true;
        }
        stepPlayer(p, inp, lv, null);
        const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + PH.pw) / TILE), y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + PH.ph) / TILE);
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) touched.add(tx + "," + ty);
        if (p.dead) break;
        if (!p.onGround) left = true;
        if (p.onGround && (left || a.hold === 0)) {
          const k = key(p);
          if (!seen.has(k)) { seen.add(k); queue.push([p.x, p.y]); }
          if (left && !a.climb) break;
        }
      }
    }
  }
  const hit = e => touched.has(e.x + "," + e.y);
  const E = lv.ents.find(e => e.type === "E"), shards = lv.ents.filter(e => e.type === "*"), cage = lv.ents.find(e => e.type === "K");
  const maxCol = Math.max(...[...seen].map(k => +k.split(",")[0]));
  return { maxCol, exit: !!E && hit(E), shards: shards.filter(hit).length, cage: !cage || hit(cage), states: seen.size, sims,
    missing: [...shards.filter(e => !hit(e)), ...(cage && !hit(cage) ? [cage] : []), ...(E && !hit(E) ? [E] : [])].map(e => e.type + "@" + e.x + "," + e.y) };
}
module.exports = { check, buildLevel, CHUNKS, TOTAL_LEVELS, isBoss, validateChunks };
if (require.main === module) {
  const bad = validateChunks(); console.log("chunk problems:", bad);
  const which = process.argv.slice(2).map(Number);
  const list = which.length ? which : Array.from({ length: TOTAL_LEVELS }, (_, i) => i);
  const variants = [];
  for (const i of list) {
    if (isBoss(i)) { variants[i] = 0; continue; }
    let found = -1, last = null; const t0 = Date.now();
    for (let v = 0; v < (i === 0 ? 1 : 40); v++) {
      const lv = buildLevel(i, v); if (!lv.ok) continue;
      const r = check(lv); last = r;
      if (r.exit && r.shards === 3 && r.cage) { found = v; break; }
    }
    variants[i] = found;
    console.log(`level ${i}: variant ${found} ${found < 0 ? "FAILED " + JSON.stringify(last && last.missing) : ""} (${Date.now() - t0}ms, states ${last && last.states})`);
  }
  fs.writeFileSync(__dirname + "/variants.json", JSON.stringify(variants));
}
