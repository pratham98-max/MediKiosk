import React, { useEffect, useRef } from "react";
import anime from "animejs/lib/anime.es.js";
import "./landing.css";

/**
 * LandingShowcase
 * Animated "tablet dashboard" hero (anime.js 3.2.1) shown next to the existing
 * PatientAuth card. Pass <PatientAuth /> as children - login logic is untouched.
 */

const ICONS = [
  "M4 11l8-7 8 7v9H4zM10 20v-5h4v5",
  "M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11zM6 12h3l2-3 2 5 1.5-2H18",
  "M7 3c0 7 10 7 10 18M17 3c0 7-10 7-10 18M8.5 7.5h7M8.5 16.5h7",
  "M4 4h16v16H4zM8 16v-4M12 16V8M16 16v-6",
  "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
];

const CALLOUTS = [
  { label: "Oxygen Saturation", value: "97 %", unit: "SpO₂", x: 21.5, y: 8.4, dx: 17.2, dy: 22.6, lx: 26, ly: 14 },
  { label: "Blood Pressure", value: "122/78", unit: "mmHg", x: 28.2, y: 37.6, dx: 19.4, dy: 37, lx: 28.2, ly: 40.8 },
  { label: "MEWS Score", value: "2 · Low", unit: "Subbe 2001", x: 6.6, y: 52.6, dx: 17.6, dy: 47.6, lx: 12, ly: 52.6, plain: true },
];

const STATS = [
  { v: "9", k: "Beds" },
  { v: "2", k: "ICU" },
  { v: "3", k: "Hospitals" },
];

const ROWS = [
  { bed: "ICU-1", p: "PAT-4F2A91C0", hr: 72, bp: "120/80", sp: 98, m: 1, s: "Stable", c: "ok" },
  { bed: "ICU-2", p: "PAT-91B07D3E", hr: 66, bp: "105/70", sp: 96, m: 3, s: "Watch", c: "warn" },
  { bed: "GEN-3", p: "PAT-C20E58A1", hr: 112, bp: "160/110", sp: 94, m: 5, s: "Alert", c: "bad" },
  { bed: "GEN-5", p: "PAT-7D34F6B2", hr: 74, bp: "120/80", sp: 98, m: 1, s: "Stable", c: "ok" },
];

const HIDE = [".lp-a-nav", ".lp-a-top", ".lp-a-heart", ".lp-glowbg", ".lp-t", ".lp-a-stat", ".lp-a-card", ".lp-a-row", ".lp-callout", ".lp-dot", ".lp-line"];

export default function LandingShowcase({ children }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = (s) => el.querySelectorAll(s);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let loops = [];
    let timer;
    const wait = (ms) => new Promise((r) => { timer = setTimeout(r, ms); });

    const startLoops = () => {
      loops.forEach((a) => a.pause());
      if (reduce) return;
      loops = [
        anime({ targets: q(".lp-beat"), scale: [1, 1.04, 1, 1.025, 1], duration: 1500, loop: true, easing: "easeInOutSine" }),
        anime({ targets: q(".lp-core"), opacity: [0.35, 0.7], duration: 750, direction: "alternate", loop: true, easing: "easeInOutSine" }),
        anime({ targets: q(".lp-dot"), scale: [1, 1.18], duration: 1100, direction: "alternate", loop: true, easing: "easeInOutSine", delay: anime.stagger(200) }),
      ];
    };

    async function run() {
      if (!alive) return;
      anime.set(q(".lp-ui"), { opacity: 1 });
      HIDE.forEach((s) => anime.set(q(s), { opacity: 0 }));
      anime.set(q(".lp-tint"), { opacity: 0 });

      const tl = anime.timeline({ easing: "easeOutExpo", duration: 900 });
      tl.add({ targets: q(".lp-a-nav"), opacity: 1, translateX: [-24, 0] })
        .add({ targets: q(".lp-a-top"), opacity: 1, translateY: [-14, 0], delay: anime.stagger(70) }, "-=700")
        .add({ targets: [...q(".lp-a-heart"), ...q(".lp-glowbg")], opacity: 1, scale: [0.82, 1], duration: 1500 }, "-=600")
        .add({ targets: q(".lp-t"), opacity: 1, translateY: [34, 0], delay: anime.stagger(120) }, "-=1200")
        .add({ targets: q(".lp-a-stat"), opacity: 1, translateY: [16, 0], delay: anime.stagger(90) }, "-=800")
        .add({ targets: q(".lp-a-card"), opacity: 1, translateY: [44, 0], delay: anime.stagger(160) }, "-=800")
        .add({ targets: q(".lp-a-row"), opacity: 1, translateX: [-18, 0], delay: anime.stagger(70) }, "-=600")
        .add({ targets: q(".lp-wave"), strokeDashoffset: [anime.setDashoffset, 0], duration: 1700, easing: "easeInOutSine", delay: anime.stagger(250) }, "-=1000")
        .add({ targets: q(".lp-dot"), opacity: 1, scale: [0, 1], delay: anime.stagger(150), easing: "easeOutBack" }, "-=400")
        .add({ targets: q(".lp-line"), opacity: 1, strokeDashoffset: [anime.setDashoffset, 0], duration: 600, delay: anime.stagger(150), easing: "easeInOutSine" }, "-=500")
        .add({ targets: q(".lp-callout"), opacity: 1, scale: [0.7, 1], delay: anime.stagger(150), easing: "easeOutBack" }, "-=400")
        .add({ targets: q(".lp-tint"), opacity: [0, 1], duration: 2600, easing: "easeInOutSine" }, "-=300");
      await tl.finished;
      if (!alive) return;
      startLoops();
      await wait(3800);
      if (!alive) return;
      await anime({ targets: q(".lp-ui"), opacity: 0, duration: 700, easing: "easeInQuad" }).finished;
      if (!alive) return;
      await wait(300);
      loops.forEach((a) => a.pause());
      run();
    }

    if (reduce) startLoops(); else run();

    return () => {
      alive = false;
      clearTimeout(timer);
      loops.forEach((a) => a.pause());
      anime.remove(el.querySelectorAll("*"));
    };
  }, []);

  return (
    <section className="lp-hero" ref={root}>
      <div className="lp-copy">
        <h1 className="lp-h1">From kiosk check-in to bedside monitoring.</h1>
        <p className="lp-sub">
          Describe symptoms in your own language, upload records, and let staff see risk early with MEWS scoring across every ward bed.
        </p>
        <div className="lp-stage">
          <div className="lp-tablet">
            <div className="lp-screen">
              <div className="lp-tint" />
              <div className="lp-ui">
                <aside className="lp-abs lp-nav lp-a-nav">
                  <div className="lp-logo"><b>Medi</b>Kiosk</div>
                  <div className="lp-icons">
                    {ICONS.map((d, i) => (
                      <div key={i} className={`lp-ico${i === 0 ? " on" : ""}`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
                      </div>
                    ))}
                  </div>
                  <div className="lp-tog" />
                </aside>

                <div className="lp-abs lp-search lp-a-top">Search patient<i /></div>
                <div className="lp-abs lp-top lp-a-top">
                  <div className="lp-rbtn" /><div className="lp-rbtn" />
                  <div className="lp-user"><div className="lp-av" /><div>Triage Nurse<small>MediKiosk General</small></div></div>
                </div>

                <div className="lp-abs lp-glowbg" />
                <div className="lp-abs lp-heart lp-a-heart">
                  <svg viewBox="0 0 300 340" role="img" aria-label="Glowing glass heart">
                    <defs>
                      <radialGradient id="lp-body" cx="48%" cy="62%" r="62%">
                        <stop offset="0" stopColor="#ffd27a" /><stop offset=".28" stopColor="#ff7a3a" /><stop offset=".6" stopColor="#b3283a" /><stop offset="1" stopColor="#3b2745" />
                      </radialGradient>
                      <linearGradient id="lp-glass" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#cfd3e6" stopOpacity=".85" /><stop offset="1" stopColor="#4a3c5c" stopOpacity=".9" />
                      </linearGradient>
                      <filter id="lp-blur"><feGaussianBlur stdDeviation="5" /></filter>
                    </defs>
                    <g className="lp-beat" style={{ transformOrigin: "150px 220px", transformBox: "view-box" }}>
                      <path d="M92 70 L40 62 L36 84 L92 98Z M170 78 L250 70 L254 98 L180 108Z" fill="url(#lp-glass)" stroke="#8a8fa8" strokeWidth="2" />
                      <path d="M150 330 C60 272 18 205 38 136 C54 82 112 72 140 112 C150 124 160 124 170 112 C202 72 258 88 266 142 C280 212 240 276 150 330Z" fill="url(#lp-body)" stroke="#7a6a92" strokeWidth="3" />
                      <path d="M60 150 C70 100 112 90 130 125 C100 150 80 200 90 250 C60 220 48 185 60 150Z" fill="url(#lp-glass)" opacity=".55" />
                      <g fill="none" stroke="#ffc46a" strokeLinecap="round" filter="url(#lp-blur)" opacity=".9">
                        <path d="M150 300 C140 240 120 200 110 140" strokeWidth="7" /><path d="M150 290 C170 240 200 210 220 150" strokeWidth="6" /><path d="M120 220 C150 200 170 210 190 190" strokeWidth="5" />
                      </g>
                      <g fill="none" stroke="#ffe9a8" strokeLinecap="round" strokeWidth="1.6" opacity=".85">
                        <path d="M150 300 C140 240 120 200 110 140" /><path d="M150 290 C170 240 200 210 220 150" /><path d="M120 220 C150 200 170 210 190 190" /><path d="M132 260 C110 250 96 230 90 205" /><path d="M168 262 C195 250 212 232 222 208" /><path d="M140 180 C130 160 128 140 134 120" />
                      </g>
                      <ellipse className="lp-core" cx="146" cy="226" rx="46" ry="52" fill="#ffd48a" opacity=".45" filter="url(#lp-blur)" />
                      <path d="M60 130 C74 96 110 90 126 112" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
                    </g>
                  </svg>
                </div>

                <svg className="lp-abs lp-link" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
                  {CALLOUTS.map((c, i) => <path key={i} className="lp-line" d={`M${c.dx} ${c.dy} L${c.lx} ${c.ly}`} />)}
                </svg>
                {CALLOUTS.map((c, i) => <div key={"d" + i} className="lp-abs lp-dot" style={{ left: c.dx + "cqw", top: c.dy + "cqw" }} />)}
                {CALLOUTS.map((c, i) => (
                  <div key={"c" + i} className={`lp-abs lp-callout${c.plain ? " plain" : ""}`} style={{ left: c.x + "cqw", top: c.y + "cqw" }}>
                    <small>{c.label}</small><strong>{c.value}</strong><em>{c.unit}</em>
                  </div>
                ))}

                <div className="lp-abs lp-title"><span className="lp-t">Inpatient</span><span className="lp-t">Dashboard</span></div>
                <div className="lp-abs lp-stats">
                  {STATS.map((s) => <div key={s.k} className="lp-stat lp-a-stat"><b>{s.v}</b><small>{s.k}</small></div>)}
                </div>

                <section className="lp-abs lp-card lp-chart lp-a-card">
                  <h3>Heart Rate Trends</h3>
                  <div className="lp-plot">
                    <div className="lp-band" style={{ top: "1.8cqw", background: "linear-gradient(90deg,#fbeab0,#f7cfa8 60%,#f4b7b4)" }} />
                    <svg viewBox="0 0 400 100" preserveAspectRatio="none"><path className="lp-wave" d="M0 52 C20 30 30 58 50 42 C70 26 80 8 100 12 C130 16 140 74 170 80 C190 84 205 40 230 20 C250 8 270 16 285 46 C295 66 310 52 330 40 C350 30 370 42 400 56" /></svg>
                  </div>
                  <div className="lp-times"><span>1pm</span><span>2pm</span><span>3pm</span><span>4pm</span><span>5pm</span><span>6pm</span></div>
                  <div className="lp-plot" style={{ marginTop: "1cqw" }}>
                    <div className="lp-band" style={{ top: "2.4cqw", background: "linear-gradient(90deg,#d4f5e2,#a9e4c4)" }} />
                    <svg viewBox="0 0 400 100" preserveAspectRatio="none"><path className="lp-wave" d="M0 92 C30 90 50 82 70 50 C85 26 100 30 120 44 C140 56 150 80 170 76 C185 70 195 90 215 88 C240 84 260 66 285 58 C310 52 330 78 360 70 C380 64 390 50 400 46" /></svg>
                  </div>
                </section>

                <section className="lp-abs lp-card lp-tbl lp-a-card">
                  <h3>Ward monitoring</h3>
                  <table>
                    <thead><tr><th>Bed</th><th>Patient</th><th>HR</th><th>BP</th><th>SpO₂</th><th>MEWS</th></tr></thead>
                    <tbody>
                      {ROWS.map((r) => (
                        <tr key={r.bed} className="lp-a-row">
                          <td>{r.bed}</td><td>{r.p}</td><td>{r.hr}</td><td>{r.bp}</td><td>{r.sp}</td>
                          <td><span className={`lp-chip ${r.c}`}>{r.m} · {r.s}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          </div>
        </div>
        <p className="lp-note">Illustrative demo data. Simulated vitals and synthetic ML models, not clinically validated.</p>
      </div>
      <div className="lp-auth">{children}</div>
    </section>
  );
}
