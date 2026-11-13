/**
 * goGregory.com — Main Application Orchestrator
 * Coordinates mode switching, palette morphing, keyboard shortcuts, and screensaver idle state.
 */
(function () {
  const cfg = window.GOGREGORY_CONFIG;

  function hexToRgbTriplet(hex) {
    const clean = hex.replace('#', '');
    const n = parseInt(clean, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    // Determine initial mode (URL ?mode=hud|latent overrides config.js defaultMode)
    const urlMode = (params.get('mode') || '').toLowerCase();
    let currentMode =
      urlMode === 'hud' || urlMode === 'latent'
        ? urlMode
        : cfg.defaultMode === 'hud'
          ? 'hud'
          : 'latent';

    // Determine initial palette (URL ?palette=amber|0..4 overrides config.js defaultPalette)
    let currentPaletteIndex = Number.isInteger(cfg.defaultPalette) ? cfg.defaultPalette : 0;
    const urlPalette = (params.get('palette') || '').toLowerCase();
    if (urlPalette) {
      const byId = cfg.palettes.findIndex((p) => p.id === urlPalette);
      const asNum = parseInt(urlPalette, 10);
      if (byId !== -1) currentPaletteIndex = byId;
      else if (!Number.isNaN(asNum) && asNum >= 0 && asNum < cfg.palettes.length) {
        currentPaletteIndex = asNum;
      }
    }
    currentPaletteIndex = Math.max(0, Math.min(cfg.palettes.length - 1, currentPaletteIndex));

    // Populate brand text from config
    document.querySelectorAll('[data-brand-primary]').forEach((el) => {
      el.textContent = cfg.brandPrimary || 'go';
    });
    document.querySelectorAll('[data-brand-accent]').forEach((el) => {
      el.textContent = cfg.brandAccent || 'Gregory';
    });
    document.querySelectorAll('[data-brand-suffix]').forEach((el) => {
      el.textContent = cfg.domainSuffix || '';
    });
    document.querySelectorAll('[data-tagline]').forEach((el) => {
      el.textContent = cfg.tagline || '';
      el.style.display = cfg.tagline ? '' : 'none';
    });

    // Instantiate renderers
    const initialPalette = cfg.palettes[currentPaletteIndex];

    const latentCanvas = document.getElementById('latent-canvas');
    const latentRenderer = new window.LatentSpaceRenderer(latentCanvas, initialPalette);

    const hudCanvas = document.getElementById('hud-canvas');
    const waveCanvas = document.getElementById('hud-wave-canvas');
    const hudRenderer = new window.TelemetryHudRenderer({
      canvas: hudCanvas,
      waveCanvas,
      initialPalette,
      elements: {
        clockUtc: document.getElementById('hud-clock-utc'),
        fps: document.getElementById('hud-fps'),
        coords: document.getElementById('hud-coords'),
        coherence: document.getElementById('hud-coherence'),
        entropy: document.getElementById('hud-entropy'),
        streamLog: document.getElementById('hud-stream-log'),
        terminalForm: document.getElementById('hud-terminal-form'),
        terminalInput: document.getElementById('hud-terminal-input'),
        paletteLabel: document.getElementById('hud-palette-name')
      },
      callbacks: {
        onSwitchMode: (mode) => setMode(mode),
        onCyclePalette: (arg) => {
          if (!arg) {
            setPalette((currentPaletteIndex + 1) % cfg.palettes.length);
            return;
          }
          const byId = cfg.palettes.findIndex(
            (p) => p.id === arg || p.name.toLowerCase().includes(arg)
          );
          const num = parseInt(arg, 10);
          if (byId !== -1) {
            setPalette(byId);
          } else if (!Number.isNaN(num) && num >= 1 && num <= cfg.palettes.length) {
            setPalette(num - 1);
          } else {
            setPalette((currentPaletteIndex + 1) % cfg.palettes.length);
          }
        },
        onZen: () => enterIdleNow()
      }
    });

    // Build Palette Dots inside the Control Dock
    const paletteContainer = document.getElementById('palette-dots');
    const paletteStatusToast = document.getElementById('dock-status-label');
    let toastTimeout = null;

    function showDockLabel(text) {
      if (!paletteStatusToast) return;
      paletteStatusToast.textContent = text;
      paletteStatusToast.classList.add('is-visible');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        paletteStatusToast.classList.remove('is-visible');
      }, 1800);
    }

    cfg.palettes.forEach((pal, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-dot';
      btn.setAttribute('aria-label', `Select ${pal.name} palette`);
      btn.title = `${pal.name} (${idx + 1})`;
      btn.style.setProperty('--dot-primary', pal.primary);
      btn.style.setProperty('--dot-secondary', pal.secondary);
      btn.addEventListener('click', () => {
        setPalette(idx, true);
      });
      paletteContainer.appendChild(btn);
    });

    function applyCssPalette(pal) {
      const root = document.documentElement;
      root.style.setProperty('--bg', pal.bg);
      root.style.setProperty('--primary', pal.primary);
      root.style.setProperty('--primary-rgb', hexToRgbTriplet(pal.primary));
      root.style.setProperty('--secondary', pal.secondary);
      root.style.setProperty('--secondary-rgb', hexToRgbTriplet(pal.secondary));
      root.style.setProperty('--tertiary', pal.tertiary);
      root.style.setProperty('--highlight', pal.highlight);

      const hudPalName = document.getElementById('hud-palette-name');
      if (hudPalName) {
        hudPalName.textContent = pal.name.toUpperCase();
      }
    }

    function setPalette(index, announce = false) {
      currentPaletteIndex = (index + cfg.palettes.length) % cfg.palettes.length;
      const pal = cfg.palettes[currentPaletteIndex];

      applyCssPalette(pal);
      latentRenderer.setPalette(pal);
      hudRenderer.setPalette(pal);

      const dots = paletteContainer.querySelectorAll('.palette-dot');
      dots.forEach((d, i) => d.classList.toggle('is-active', i === currentPaletteIndex));

      if (announce) {
        showDockLabel(pal.name);
        if (currentMode === 'hud') {
          hudRenderer.pushLog('PAL', `chromatic profile shifted -> ${pal.name}`, true);
        }
      }
    }

    // Mode Switching
    let modeTransitionTimer = null;
    const modeButtons = document.querySelectorAll('[data-mode-btn]');

    function setMode(nextMode, announce = false) {
      if (nextMode !== 'latent' && nextMode !== 'hud') return;
      currentMode = nextMode;
      document.body.setAttribute('data-mode', currentMode);

      modeButtons.forEach((btn) => {
        const active = btn.getAttribute('data-mode-btn') === currentMode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      if (modeTransitionTimer) {
        clearTimeout(modeTransitionTimer);
      }

      if (currentMode === 'latent') {
        latentRenderer.setActive(true);
        latentRenderer.triggerPulse();
        modeTransitionTimer = setTimeout(() => {
          if (currentMode === 'latent') hudRenderer.setActive(false);
        }, 850);
        if (announce) showDockLabel('Liquid Latent Space');
      } else {
        hudRenderer.setActive(true);
        hudRenderer.triggerPulse();
        modeTransitionTimer = setTimeout(() => {
          if (currentMode === 'hud') latentRenderer.setActive(false);
        }, 850);
        if (announce) showDockLabel('Autonomous Telemetry HUD');
      }
    }

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-mode-btn');
        if (target !== currentMode) {
          setMode(target, true);
        }
      });
    });

    // Fullscreen button
    const fsBtn = document.getElementById('fullscreen-btn');
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
    if (fsBtn) {
      fsBtn.addEventListener('click', toggleFullscreen);
    }
    document.addEventListener('fullscreenchange', () => {
      if (fsBtn) {
        fsBtn.classList.toggle('is-active', Boolean(document.fullscreenElement));
      }
    });

    // Subtle cursor micro-parallax for Latent hero wordmark
    const latentHero = document.getElementById('latent-hero');
    window.addEventListener('pointermove', (e) => {
      if (currentMode !== 'latent' || !latentHero) return;
      const nx = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      const ny = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
      latentHero.style.transform = `translate3d(${(-nx * 10).toFixed(1)}px, ${(-ny * 8).toFixed(1)}px, 0)`;
    });

    // Screensaver Idle Auto-Hide
    let idleTimer = null;
    const idleMs = Math.max(3, cfg.idleHideSeconds || 7) * 1000;

    function resetIdle() {
      document.body.classList.remove('is-idle');
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.id === 'hud-terminal-input') return;
        document.body.classList.add('is-idle');
      }, idleMs);
    }

    function enterIdleNow() {
      if (idleTimer) clearTimeout(idleTimer);
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      document.body.classList.add('is-idle');
    }

    ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, resetIdle, { passive: true });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const inInput =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA');

      if (e.key === 'Escape' && inInput) {
        document.activeElement.blur();
        return;
      }

      if (inInput) return;

      if (e.key === '/') {
        e.preventDefault();
        if (currentMode !== 'hud') {
          setMode('hud', true);
        }
        setTimeout(() => hudRenderer.focusTerminal(), 80);
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        setMode(currentMode === 'latent' ? 'hud' : 'latent', true);
      } else if (e.key === 't' || e.key === 'T' || e.code === 'Space') {
        if (e.code === 'Space') e.preventDefault();
        setPalette((currentPaletteIndex + 1) % cfg.palettes.length, true);
      } else if (e.key >= '1' && e.key <= String(cfg.palettes.length)) {
        setPalette(parseInt(e.key, 10) - 1, true);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    });

    // Boot initial state
    setPalette(currentPaletteIndex, false);
    setMode(currentMode, false);
    resetIdle();
  });
})();
