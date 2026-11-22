import re, json, os
here = os.path.dirname(os.path.abspath(__file__))
G = "/home/admin/Documents/VSCode-Repo/Games"
t = open(f"{here}/template.html").read()
css = open(f"{G}/lib/arcade-menu.css").read()
pool = open(f"{G}/AlienPool/Alien-Pool.html").read()
a = pool.index("const CHARS = (() => {"); b = pool.index("})();", a) + 5
atk_lines = open(f"{G}/AlienDefense/Design/attacker-design.html").read().split("\n")[82:605]  # lines 83..605
atk = "const ATK = (() => {\n" + "\n".join(atk_lines) + """
  const roster = STAGES.flatMap(s => s.designs);
  const byName = Object.fromEntries(roster.map(d => [d.name, d]));
  return { draw(name, c, t, s, hit = 0) { const d = byName[name]; if (!d) return; PX = s * 2.2; c.save(); c.lineCap = "round"; d.draw(c, t, s, hit); c.restore(); }, has: n => !!byName[n] };
})();"""
variants = json.load(open(f"{here}/variants.json")) if os.path.exists(f"{here}/variants.json") else []
out = (t.replace("/*ARCADE_CSS*/", css).replace("/*CHARS*/", pool[a:b]).replace("/*ATK*/", atk)
        .replace("/*CHUNKS*/", open(f"{here}/chunks.js").read()).replace("/*CORE*/", open(f"{here}/core.js").read())
        .replace("/*VARIANTS*/", json.dumps(variants)).replace("/*GAME*/", open(f"{here}/game.js").read()))
os.makedirs(f"{G}/AlienStarhop", exist_ok=True)
open(f"{G}/AlienStarhop/Alien-Starhop.html", "w").write(out)
open("/tmp/starhop-check.js", "w").write(re.findall(r"<script>(.*?)</script>", out, re.S)[-1])
print("built", len(out), "variants", len(variants))
