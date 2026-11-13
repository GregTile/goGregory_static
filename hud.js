/**
 * goGregory.com — Experience 2: Autonomous AI Telemetry HUD
 * Precision vector astrolabe, neural chord topology, live waveforms,
 * ambient telemetry stream, and client-side interactive command prompt.
 */
(function () {
  function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function lerpColorHex(hexA, hexB, t) {
    const a = parseInt(hexA.replace('#', ''), 16);
    const b = parseInt(hexB.replace('#', ''), 16);
    const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t);
    const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
    const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
    return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
  }

  const TELEMETRY_PHRASES = [
    'aligning multi-agent attention heads [coherence: 0.998]',
    'mapping latent semantic manifold across 4,096 dimensions',
    'synthesizing human-system graph topology // signal nominal',
    'evaluating counterfactual trajectories... equilibrium reached',
    'calibrating inference horizon — drift < 0.0003 rad',
    'distilling high-dimensional context into structured intent',
    'verifying autonomous orchestration invariants [PASS]',
    'harmonic phase-lock acquired across distributed nodes',
    'pruning low-salience pathways // entropy stabilized',
    'observing emergent reasoning patterns in ambient state',
    'synchronizing temporal context window [zero-latency edge]',
    'balancing symbolic constraints with neural priors',
    'indexing enterprise knowledge graph embeddings... complete',
    'telemetry heartbeat nominal // goGregory static core online'
  ];

  class TelemetryHudRenderer {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.waveCanvas = options.waveCanvas;
      this.waveCtx = this.waveCanvas ? this.waveCanvas.getContext('2d') : null;

      this.els = options.elements;
      this.callbacks = options.callbacks || {};

      this.active = false;
      this.rafId = null;
      this.bootTime = performance.now();
      this.lastFrameTime = performance.now();
      this.fpsSmooth = 60;

      // Palette colors (smoothly interpolated)
      this.palette = { ...options.initialPalette };
      this.targetPalette = { ...options.initialPalette };

      // Pointer & autonomous scanner state
      this.pointer = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.5,
        normX: 0,
        normY: 0,
        vel: 0,
        lastMoveAt: 0
      };
      this.smoothPointer = { x: 0, y: 0 };

      // Shockwave / scan pulses
      this.pulses = [];
      this.matrixRainMode = false;
      this.matrixDrops = [];

      // Orbital neural graph nodes
      this.nodeCount = 16;
      this.nodes = Array.from({ length: this.nodeCount }, (_, i) => ({
        baseAngle: (i / this.nodeCount) * Math.PI * 2,
        speed: (i % 2 === 0 ? 1 : -1) * (0.06 + (i % 5) * 0.018),
        radiusFactor: 0.56 + (i % 3) * 0.08,
        phase: i * 1.37
      }));

      // Ambient background stars / dust coordinates
      this.gridDots = [];

      // Telemetry log state
      this.logLines = [];
      this.phraseIndex = Math.floor(Math.random() * TELEMETRY_PHRASES.length);
      this.streamTimer = null;

      this.bindEvents();
      this.resize();
      this.seedInitialLogs();
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      window.addEventListener('pointermove', (e) => {
        const prevX = this.pointer.x;
        const prevY = this.pointer.y;
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.normX = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
        this.pointer.normY = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
        const dist = Math.hypot(e.clientX - prevX, e.clientY - prevY);
        this.pointer.vel = Math.min(this.pointer.vel + dist * 0.015, 2.5);
        this.pointer.lastMoveAt = performance.now();
      });

      window.addEventListener('pointerdown', (e) => {
        if (!this.active) return;
        if (e.target && e.target.closest && e.target.closest('.control-dock, .hud-terminal')) {
          return;
        }
        this.triggerPulse(e.clientX, e.clientY);
      });

      if (this.els.terminalForm && this.els.terminalInput) {
        this.els.terminalForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const raw = this.els.terminalInput.value.trim();
          this.els.terminalInput.value = '';
          if (raw) {
            this.handleCommand(raw);
          }
        });
      }
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.width = w;
      this.height = h;
      this.dpr = dpr;

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (this.waveCanvas && this.waveCtx) {
        const rect = this.waveCanvas.getBoundingClientRect();
        const ww = Math.max(rect.width || 220, 180);
        const wh = Math.max(rect.height || 64, 52);
        this.waveWidth = ww;
        this.waveHeight = wh;
        this.waveCanvas.width = Math.floor(ww * dpr);
        this.waveCanvas.height = Math.floor(wh * dpr);
        this.waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Rebuild matrix columns for optional Easter-egg mode
      const cols = Math.floor(w / 20);
      this.matrixDrops = Array.from({ length: cols }, () => Math.random() * -50);
    }

    setPalette(newPalette) {
      this.targetPalette = { ...newPalette };
    }

    triggerPulse(x, y) {
      const cx = typeof x === 'number' ? x : this.width * 0.5;
      const cy = typeof y === 'number' ? y : this.height * 0.5;
      this.pulses.push({
        x: cx,
        y: cy,
        born: performance.now(),
        maxRadius: Math.max(this.width, this.height) * 0.55
      });
      if (this.pulses.length > 5) this.pulses.shift();
    }

    seedInitialLogs() {
      this.pushLog('SYS', 'goGregory autonomous telemetry interface online');
      this.pushLog('AI', TELEMETRY_PHRASES[this.phraseIndex % TELEMETRY_PHRASES.length]);
      this.phraseIndex++;
    }

    formatTime(date) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(date.getMilliseconds() / 10)).padStart(2, '0');
      return `${hh}:${mm}:${ss}.${ms}`;
    }

    pushLog(tag, text, isAccent = false) {
      const stamp = this.formatTime(new Date());
      this.logLines.push({ stamp, tag, text, isAccent });
      if (this.logLines.length > 8) {
        this.logLines.shift();
      }
      this.renderLogsDom();
    }

    renderLogsDom() {
      if (!this.els.streamLog) return;
      this.els.streamLog.innerHTML = this.logLines
        .map(
          (item) =>
            `<div class="log-entry${item.isAccent ? ' is-accent' : ''}">` +
            `<span class="log-ts">[${item.stamp}]</span> ` +
            `<span class="log-tag">${item.tag}</span> ` +
            `<span class="log-msg">${item.text}</span>` +
            `</div>`
        )
        .join('');
    }

    handleCommand(rawInput) {
      const clean = rawInput
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const parts = rawInput.trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg = parts[1] ? parts[1].toLowerCase() : '';

      this.pushLog('CMD', `> ${clean}`, true);

      switch (cmd) {
        case 'help':
        case '?':
          this.pushLog(
            'SYS',
            'commands: whoami | status | pulse | theme [1-5] | latent | matrix | zen | clear',
            true
          );
          break;
        case 'whoami':
          this.pushLog(
            'ID',
            'Gregory — exploring AI, autonomous architectures & intelligent human systems.',
            true
          );
          break;
        case 'status':
          this.pushLog(
            'DIAG',
            `core: NOMINAL | fps: ${Math.round(this.fpsSmooth)} | palette: ${this.targetPalette.name}`,
            true
          );
          break;
        case 'pulse':
        case 'ping':
          this.triggerPulse(this.width * 0.5, this.height * 0.5);
          this.pushLog('WAVE', 'radial resonance pulse emitted from core origin', true);
          break;
        case 'theme':
        case 'palette':
          if (this.callbacks.onCyclePalette) {
            this.callbacks.onCyclePalette(arg);
          }
          break;
        case 'latent':
        case 'shader':
        case 'mode':
          this.pushLog('MODE', 'transitioning to Liquid Latent Space...', true);
          if (this.callbacks.onSwitchMode) {
            setTimeout(() => this.callbacks.onSwitchMode('latent'), 280);
          }
          break;
        case 'matrix':
          this.matrixRainMode = !this.matrixRainMode;
          this.pushLog(
            'FX',
            `glyph cascade overlay ${this.matrixRainMode ? 'ENABLED' : 'DISABLED'}`,
            true
          );
          break;
        case 'zen':
          if (this.callbacks.onZen) {
            this.callbacks.onZen();
          }
          this.pushLog('ZEN', 'entering screensaver concealment (move cursor to wake)', true);
          break;
        case 'uptime': {
          const secs = ((performance.now() - this.bootTime) / 1000).toFixed(1);
          this.pushLog('SYS', `session uptime: ${secs}s // static edge node`, true);
          break;
        }
        case 'clear':
        case 'cls':
          this.logLines = [];
          this.renderLogsDom();
          break;
        default: {
          const safeCmd = clean.trim().split(/\s+/)[0].toLowerCase();
          this.pushLog('ERR', `unrecognized directive '${safeCmd}' — type 'help'`, false);
        }
      }
    }

    focusTerminal() {
      if (this.els.terminalInput) {
        this.els.terminalInput.focus();
      }
    }

    setActive(isActive) {
      if (this.active === isActive) return;
      this.active = isActive;

      if (isActive) {
        this.resize();
        this.lastFrameTime = performance.now();
        this.loop();
        this.streamTimer = setInterval(() => {
          const msg = TELEMETRY_PHRASES[this.phraseIndex % TELEMETRY_PHRASES.length];
          this.phraseIndex++;
          this.pushLog('AI', msg);
        }, 3400);
      } else {
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
        if (this.streamTimer) {
          clearInterval(this.streamTimer);
          this.streamTimer = null;
        }
      }
    }

    loop() {
      if (!this.active) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastFrameTime) * 0.001, 0.1);
      this.lastFrameTime = now;

      const instantFps = dt > 0 ? 1 / dt : 60;
      this.fpsSmooth += (instantFps - this.fpsSmooth) * 0.08;

      this.updateColors();
      this.drawMainCanvas(now);
      this.drawWaveforms(now);
      this.updateDomReadouts(now);

      this.rafId = requestAnimationFrame(() => this.loop());
    }

    updateColors() {
      const k = 0.08;
      this.palette.bg = lerpColorHex(this.palette.bg, this.targetPalette.bg, k);
      this.palette.primary = lerpColorHex(this.palette.primary, this.targetPalette.primary, k);
      this.palette.secondary = lerpColorHex(this.palette.secondary, this.targetPalette.secondary, k);
      this.palette.tertiary = lerpColorHex(this.palette.tertiary, this.targetPalette.tertiary, k);
      this.palette.highlight = lerpColorHex(this.palette.highlight, this.targetPalette.highlight, k);
    }

    drawMainCanvas(now) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const t = (now - this.bootTime) * 0.001;
      const minDim = Math.min(w, h);
      const baseR = Math.min(minDim * 0.32, 270);

      // Decay pointer velocity
      this.pointer.vel *= 0.94;

      // Autonomous target if pointer idle > 4s
      const idleMs = now - this.pointer.lastMoveAt;
      let targetX = this.pointer.normX;
      let targetY = this.pointer.normY;
      if (idleMs > 4000) {
        targetX = Math.cos(t * 0.35) * 0.45;
        targetY = Math.sin(t * 0.27) * 0.35;
      }
      this.smoothPointer.x += (targetX - this.smoothPointer.x) * 0.06;
      this.smoothPointer.y += (targetY - this.smoothPointer.y) * 0.06;

      // Background radial atmosphere
      ctx.fillStyle = this.palette.bg;
      ctx.fillRect(0, 0, w, h);

      const bgGrad = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, Math.max(w, h) * 0.72);
      bgGrad.addColorStop(0, hexToRgba(this.palette.tertiary, 0.55));
      bgGrad.addColorStop(0.55, hexToRgba(this.palette.bg, 0.85));
      bgGrad.addColorStop(1, this.palette.bg);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Optional Matrix / Glyph Cascade Easter-egg
      if (this.matrixRainMode) {
        ctx.save();
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = hexToRgba(this.palette.primary, 0.2);
        const chars = '01ABCDEF∑∆λΩΨ§';
        for (let i = 0; i < this.matrixDrops.length; i++) {
          const ch = chars[(i * 7 + Math.floor(t * 12)) % chars.length];
          const x = i * 20;
          const y = this.matrixDrops[i] * 18;
          if (y > 0 && y < h) {
            ctx.fillText(ch, x, y);
          }
          this.matrixDrops[i] += 0.35 + (i % 4) * 0.12;
          if (this.matrixDrops[i] * 18 > h && Math.random() > 0.975) {
            this.matrixDrops[i] = 0;
          }
        }
        ctx.restore();
      }

      // Subtle architectural coordinate grid
      const gridStep = 64;
      ctx.strokeStyle = hexToRgba(this.palette.primary, 0.045);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = cx % gridStep; x < w; x += gridStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = cy % gridStep; y < h; y += gridStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Axis hairlines
      ctx.strokeStyle = hexToRgba(this.palette.primary, 0.09);
      ctx.beginPath();
      ctx.moveTo(cx - baseR * 1.55, cy);
      ctx.lineTo(cx - baseR * 1.12, cy);
      ctx.moveTo(cx + baseR * 1.12, cy);
      ctx.lineTo(cx + baseR * 1.55, cy);
      ctx.moveTo(cx, cy - baseR * 1.45);
      ctx.lineTo(cx, cy - baseR * 1.12);
      ctx.moveTo(cx, cy + baseR * 1.12);
      ctx.lineTo(cx, cy + baseR * 1.45);
      ctx.stroke();

      // Central astrolabe subtle parallax offset
      const px = cx + this.smoothPointer.x * 14;
      const py = cy + this.smoothPointer.y * 14;

      // 1. Outer precision degree ring
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 0.04);
      ctx.strokeStyle = hexToRgba(this.palette.primary, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 1.05, 0, Math.PI * 2);
      ctx.stroke();

      const ticks = 72;
      for (let i = 0; i < ticks; i++) {
        const ang = (i / ticks) * Math.PI * 2;
        const major = i % 6 === 0;
        const inner = baseR * (major ? 0.99 : 1.02);
        const outer = baseR * 1.05;
        ctx.strokeStyle = hexToRgba(this.palette.primary, major ? 0.48 : 0.18);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
        ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Counter-rotating segmented telemetry arcs
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-t * 0.09);
      const arcSegments = [
        [0, 0.9],
        [1.35, 2.05],
        [2.6, 3.7],
        [4.2, 5.55]
      ];
      ctx.lineWidth = 2;
      ctx.strokeStyle = hexToRgba(this.palette.secondary, 0.55);
      arcSegments.forEach(([a0, a1]) => {
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 0.91, a0, a1);
        ctx.stroke();
      });
      ctx.restore();

      // 3. Live polar harmonic resonance wave ring
      ctx.save();
      ctx.translate(px, py);
      ctx.beginPath();
      const samples = 180;
      const amp = 6 + this.pointer.vel * 8;
      for (let i = 0; i <= samples; i++) {
        const theta = (i / samples) * Math.PI * 2;
        const wave =
          Math.sin(theta * 6 + t * 2.4) * 0.5 +
          Math.cos(theta * 11 - t * 1.8) * 0.35 +
          Math.sin(theta * 3 - t * 0.9) * 0.25;
        const r = baseR * 0.78 + wave * amp;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = hexToRgba(this.palette.primary, 0.65);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      // 4. Orbital Neural Nodes & Bezier Synaptic Chords
      ctx.save();
      ctx.translate(px, py);
      const computedNodes = this.nodes.map((n) => {
        const ang = n.baseAngle + t * n.speed;
        const r = baseR * (n.radiusFactor + Math.sin(t * 0.8 + n.phase) * 0.035);
        return {
          x: Math.cos(ang) * r,
          y: Math.sin(ang) * r,
          ang
        };
      });

      // Synaptic chords connecting nearby/harmonic pairs
      for (let i = 0; i < computedNodes.length; i++) {
        for (let j = i + 1; j < computedNodes.length; j++) {
          const a = computedNodes[i];
          const b = computedNodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < baseR * 0.88) {
            const alpha = (1 - dist / (baseR * 0.88)) * 0.28;
            ctx.strokeStyle = hexToRgba(
              (i + j) % 3 === 0 ? this.palette.secondary : this.palette.primary,
              alpha
            );
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(0, 0, b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw luminous node points
      computedNodes.forEach((pt, idx) => {
        ctx.fillStyle = idx % 4 === 0 ? this.palette.highlight : this.palette.primary;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, idx % 4 === 0 ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Inner core framing circle
      ctx.strokeStyle = hexToRgba(this.palette.primary, 0.28);
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pointer bearing indicator on perimeter
      const bearing = Math.atan2(this.smoothPointer.y, this.smoothPointer.x);
      const bx = Math.cos(bearing) * baseR * 1.1;
      const by = Math.sin(bearing) * baseR * 1.1;
      ctx.fillStyle = this.palette.highlight;
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Expanding click/command shockwave rings
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const p = this.pulses[i];
        const age = (now - p.born) * 0.001;
        const progress = age / 1.8;
        if (progress >= 1) {
          this.pulses.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - progress, 3);
        const radius = ease * p.maxRadius;
        const alpha = (1 - progress) * 0.55;
        ctx.strokeStyle = hexToRgba(this.palette.primary, alpha);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawWaveforms(now) {
      if (!this.waveCtx) return;
      const ctx = this.waveCtx;
      const w = this.waveWidth || 220;
      const h = this.waveHeight || 60;
      const t = (now - this.bootTime) * 0.001;

      ctx.clearRect(0, 0, w, h);

      // Baseline
      ctx.strokeStyle = hexToRgba(this.palette.primary, 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();

      const traces = [
        { color: this.palette.primary, alpha: 0.9, freq: 0.045, speed: 3.1, amp: h * 0.28 },
        { color: this.palette.secondary, alpha: 0.7, freq: 0.072, speed: -2.2, amp: h * 0.2 },
        { color: this.palette.highlight, alpha: 0.45, freq: 0.11, speed: 4.4, amp: h * 0.11 }
      ];

      traces.forEach((tr) => {
        ctx.strokeStyle = hexToRgba(tr.color, tr.alpha);
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const env = Math.sin((x / w) * Math.PI);
          const y =
            h * 0.5 +
            (Math.sin(x * tr.freq + t * tr.speed) * 0.65 +
              Math.cos(x * tr.freq * 0.5 - t * 1.5) * 0.35) *
              tr.amp *
              env *
              (1 + this.pointer.vel * 0.25);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }

    updateDomReadouts(now) {
      // Throttle DOM text updates slightly (~15Hz) for clean readability & minimal CPU
      if (this.lastDomUpdate && now - this.lastDomUpdate < 65) return;
      this.lastDomUpdate = now;

      const d = new Date();
      if (this.els.clockUtc) {
        this.els.clockUtc.textContent = d.toISOString().replace('T', ' ').slice(0, 22) + ' UTC';
      }
      if (this.els.fps) {
        this.els.fps.textContent = `${Math.round(this.fpsSmooth)} FPS`;
      }
      if (this.els.coords) {
        const xStr = this.smoothPointer.x.toFixed(3);
        const yStr = (-this.smoothPointer.y).toFixed(3);
        this.els.coords.textContent = `VEC [${xStr}, ${yStr}]`;
      }
      if (this.els.coherence) {
        const val = (99.4 + Math.sin(now * 0.0013) * 0.45).toFixed(2);
        this.els.coherence.textContent = `${val}%`;
      }
      if (this.els.entropy) {
        const ent = (0.042 + Math.cos(now * 0.0009) * 0.008 + this.pointer.vel * 0.015).toFixed(3);
        this.els.entropy.textContent = ent;
      }
    }
  }

  window.TelemetryHudRenderer = TelemetryHudRenderer;
})();
