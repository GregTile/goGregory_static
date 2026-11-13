/**
 * goGregory.com — Site Configuration
 * ---------------------------------------------------------------------------
 * Edit the values below to customize defaults without touching application code.
 */
window.GOGREGORY_CONFIG = {
  // Default visual experience on page load:
  //   'latent' -> Option 2: Liquid Latent Space (GPU shader screensaver)
  //   'hud'    -> Option 5: Autonomous AI Telemetry HUD (Sci-Fi control screen)
  // Tip: You can also preview either via URL, e.g. ?mode=hud or ?mode=latent
  defaultMode: 'latent',

  // Default color palette index (0 to 4):
  //   0 = Neural Cyan
  //   1 = Latent Violet
  //   2 = Solaris Amber
  //   3 = Phosphor Emerald
  //   4 = Titanium Mono
  defaultPalette: 0,

  // Identity text displayed on screen
  brandPrimary: 'go',
  brandAccent: 'Gregory',
  domainSuffix: '.com',

  // Subtle tagline (set to '' if you ever want zero tagline)
  tagline: 'GREGORY  //  AI & INTELLIGENT SYSTEMS',

  // Seconds of mouse/key inactivity before controls fade out into pure screensaver mode
  idleHideSeconds: 7,

  // Color Palettes (shared across both Liquid Shader and Telemetry HUD)
  palettes: [
    {
      id: 'cyan',
      name: 'Neural Cyan',
      bg: '#03070e',
      primary: '#00e5ff',
      secondary: '#3a56e8',
      tertiary: '#0b2545',
      highlight: '#c8fbff'
    },
    {
      id: 'violet',
      name: 'Latent Violet',
      bg: '#06030f',
      primary: '#b565ff',
      secondary: '#ff2e93',
      tertiary: '#240b47',
      highlight: '#f3d9ff'
    },
    {
      id: 'amber',
      name: 'Solaris Amber',
      bg: '#090603',
      primary: '#ffaa00',
      secondary: '#ff4800',
      tertiary: '#381705',
      highlight: '#fff1cc'
    },
    {
      id: 'emerald',
      name: 'Phosphor Mint',
      bg: '#020906',
      primary: '#00f5a0',
      secondary: '#009975',
      tertiary: '#072b20',
      highlight: '#d4ffee'
    },
    {
      id: 'mono',
      name: 'Titanium Mono',
      bg: '#050507',
      primary: '#d8dee9',
      secondary: '#6c7686',
      tertiary: '#1c2028',
      highlight: '#ffffff'
    }
  ]
};
