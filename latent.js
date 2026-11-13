/**
 * goGregory.com — Experience 1: Liquid Latent Space (WebGL Fragment Shader)
 * Fullscreen GPU-accelerated domain-warped fluid light with interactive cursor wake.
 */
(function () {
  function hexToRgb01(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  }

  function lerpArr(out, target, t) {
    for (let i = 0; i < 3; i++) {
      out[i] += (target[i] - out[i]) * t;
    }
  }

  class LatentSpaceRenderer {
    constructor(canvas, initialPalette) {
      this.canvas = canvas;
      this.active = false;
      this.rafId = null;
      this.startTime = performance.now();

      // Smoothed cursor & pulse state
      this.mouseTarget = [0.5, 0.5];
      this.mouseCurrent = [0.5, 0.5];
      this.mouseVel = 0;
      this.lastMouse = [0.5, 0.5];
      this.pulseCenter = [0.5, 0.5];
      this.pulseTime = -10.0;

      // Palette RGB vectors (current & target for smooth morphing)
      this.colors = {
        bg: hexToRgb01(initialPalette.bg),
        primary: hexToRgb01(initialPalette.primary),
        secondary: hexToRgb01(initialPalette.secondary),
        tertiary: hexToRgb01(initialPalette.tertiary),
        highlight: hexToRgb01(initialPalette.highlight)
      };
      this.targetColors = {
        bg: [...this.colors.bg],
        primary: [...this.colors.primary],
        secondary: [...this.colors.secondary],
        tertiary: [...this.colors.tertiary],
        highlight: [...this.colors.highlight]
      };

      this.gl =
        canvas.getContext('webgl', { antialias: false, depth: false, stencil: false }) ||
        canvas.getContext('experimental-webgl');

      if (this.gl) {
        this.initWebGL();
      } else {
        this.ctx2d = canvas.getContext('2d');
      }

      this.bindEvents();
      this.resize();
    }

    initWebGL() {
      const gl = this.gl;

      const vsSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      const fsSource = `
        precision highp float;

        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform float u_mouseVel;
        uniform vec2 u_pulseCenter;
        uniform float u_pulseAge;

        uniform vec3 u_bg;
        uniform vec3 u_primary;
        uniform vec3 u_secondary;
        uniform vec3 u_tertiary;
        uniform vec3 u_highlight;

        // Hash & smooth value noise
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // 5-octave rotated fractional Brownian motion
        const mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p = rot * p * 2.03 + vec2(1.7, 9.2);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float aspect = u_resolution.x / max(u_resolution.y, 1.0);

          vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.2;
          vec2 m = (u_mouse - 0.5) * vec2(aspect, 1.0) * 2.2;

          // Interactive cursor gravity & swirl
          vec2 toMouse = p - m;
          float distMouse = length(toMouse);
          float influence = exp(-distMouse * distMouse * 1.65) * (0.35 + u_mouseVel * 0.65);
          vec2 swirl = vec2(-toMouse.y, toMouse.x) * influence * 0.85;
          p += swirl - normalize(toMouse + 0.0001) * influence * 0.22;

          // Click shockwave ripple
          if (u_pulseAge >= 0.0 && u_pulseAge < 4.5) {
            vec2 pc = (u_pulseCenter - 0.5) * vec2(aspect, 1.0) * 2.2;
            vec2 dp = p - pc;
            float r = length(dp);
            float waveRadius = u_pulseAge * 1.15;
            float ring = exp(-pow((r - waveRadius) * 4.5, 2.0)) * exp(-u_pulseAge * 0.85);
            p -= normalize(dp + 0.0001) * ring * 0.18;
          }

          float t = u_time * 0.11;

          // Multi-stage domain warping (liquid silk manifold)
          vec2 q = vec2(
            fbm(p + vec2(0.0, 0.0) + t * 0.55),
            fbm(p + vec2(5.2, 1.3) - t * 0.45)
          );

          vec2 r = vec2(
            fbm(p + 3.4 * q + vec2(1.7, 9.2) + t * 0.35),
            fbm(p + 3.4 * q + vec2(8.3, 2.8) - t * 0.30)
          );

          float f = fbm(p + 2.8 * r);

          // Caustic silk ribbons along warped iso-lines
          float ribbon1 = pow(max(0.0, 1.0 - abs(sin((f * 5.2 + r.x * 2.5 - t * 0.9)))), 4.5);
          float ribbon2 = pow(max(0.0, 1.0 - abs(cos((q.y * 4.4 - r.y * 3.1 + t * 0.7)))), 6.0);

          // Compose deep atmospheric color layers
          vec3 col = u_bg;
          col = mix(col, u_tertiary, smoothstep(0.12, 0.72, f));
          col = mix(col, u_secondary, smoothstep(0.28, 0.88, length(q) * 0.78) * 0.68);
          col = mix(col, u_primary, smoothstep(0.42, 0.95, f * f * 1.45) * 0.85);

          // Add luminous caustic filaments
          col += u_primary * ribbon1 * 0.42;
          col += u_secondary * ribbon2 * 0.30;
          col += u_highlight * pow(ribbon1 * ribbon2, 0.65) * 0.55;

          // Subtle cursor aura glow
          float cursorGlow = exp(-distMouse * distMouse * 2.8) * (0.12 + u_mouseVel * 0.25);
          col += mix(u_primary, u_highlight, 0.4) * cursorGlow;

          // Vignette for cinematic depth
          float vig = 1.0 - smoothstep(0.45, 1.55, length((uv - 0.5) * vec2(1.15, 1.25)));
          col *= mix(0.38, 1.06, vig);

          // Subtle dithering grain to eliminate 8-bit gradient banding
          float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (1.8 / 255.0);
          col += grain;

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `;

      const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
      const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Shader link error:', gl.getProgramInfoLog(program));
        return;
      }

      this.program = program;
      gl.useProgram(program);

      // Fullscreen quad
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      this.uniforms = {
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        time: gl.getUniformLocation(program, 'u_time'),
        mouse: gl.getUniformLocation(program, 'u_mouse'),
        mouseVel: gl.getUniformLocation(program, 'u_mouseVel'),
        pulseCenter: gl.getUniformLocation(program, 'u_pulseCenter'),
        pulseAge: gl.getUniformLocation(program, 'u_pulseAge'),
        bg: gl.getUniformLocation(program, 'u_bg'),
        primary: gl.getUniformLocation(program, 'u_primary'),
        secondary: gl.getUniformLocation(program, 'u_secondary'),
        tertiary: gl.getUniformLocation(program, 'u_tertiary'),
        highlight: gl.getUniformLocation(program, 'u_highlight')
      };
    }

    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      window.addEventListener('pointermove', (e) => {
        const x = e.clientX / Math.max(window.innerWidth, 1);
        const y = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
        this.mouseTarget[0] = x;
        this.mouseTarget[1] = y;
      });

      window.addEventListener('pointerdown', (e) => {
        // Ignore clicks on UI controls
        if (e.target && e.target.closest && e.target.closest('.control-dock, .hud-terminal')) {
          return;
        }
        this.pulseCenter[0] = e.clientX / Math.max(window.innerWidth, 1);
        this.pulseCenter[1] = 1.0 - e.clientY / Math.max(window.innerHeight, 1);
        this.pulseTime = (performance.now() - this.startTime) * 0.001;
      });
    }

    setPalette(palette) {
      this.targetColors.bg = hexToRgb01(palette.bg);
      this.targetColors.primary = hexToRgb01(palette.primary);
      this.targetColors.secondary = hexToRgb01(palette.secondary);
      this.targetColors.tertiary = hexToRgb01(palette.tertiary);
      this.targetColors.highlight = hexToRgb01(palette.highlight);
    }

    triggerPulse() {
      this.pulseCenter = [0.5, 0.5];
      this.pulseTime = (performance.now() - this.startTime) * 0.001;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const width = Math.floor(window.innerWidth * dpr);
      const height = Math.floor(window.innerHeight * dpr);
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.gl) {
          this.gl.viewport(0, 0, width, height);
        }
      }
    }

    setActive(isActive) {
      if (this.active === isActive) return;
      this.active = isActive;
      if (isActive) {
        this.resize();
        this.loop();
      } else if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    loop() {
      if (!this.active) return;
      this.renderFrame();
      this.rafId = requestAnimationFrame(() => this.loop());
    }

    renderFrame() {
      const nowSec = (performance.now() - this.startTime) * 0.001;

      // Smooth cursor interpolation
      this.mouseCurrent[0] += (this.mouseTarget[0] - this.mouseCurrent[0]) * 0.06;
      this.mouseCurrent[1] += (this.mouseTarget[1] - this.mouseCurrent[1]) * 0.06;

      const dx = this.mouseCurrent[0] - this.lastMouse[0];
      const dy = this.mouseCurrent[1] - this.lastMouse[1];
      const instantVel = Math.min(Math.hypot(dx, dy) * 35.0, 1.5);
      this.mouseVel += (instantVel - this.mouseVel) * 0.1;
      this.lastMouse[0] = this.mouseCurrent[0];
      this.lastMouse[1] = this.mouseCurrent[1];

      // Smooth palette color morphing
      const colorLerp = 0.05;
      lerpArr(this.colors.bg, this.targetColors.bg, colorLerp);
      lerpArr(this.colors.primary, this.targetColors.primary, colorLerp);
      lerpArr(this.colors.secondary, this.targetColors.secondary, colorLerp);
      lerpArr(this.colors.tertiary, this.targetColors.tertiary, colorLerp);
      lerpArr(this.colors.highlight, this.targetColors.highlight, colorLerp);

      if (this.gl && this.program) {
        const gl = this.gl;
        const u = this.uniforms;
        gl.useProgram(this.program);
        gl.uniform2f(u.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(u.time, nowSec);
        gl.uniform2f(u.mouse, this.mouseCurrent[0], this.mouseCurrent[1]);
        gl.uniform1f(u.mouseVel, this.mouseVel);
        gl.uniform2f(u.pulseCenter, this.pulseCenter[0], this.pulseCenter[1]);
        gl.uniform1f(u.pulseAge, nowSec - this.pulseTime);

        gl.uniform3fv(u.bg, this.colors.bg);
        gl.uniform3fv(u.primary, this.colors.primary);
        gl.uniform3fv(u.secondary, this.colors.secondary);
        gl.uniform3fv(u.tertiary, this.colors.tertiary);
        gl.uniform3fv(u.highlight, this.colors.highlight);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else if (this.ctx2d) {
        // Graceful 2D fallback if WebGL is unavailable
        const ctx = this.ctx2d;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const toCss = (c) =>
          `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
        const grad = ctx.createRadialGradient(
          w * (0.5 + Math.sin(nowSec * 0.3) * 0.2),
          h * (0.5 + Math.cos(nowSec * 0.25) * 0.2),
          w * 0.05,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.7
        );
        grad.addColorStop(0, toCss(this.colors.primary));
        grad.addColorStop(0.5, toCss(this.colors.tertiary));
        grad.addColorStop(1, toCss(this.colors.bg));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  window.LatentSpaceRenderer = LatentSpaceRenderer;
})();
