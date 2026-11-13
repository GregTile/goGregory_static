# goGregory.com

Static dual-experience ambient landing page & screensaver for **https://goGregory.com**, built with pure vanilla HTML, CSS, WebGL shaders, and HTML5 Canvas (zero build tools or server dependencies—ready for GitHub Pages).

## Features

1. **Liquid Latent Space (`latent`)** — Custom WebGL GLSL domain-warped fluid light shader with interactive cursor swirl, click shockwaves, and floating glass typography.
2. **Autonomous Telemetry HUD (`hud`)** — Precision sci-fi control screen featuring a rotating neural astrolabe, synaptic chord graph, real-time multi-trace harmonic waveforms, ambient AI telemetry log, and an interactive Easter-egg command prompt (`help`, `whoami`, `status`, `pulse`, `theme`, `matrix`, `zen`, `clear`).
3. **5 Curated Color Palettes** — *Neural Cyan*, *Latent Violet*, *Solaris Amber*, *Phosphor Mint*, and *Titanium Mono*, smoothly interpolating across both experiences.
4. **True Screensaver Mode** — Controls gently fade out after 7 seconds of stillness and reappear on cursor movement.

## Easy Customization (`config.js`)

Open `config.js` to adjust defaults anytime:

- **Switch Default Experience:** Change `defaultMode: 'latent'` to `'hud'` (or preview via URL `?mode=hud` / `?mode=latent`).
- **Switch Default Palette:** Change `defaultPalette: 0` (`0` = Cyan, `1` = Violet, `2` = Amber, `3` = Mint, `4` = Mono, or preview via `?palette=amber`).
- **Edit Tagline:** Update `tagline: 'GREGORY  //  AI & INTELLIGENT SYSTEMS'`.

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `M` | Toggle between **Latent** and **Telemetry HUD** |
| `Space` or `T` | Cycle color palettes |
| `1` – `5` | Select palette 1–5 directly |
| `F` | Toggle fullscreen screensaver |
| `/` | Open interactive HUD command prompt |

## Local Preview & GitHub Pages Deployment

- **Preview locally:** Simply open `index.html` directly in any modern browser (no local server required!).
- **Deploy to GitHub Pages:** Push this repository to GitHub, go to **Settings → Pages**, select your main branch (`/` root), and GitHub Pages will automatically pick up the included `CNAME` (`gogregory.com`) file.
