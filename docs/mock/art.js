// Generates original placeholder artwork (SVG) so the screenshots never
// contain real anime posters or character art.

const PALETTES = [
  ["#2b1055", "#7597de", "#f6d365"],
  ["#1f1c2c", "#928dab", "#ff9a62"],
  ["#0f2027", "#2c5364", "#9c8cff"],
  ["#41295a", "#2f0743", "#f2a7ff"],
  ["#232526", "#414345", "#ff7e5f"],
  ["#134e5e", "#71b280", "#ffe29f"],
  ["#42275a", "#734b6d", "#ffd1a9"],
  ["#0b486b", "#f56217", "#ffe9c7"],
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function posterSvg(key) {
  const seed = hash(key);
  const rand = rng(seed);
  const [c1, c2, c3] = PALETTES[seed % PALETTES.length];
  const motif = seed % 4;
  const stars = Array.from({ length: 28 }, () => {
    const x = (rand() * 300).toFixed(1);
    const y = (rand() * 230).toFixed(1);
    const r = (rand() * 1.6 + 0.4).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(rand() * 0.6 + 0.3).toFixed(2)}"/>`;
  }).join("");
  const sunX = 70 + rand() * 160;
  const sunY = 120 + rand() * 60;
  const sunR = 38 + rand() * 30;

  const ridge = (base, amp, color, opacity) => {
    let d = `M0 420 L0 ${base}`;
    for (let x = 0; x <= 300; x += 30) {
      d += ` L${x} ${(base - rand() * amp).toFixed(1)}`;
    }
    d += ` L300 420 Z`;
    return `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
  };

  let motifSvg = "";
  if (motif === 0) {
    // torii gate
    motifSvg = `<g fill="#120b1f" opacity=".92"><rect x="96" y="250" width="12" height="130"/><rect x="192" y="250" width="12" height="130"/><rect x="82" y="244" width="136" height="12" rx="3"/><rect x="92" y="268" width="116" height="8"/></g>`;
  } else if (motif === 1) {
    // waves
    motifSvg = [0, 1, 2]
      .map(
        (i) =>
          `<path d="M-10 ${300 + i * 28} q 25 -22 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 V420 H-10 Z" fill="#120b1f" opacity="${0.35 + i * 0.25}"/>`,
      )
      .join("");
  } else if (motif === 2) {
    // lanterns
    motifSvg = [60, 130, 210, 255]
      .map(
        (x, i) =>
          `<g><line x1="${x}" y1="0" x2="${x}" y2="${210 + i * 14}" stroke="#120b1f" stroke-width="1.5" opacity=".6"/><ellipse cx="${x}" cy="${230 + i * 14}" rx="13" ry="17" fill="${c3}" opacity=".95"/><ellipse cx="${x}" cy="${230 + i * 14}" rx="13" ry="17" fill="none" stroke="#120b1f" stroke-width="1.5" opacity=".5"/></g>`,
      )
      .join("");
  } else {
    // fox-ear silhouette
    motifSvg = `<g fill="#120b1f" opacity=".92"><path d="M110 380 L120 290 L100 235 L148 272 Q150 270 152 272 L200 235 L180 290 L190 380 Z"/></g><circle cx="132" cy="318" r="3" fill="${c3}"/><circle cx="168" cy="318" r="3" fill="${c3}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".6" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="300" height="420" fill="url(#bg)"/>
${stars}
<circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${(sunR * 1.9).toFixed(1)}" fill="url(#glow)" opacity=".55"/>
<circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${sunR.toFixed(1)}" fill="#fff6e0" opacity=".95"/>
${ridge(300, 70, c1, 0.55)}
${ridge(340, 50, "#120b1f", 0.7)}
${motifSvg}
</svg>`;
}

export function avatarSvg(key) {
  const seed = hash(key);
  const [c1, c2, c3] = PALETTES[seed % PALETTES.length];
  const rand = rng(seed);
  const hair = ["#1b1230", "#3b1f4a", "#5a2a2a", "#243b55", "#4a3b1b"][seed % 5];
  const eye = c3;
  const bangs = Array.from({ length: 5 }, (_, i) => {
    const x = 28 + i * 16;
    return `<path d="M${x} 24 q ${(rand() * 8 - 4).toFixed(1)} 26 ${(rand() * 10 - 5).toFixed(1)} 40 l 12 0 q -4 -24 -12 -40 Z" fill="${hair}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="120" height="120" fill="url(#g)"/>
<path d="M18 120 Q60 70 102 120 Z" fill="#120b1f" opacity=".85"/>
<ellipse cx="60" cy="58" rx="28" ry="32" fill="#ffe3d0"/>
<path d="M30 56 Q30 18 60 18 Q90 18 90 56 Q82 34 60 34 Q38 34 30 56 Z" fill="${hair}"/>
${bangs}
<ellipse cx="49" cy="62" rx="4.2" ry="5.6" fill="${eye}"/><ellipse cx="71" cy="62" rx="4.2" ry="5.6" fill="${eye}"/>
<circle cx="50.2" cy="60.4" r="1.4" fill="#fff"/><circle cx="72.2" cy="60.4" r="1.4" fill="#fff"/>
<path d="M54 76 q 6 4 12 0" stroke="#a5513f" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;
}

export function newsThumbSvg(key) {
  const seed = hash("news" + key);
  const [c1, c2, c3] = PALETTES[seed % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="320" height="180" fill="url(#g)"/>
<circle cx="${60 + (seed % 200)}" cy="70" r="34" fill="${c3}" opacity=".85"/>
<path d="M0 180 L0 130 L60 100 L120 135 L190 90 L260 130 L320 105 L320 180 Z" fill="#120b1f" opacity=".7"/>
</svg>`;
}

export function playerHtml(label = "Kitsune 1") {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mock player</title>
<style>
html,body{margin:0;height:100%;background:#05050a;font-family:system-ui,sans-serif;color:#fff;overflow:hidden}
.stage{position:relative;height:100%;background:
  radial-gradient(circle at 70% 30%, rgba(255,154,98,.35), transparent 45%),
  radial-gradient(circle at 20% 80%, rgba(156,140,255,.35), transparent 50%),
  linear-gradient(160deg,#1a1033,#0b0b18 60%,#2a1030)}
.moon{position:absolute;right:16%;top:16%;width:90px;height:90px;border-radius:50%;background:#fff6e0;box-shadow:0 0 90px 30px rgba(255,246,224,.35)}
.hills{position:absolute;left:0;right:0;bottom:0;height:38%;background:#0a0814;clip-path:polygon(0 60%,12% 40%,26% 58%,42% 28%,58% 55%,74% 34%,90% 56%,100% 42%,100% 100%,0 100%)}
.play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:86px;height:86px;border-radius:50%;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.7);display:grid;place-items:center;backdrop-filter:blur(4px)}
.play:after{content:"";margin-left:6px;border-left:26px solid #fff;border-top:16px solid transparent;border-bottom:16px solid transparent}
.bar{position:absolute;left:3%;right:3%;bottom:6%;display:flex;align-items:center;gap:12px;font-size:13px;color:#ddd}
.track{flex:1;height:5px;border-radius:5px;background:rgba(255,255,255,.25);position:relative}
.track i{position:absolute;left:0;top:0;bottom:0;width:34%;border-radius:5px;background:linear-gradient(90deg,#9c8cff,#ff9a62)}
.tag{position:absolute;left:3%;top:5%;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.2)}
</style></head><body><div class="stage"><div class="moon"></div><div class="hills"></div>
<div class="tag">Mock player · ${label}</div><div class="play"></div>
<div class="bar"><span>08:12</span><div class="track"><i></i></div><span>24:10</span></div></div></body></html>`;
}
