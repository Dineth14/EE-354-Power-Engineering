# ⚡ Power Engineering Theory

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/power-engineering-theory/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/power-engineering-theory/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

A **complete, interactive web-based textbook** covering core Power Engineering topics. Pure HTML/CSS/JS — no build tools, no frameworks, deployable directly via GitHub Pages.

> **Live Site:** `https://YOUR_USERNAME.github.io/power-engineering-theory/`

---

## 📖 Table of Contents

| Chapter | Topic | Simulations |
|---------|-------|-------------|
| **01** | [Load Flow Analysis](chapters/01-load-flow-analysis/) | Gauss-Seidel Solver · Newton-Raphson Solver · Y-Bus Builder · P-V Nose Curve |
| **02** | [Fault Analysis](chapters/02-fault-analysis/) | Fault Oscillogram · Sequence Component Visualizer · Network Fault Calculator |
| **03** | [Synchronous Machines](chapters/03-synchronous-machines/) | Phasor Diagram · Power-Angle Curve (EAC) · Salient-Pole Explorer |
| **04** | [Induction Machines](chapters/04-induction-machines/) | Equivalent Circuit Analyser · Torque-Speed Curve · Slip-Power & V/f Control |

---

## ✨ Features

- **Dark-first design** with light theme toggle (persisted in localStorage)
- **12+ interactive simulations** — all Canvas/Chart.js-based, no placeholders
- **Full mathematical derivations** with step-by-step derivation blocks and KaTeX rendering
- **Responsive layout** — sidebar navigation, floating TOC, mobile-friendly
- **Animated hero canvases** on every chapter page and the landing page
- **Quick reference cards** for every chapter's key equations
- **Progress tracking** via localStorage (chapters visited)
- **Zero build step** — open `index.html` and go

---

## 🚀 Getting Started

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/power-engineering-theory.git
cd power-engineering-theory

# Serve locally (any static server works)
python -m http.server 8000
# or
npx serve .
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

### Deploy to GitHub Pages

1. Push to the `main` branch
2. GitHub Actions automatically deploys to Pages (see `.github/workflows/deploy.yml`)
3. Enable GitHub Pages in repo Settings → Pages → Source: GitHub Actions

---

## 📁 Project Structure

```
power-engineering-theory/
├── index.html                          # Landing page
├── assets/
│   ├── css/
│   │   ├── main.css                    # Global styles (dark/light themes)
│   │   └── math.css                    # KaTeX overrides & math styling
│   └── js/
│       ├── theme.js                    # Dark/light toggle
│       ├── nav.js                      # Sidebar, TOC, progress
│       └── simulations.js              # PET library (complex math, Y-bus, phasors)
├── chapters/
│   ├── 01-load-flow-analysis/
│   │   ├── index.html
│   │   └── sim/
│   │       ├── gauss-seidel.js
│   │       ├── newton-raphson.js
│   │       └── bus-admittance.js
│   ├── 02-fault-analysis/
│   │   ├── index.html
│   │   └── sim/
│   │       ├── symmetrical-fault.js
│   │       ├── sequence-networks.js
│   │       └── fault-current.js
│   ├── 03-synchronous-machines/
│   │   ├── index.html
│   │   └── sim/
│   │       ├── phasor-diagram.js
│   │       ├── power-angle.js
│   │       └── salient-pole.js
│   └── 04-induction-machines/
│       ├── index.html
│       └── sim/
│           ├── equivalent-circuit.js
│           ├── torque-speed.js
│           └── slip-power.js
├── .github/
│   └── workflows/
│       └── deploy.yml                  # GitHub Pages auto-deploy
└── README.md
```

---

## 🧮 Notation Reference

| Symbol | Meaning |
|--------|---------|
| $V_t$ | Terminal voltage (pu) |
| $E_f$ | Excitation (field) EMF |
| $I_a$ | Armature / stator current |
| $X_s, X_d, X_q$ | Synchronous, d-axis, q-axis reactance |
| $X''_d, X'_d$ | Subtransient, transient reactance |
| $\delta$ | Power angle / rotor angle |
| $s$ | Slip |
| $Y_{bus}$ | Bus admittance matrix |
| $Z_{bus}$ | Bus impedance matrix |
| $P, Q, S$ | Active, reactive, apparent power |
| $a = 1\angle120°$ | Fortescue operator |

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Markup | HTML5 (semantic) |
| Styling | CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES5 compatible) |
| Math Rendering | [KaTeX](https://katex.org/) 0.16.9 (CDN) |
| Charts | [Chart.js](https://www.chartjs.org/) 4.4.1 (CDN) |
| Fonts | [Inter](https://rsms.me/inter/) + [JetBrains Mono](https://www.jetbrains.com/lp/mono/) |
| Deployment | GitHub Actions → GitHub Pages |

No npm, no webpack, no build step.

---

## 📚 References

- Glover, Sarma, Overbye — *Power Systems Analysis and Design* (6th ed.)
- Stevenson, Grainger — *Power Systems Analysis*
- Kundur — *Power System Stability and Control*
- Bergen, Vittal — *Power Systems Analysis* (2nd ed.)
- IEEE Std 141 (Red Book) — *Recommended Practice for Electric Power Distribution*

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <em>Built for learning. Built for engineers. ⚡</em>
</p>
