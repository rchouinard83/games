"use strict";

const COLS = 10, ROWS = 15;

// ============================================================
//  CAMPAIGN: the four worlds from the backstory (backstory.html)
//  '.' open · '+' buildable scenery · '#' obstacle · '~' hazard · 'S' portal · 'E' base
// ============================================================
const WORLDS = [
  { name: "The Oort Gate", where: "Oort Cloud · 50,000 AU from the Sun", theme: "ice", stage: 0, hpOffset: 0, startGold: 60, goldMul: 1.0,
    desc: "Ice asteroids and debris at the edge of the solar system.",
    story: ["The fleet enters the solar system through the Oort Cloud, a vast frozen shell of ice and rock.",
      "You're the first wall. Your defenses are salvaged from dead stations, cobbled together from debris. But the fleet is spread thin out here, and the cold is your ally.",
      "Buy time. Learn. Survive."],
    obstacles: "Ice asteroids and debris you can build around", enemy: "Their scouts: soft, strange creatures bred for the cold",
    win: "The first attack shatters on the ice. But the fleet is already moving inward, toward the gas giants.",
    rows: ["....S.....", "..........", ".##.......", ".##...##..", "......##..", "..........", "...##.....", "...##.....",
           ".......##.", ".......##.", ".##.......", ".##..##...", ".....##...", "..........", "....E....."] },
  { name: "Jupiter's Maw", where: "Jupiter's orbit · 5.2 AU from the Sun", theme: "jupiter", stage: 1, hpOffset: 3, startGold: 150, goldMul: 1.2,
    desc: "Radiation belts and an asteroid ring.",
    story: ["The fleet pushes past the outer worlds. Jupiter looms behind you.",
      "You can't build in the radiation belts. Ground troops have to use the gaps, but flyers cross straight over them.",
      "The hunters are tougher than the Oort scouts. Cover the gaps with ground defenses and keep something that can hit flyers."],
    obstacles: "Radiation belts funnel ground troops · ring asteroids block building", enemy: "Their hunters: fanged, armored and many-eyed",
    win: "Jupiter's storms swallow what's left of the attack. The survivors take to their ships and burn for Mars.",
    rows: ["....S.....", "..........", "..........", "~~~~~~..~~", "..........", "..#....#..", "..........", "~~..~~~~~~",
           "..........", "..#....#..", "..........", "~~~~~~..~~", "..........", "..........", "....E....."] },
  { name: "Mars, the Red Wall", where: "Mars · 1.5 AU from the Sun", theme: "mars", stage: 2, hpOffset: 6, startGold: 280, goldMul: 1.45,
    desc: "Canyon walls and red desert.",
    story: ["The inner solar system. Mars is the last natural barrier before Earth.",
      "The canyons are your kill zones: make them walk the long way through the crevices while your towers fire from above.",
      "The aliens have taken to their ships. Hover pods follow the canyons, while saucers fly straight for the relay. Every ship that gets through is a threat to Earth."],
    obstacles: "Canyon walls that bend their path", enemy: "Their ships: hover pods, speeders, saucers and hover tanks",
    win: "The Red Wall holds. But not every ship was stopped. The Armada is heading for Earth.",
    rows: [".........S", "..........", "..#.......", "..#..###..", "..#.......", "..#.......", "..#####...", "..........",
           "..........", "....#####.", ".......#..", ".......#..", "..###..#..", "..........", "E........."] },
  { name: "Earth, Final Stand", where: "Earth · 1 AU from the Sun", theme: "earth", stage: 3, hpOffset: 9, startGold: 480, goldMul: 1.8,
    desc: "City blocks and narrow streets.",
    story: ["You're home. The fleet is here. Cities burn and the sky is full of their ships.",
      "Your towers are the future you're fighting for: energy weapons, plasma, quantum targeting. Build in the streets between the buildings.",
      "If you hold Earth, the fleet breaks. If you fall, everything ends."],
    obstacles: "City blocks with narrow streets", enemy: "The Armada: their best machines, and the Mothership",
    win: "Earth's relay is still transmitting. The Armada's main assault is over, though scattered ships are still coming through.",
    rows: ["S.........", "..........", ".##.##.##.", ".##.##.##.", "..........", "..##.##.##", "..##.##.##", "..........",
           ".##.##.##.", ".##.##.##.", "..........", "..##..##..", "..##..##..", "..........", "....E....."] },
];
function parseWorld(w) {
  const m = { name: w.name, desc: w.desc, rocks: [], hazards: [], scenery: [] };
  w.rows.forEach((row, y) => { for (let x = 0; x < COLS; x++) { const ch = row[x];
    if (ch === "#") m.rocks.push([x, y]); else if (ch === "~") m.hazards.push([x, y]);
    else if (ch === "+") m.scenery.push([x, y]);
    else if (ch === "S") m.entry = { x, y }; else if (ch === "E") m.exit = { x, y }; } });
  return m;
}
const MAPS = WORLDS.map(parseWorld);
const MAP_VARIANTS = 5;
const FIRST_CURRENT_VARIANT = 6; // Original and first-generation layout IDs remain valid for saves.

const CAMPAIGN_LAYOUTS = [
  [
    { name: "Ice Shelf", rows: {
      2: "#..+....#.", 3: "##.....##.", 5: "....###...", 6: "......##..",
      8: "..#.....+.", 9: ".###......", 10: "..#...#...", 12: ".....###..",
    } },
    { name: "Broken Floes", rows: {
      2: "..#....+..", 3: ".......#..", 4: "...##..##.", 5: "...#......",
      7: "##...#....", 8: ".....#..#.", 9: ".....#....", 11: ".+..###...",
      13: "......#...",
    } },
    { name: "Comet Trail", rows: {
      2: ".#.....#..", 3: "..#..+....", 4: "...#.....#", 6: "...##.....",
      7: "....##..+.", 8: ".....#....", 10: ".#......#.", 11: "##.....##.",
      12: "......#...",
    } },
    { name: "Frozen Basin", rows: {
      3: "..###.....", 4: ".#...#....", 5: ".#.+......", 6: "..#...##..",
      8: "....+...#.", 9: ".....#..#.", 10: "....#.....", 12: ".##.....##",
      13: "..#......#",
    } },
    { name: "Shattered Ridge", rows: {
      2: "...#......", 3: "...##...+.", 4: "...#....#.", 6: ".##...#...",
      7: ".#...###..", 8: ".......#..", 10: "....#....#", 11: "..+......#",
      12: "..###.....",
    } },
  ],
  [
    { name: "Outer Belt", rows: {
      2: ".#......+.", 4: "~~~~~~...~", 6: ".......#..", 8: "..+....#..",
      10: "~...~~~~~~", 12: "......##..",
    } },
    { name: "Crossing Lanes", rows: {
      2: "..#.....#.", 4: "~~~...~~~~", 6: ".....+....", 7: "##......##",
      9: "......+...", 11: "~~~~~~...~", 13: "...#......",
    } },
    { name: "Storm Break", rows: {
      2: ".....#....", 4: "~~...~~..~", 6: ".+......#.", 7: ".#......#.",
      9: "~~~~~~...~", 11: "..##.....+", 12: "..#.......",
    } },
    { name: "Ring Outpost", rows: {
      2: "...##.....", 4: "~~~~~...~~", 6: ".+.....#..", 7: ".......#..",
      9: "~...~~~~~~", 11: ".....+....", 12: ".....###..",
    } },
    { name: "Split Radiation", rows: {
      2: ".+....##..", 4: "~~~..~~..~", 6: "...#......", 7: "...#...+..",
      8: "...##.....", 10: "~~...~~~~~", 12: ".......##.",
    } },
  ],
  [
    { name: "Dry River", rows: {
      2: "...#......", 3: "...#...+..", 4: "...###....", 6: ".....###..",
      7: ".......#..", 8: "..+....#..", 10: "..#####...", 11: "..#.......",
      12: "..#...+...",
    } },
    { name: "Red Mesa", rows: {
      2: "..+.....#.", 4: "..####....", 5: "..####....", 6: "...##.....",
      8: ".......###", 9: "......##..", 10: "..+...#...", 12: ".###......",
      13: "...#......",
    } },
    { name: "Twin Ravines", rows: {
      2: "..#....#..", 3: "..#....#..", 4: "..#.......", 5: "..###.....",
      7: ".....+....", 8: ".....###..", 9: ".......#..", 10: "..#....#..",
      11: "..#.......", 12: "..#.....+.",
    } },
    { name: "Landing Scar", rows: {
      2: ".....+....", 3: "....#.....", 4: "...###....", 5: "..###.....",
      7: "......#...", 8: "....+.#...", 9: "......###.", 11: ".#####....",
      12: ".....#....", 13: ".....#....",
    } },
    { name: "Canyon Steps", rows: {
      2: "......##..", 3: ".......#..", 4: ".......##.", 6: "...####...",
      7: "...#......", 8: "...#....+.", 10: "#......#..", 11: "###....##.",
      12: "..#.......", 13: "..#..+....",
    } },
  ],
  [
    { name: "Central Park", rows: {
      2: ".###...##.", 3: ".###...##.", 4: "..........", 5: "..++++....",
      6: "..++++.###", 7: "..++++.###", 9: ".##.......", 10: ".##..####.",
      11: ".....####.", 13: ".###......",
    } },
    { name: "Grand Avenue", rows: {
      2: "###....###", 3: "###....###", 5: ".##....##.", 6: ".##.++.##.",
      7: "....++....", 9: "###....###", 10: "###....###", 12: ".##....##.",
      13: ".##....##.",
    } },
    { name: "Market Square", rows: {
      2: "..####....", 3: "..####..#.", 4: "........#.", 6: "##..+++...",
      7: "##..+++..#", 8: ".........#", 9: ".###......", 10: ".###..###.",
      11: "......###.", 13: "..+.......",
    } },
    { name: "Old Town", rows: {
      2: ".##.###...", 3: ".##.#.....", 4: "....#..##.", 5: ".......##.",
      7: "..###.....", 8: "..#...++..", 9: "..#...++..", 10: ".....####.",
      12: ".##.......", 13: ".##...###.",
    } },
    { name: "Civic District", rows: {
      2: "...##..###", 3: "...##..###", 5: ".###......", 6: ".###..++..",
      7: "......++..", 8: "..##..++..", 9: "..##......", 11: ".....####.",
      12: ".##..####.", 13: ".##.......",
    } },
  ],
];

function variantMap(world, variant) {
  if (variant === 0) return MAPS[world]; // preserve the original layout for older saves
  if (variant >= FIRST_CURRENT_VARIANT) {
    const layout = CAMPAIGN_LAYOUTS[world][variant - FIRST_CURRENT_VARIANT];
    const rows = Array(ROWS).fill(".".repeat(COLS));
    for (const [row, tiles] of Object.entries(layout.rows)) rows[row] = tiles;
    rows[0] = WORLDS[world].rows[0];
    rows[ROWS - 1] = WORLDS[world].rows[ROWS - 1];
    return parseWorld({ ...WORLDS[world], rows });
  }
  const rows = WORLDS[world].rows.slice();
  let seed = Math.imul(world * MAP_VARIANTS + variant, 0x9e3779b9);
  const pick = size => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor(seed / 4294967296 * size);
  };
  let beltSide;
  for (let start = 0; start < rows.length; start++) {
    const row = rows[start];
    if (row.includes("~")) {
      // Alternate Jupiter's openings across the board to keep the belts from lining up.
      beltSide ??= pick(2);
      const gap = beltSide * (COLS - 4) + pick(3);
      beltSide = 1 - beltSide;
      rows[start] = "~".repeat(gap) + ".." + "~".repeat(COLS - gap - 2);
      continue;
    }
    if (!row.includes("#")) continue;
    let end = start + 1;
    while (end < rows.length && rows[end].includes("#")) end++;
    // Move whole bands so asteroid clusters, canyon walls and city blocks stay recognizable.
    const mirror = pick(2) === 1;
    const band = rows.slice(start, end).map(line => mirror ? [...line].reverse().join("") : line);
    const left = Math.min(...band.map(line => line.indexOf("#")));
    const right = Math.max(...band.map(line => line.lastIndexOf("#")));
    const offset = pick(COLS - (right - left));
    for (let y = start; y < end; y++) {
      rows[y] = (".".repeat(offset) + band[y - start].slice(left, right + 1)).padEnd(COLS, ".");
    }
    start = end - 1;
  }
  return parseWorld({ ...WORLDS[world], rows });
}

// ============================================================
//  WORLD THEMES: the ground, obstacles and hazards of each world
// ============================================================
const TAU0 = Math.PI * 2;
function hash2(x, y, k = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }
function rrc(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
function lump(c, x, y, k, rx = 0.38, ry = 0.34) { c.beginPath(); for (let j = 0; j < 9; j++) { const a = j / 9 * TAU0, r = 0.8 + 0.2 * hash2(x, y, j + k); c.lineTo(x + 0.5 + Math.cos(a) * rx * r, y + 0.5 + Math.sin(a) * ry * r); } c.closePath(); }
const THEMES = {
  ice: {
    ground(c) {
      c.fillStyle = "#0a1222"; c.fillRect(0, 0, COLS, ROWS);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (hash2(x, y, 5) < 0.3) { c.fillStyle = "rgba(110,160,230,0.07)"; c.beginPath(); c.ellipse(x + 0.5, y + 0.5, 0.7, 0.45, hash2(x, y, 6) * 3, 0, TAU0); c.fill(); }
        for (let k = 0; k < 2; k++) if (hash2(x, y, k + 1) < 0.45) { c.fillStyle = `rgba(210,230,255,${0.2 + 0.5 * hash2(x, y, k + 3)})`; c.fillRect(x + hash2(x, y, k + 7), y + hash2(x, y, k + 9), 0.035, 0.035); }
      }
    },
    grid: "rgba(150,190,255,0.08)",
    rock(c, x, y) { // ice asteroid
      c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(x + 0.55, y + 0.84, 0.4, 0.12, 0, 0, TAU0); c.fill();
      const g = c.createLinearGradient(x, y, x + 1, y + 1); g.addColorStop(0, "#dceeff"); g.addColorStop(1, "#4a6f9e");
      c.fillStyle = g; lump(c, x, y, 0, 0.44, 0.4); c.fill();
      c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 0.03; c.beginPath(); c.moveTo(x + 0.28, y + 0.36); c.lineTo(x + 0.5, y + 0.52); c.lineTo(x + 0.7, y + 0.4); c.stroke();
    },
  },
  jupiter: {
    ground(c) {
      c.fillStyle = "#170f0c"; c.fillRect(0, 0, COLS, ROWS);
      for (let y = 0; y < ROWS * 2; y++) {
        c.fillStyle = y % 2 ? "rgba(170,100,55,0.08)" : "rgba(230,180,120,0.035)"; c.beginPath(); c.moveTo(0, y * 0.5);
        for (let x = 0; x <= COLS; x += 0.5) c.lineTo(x, y * 0.5 + Math.sin(x * 0.8 + y) * 0.12);
        c.lineTo(COLS, y * 0.5 + 0.55); c.lineTo(0, y * 0.5 + 0.55); c.closePath(); c.fill();
      }
    },
    grid: "rgba(255,190,140,0.07)",
    rock(c, x, y) { // ring asteroid
      c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(x + 0.55, y + 0.84, 0.4, 0.12, 0, 0, TAU0); c.fill();
      const g = c.createLinearGradient(x, y, x + 1, y + 1); g.addColorStop(0, "#a8927a"); g.addColorStop(1, "#3b3027");
      c.fillStyle = g; lump(c, x, y, 3, 0.42, 0.38); c.fill();
      c.fillStyle = "rgba(40,30,22,0.6)"; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 0.3 + 0.2 * k, y + 0.4 + 0.12 * (k % 2), 0.05, 0, TAU0); c.fill(); }
    },
    hazard(c, x, y) { // radiation belt
      c.save(); c.beginPath(); c.rect(x, y, 1, 1); c.clip();
      c.fillStyle = "#2a0b1a"; c.fillRect(x, y, 1, 1);
      c.strokeStyle = "rgba(255,90,150,0.35)"; c.lineWidth = 0.07;
      for (let k = -1; k < 3; k++) { c.beginPath(); c.moveTo(x + k * 0.45, y + 1); c.lineTo(x + k * 0.45 + 0.7, y); c.stroke(); }
      c.restore();
    },
    hazardLive(c, x, y, t) { const p = (t * 0.6 + x * 0.11 + y * 0.05) % 1; c.fillStyle = `rgba(255,120,190,${0.22 * Math.sin(p * Math.PI)})`; c.fillRect(x, y, 1, 1); },
  },
  mars: {
    ground(c) {
      c.fillStyle = "#22100b"; c.fillRect(0, 0, COLS, ROWS);
      c.strokeStyle = "rgba(150,65,35,0.2)"; c.lineWidth = 0.1;
      for (let k = 0; k < ROWS * 1.5; k++) { const y0 = k * 0.7; c.beginPath(); c.moveTo(0, y0); for (let x = 0; x <= COLS; x += 0.5) c.lineTo(x, y0 + Math.sin(x * 0.9 + k) * 0.15); c.stroke(); }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (hash2(x, y, 2) < 0.3) { c.fillStyle = "rgba(90,35,20,0.6)"; c.beginPath(); c.arc(x + hash2(x, y, 3), y + hash2(x, y, 4), 0.05, 0, TAU0); c.fill(); }
    },
    grid: "rgba(255,150,110,0.07)",
    rock(c, x, y) { // canyon wall
      const g = c.createLinearGradient(x, y, x, y + 1); g.addColorStop(0, "#b0573a"); g.addColorStop(1, "#4a1c10");
      c.fillStyle = g; rrc(c, x + 0.02, y + 0.02, 0.96, 0.96, 0.12); c.fill();
      c.strokeStyle = "rgba(60,20,10,0.55)"; c.lineWidth = 0.04;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + 0.06, y + k * 0.24 + hash2(x, y, k) * 0.05); c.lineTo(x + 0.94, y + k * 0.24 + hash2(x, y, k + 4) * 0.05); c.stroke(); }
      c.fillStyle = "rgba(255,190,150,0.2)"; c.fillRect(x + 0.06, y + 0.06, 0.88, 0.06);
    },
  },
  earth: {
    ground(c) {
      c.fillStyle = "#111318"; c.fillRect(0, 0, COLS, ROWS);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (hash2(x, y, 1) < 0.18) { const g = c.createRadialGradient(x + 0.5, y + 0.5, 0, x + 0.5, y + 0.5, 0.9); g.addColorStop(0, "rgba(255,200,120,0.08)"); g.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = g; c.fillRect(x - 0.5, y - 0.5, 2, 2); }
        if (hash2(x, y, 2) < 0.12) { c.fillStyle = "rgba(255,90,60,0.18)"; c.beginPath(); c.arc(x + hash2(x, y, 3), y + hash2(x, y, 4), 0.12, 0, TAU0); c.fill(); } // fires
      }
    },
    grid: "rgba(160,170,200,0.07)",
    rock(c, x, y) { // building, seen from above
      const roof = hash2(x, y, 13);
      c.fillStyle = "rgba(0,0,0,0.4)"; c.fillRect(x + 0.1, y + 0.12, 0.92, 0.92);
      c.fillStyle = roof < 0.33 ? "#51463f" : roof < 0.66 ? "#394552" : "#464653";
      rrc(c, x + 0.03, y + 0.03, 0.94, 0.94, 0.06); c.fill();
      c.fillStyle = "#252a34"; c.fillRect(x + 0.13, y + 0.13, 0.74, 0.74);
      if (roof < 0.33) {
        c.fillStyle = "#b69d84"; c.fillRect(x + 0.28, y + 0.28, 0.44, 0.44);
        c.fillStyle = "#574d45"; c.fillRect(x + 0.46, y + 0.29, 0.08, 0.42);
      } else {
        c.fillStyle = roof < 0.66 ? "#608498" : "#958d9c";
        for (let a = 0; a < 3; a++) c.fillRect(x + 0.24, y + 0.25 + a * 0.18, 0.52, 0.09);
      }
      if (hash2(x, y, 9) < 0.25) { c.fillStyle = "#ff5d5d"; c.beginPath(); c.arc(x + 0.82, y + 0.18, 0.05, 0, TAU0); c.fill(); }
    },
  },
};

function drawScenery(c, theme, x, y) {
  c.save();
  c.translate(x, y);
  if (theme === "earth") {
    c.fillStyle = "#22372d"; c.fillRect(0, 0, 1, 1);
    c.fillStyle = "#516455"; c.fillRect(0, 0.42, 1, 0.16); c.fillRect(0.42, 0, 0.16, 1);
    c.fillStyle = "#3e6549";
    for (const [dx, dy] of [[0.2, 0.2], [0.8, 0.25], [0.23, 0.76], [0.79, 0.78]]) {
      c.beginPath(); c.arc(dx, dy, 0.12, 0, TAU0); c.fill();
    }
  } else if (theme === "ice") {
    c.fillStyle = "#213d58"; c.beginPath();
    c.moveTo(0.05, 0.7); c.lineTo(0.4, 0.2); c.lineTo(0.95, 0.35); c.lineTo(0.65, 0.85); c.closePath(); c.fill();
    c.strokeStyle = "#769bbd"; c.lineWidth = 0.025;
    c.beginPath(); c.moveTo(0.15, 0.66); c.lineTo(0.48, 0.56); c.lineTo(0.57, 0.33); c.stroke();
  } else {
    c.translate(0.5, 0.5);
    c.rotate((hash2(x, y, 11) - 0.5) * 1.4);
    c.fillStyle = theme === "mars" ? "#745347" : "#777781";
    c.fillRect(-0.29, -0.1, 0.58, 0.2);
    c.fillStyle = "#a58362"; c.fillRect(-0.07, -0.17, 0.14, 0.34);
    c.fillStyle = "#24242c"; c.fillRect(0.14, -0.065, 0.1, 0.13);
  }
  c.restore();
}
