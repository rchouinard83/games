# Alien Starhop dev sources

The game ships as one file (`../Alien-Starhop.html`). These are the parts it's built from:

- `chunks.js` level pieces (14 rows each) · `core.js` physics + level builder · `game.js` everything else · `template.html` page + CSS
- `checker.js` solver: simulates the real physics to prove each level's portal, 3 Star Shards and buddy cage are reachable, then writes `variants.json`
- `build.py` assembles the single HTML (pulls arcade-menu.css, the CHARS art from Alien Pool and the alien cast from AlienDefense/Design/attacker-design.html)

After changing physics or chunks: `node checker.js` (about 10 minutes for all 40 levels), then `python3 build.py`.
