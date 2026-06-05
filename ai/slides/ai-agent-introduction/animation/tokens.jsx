// Shared design tokens matching the p1uscode deck aesthetic
const T = {
  // Background tones
  bg: '#0a0a0a',
  cardBg: '#16161a',
  cardBg2: '#0f0f12',
  cardBg3: '#1a1a1e',
  border: '#2a2a27',
  borderDim: '#1f1f1c',
  borderStrong: '#3a3a36',
  rule: '#1f1f1c',

  // Foreground tones
  fg: '#e8e8e6',
  fgDim: '#a8a8a4',
  fgFaint: '#8a8a86',
  fgMuted: '#6a6a66',

  // Accents
  cyan: 'oklch(0.78 0.14 180)',
  cyanDim: 'oklch(0.55 0.10 180)',
  cyanFaint: 'oklch(0.40 0.08 180)',
  red: 'oklch(0.72 0.18 25)',
  redDim: 'oklch(0.55 0.14 25)',
  orange: 'oklch(0.80 0.14 60)',
  orangeDim: 'oklch(0.65 0.12 60)',

  // Fonts
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, 'Hiragino Sans', 'Yu Gothic', sans-serif",
};

// Reusable header bar like the deck's `<div class="frame-header">`
function FrameHeader({ tag, right, opacity = 1, delay = 0 }) {
  return (
    <div style={{
      position: 'absolute',
      top: 60, left: 80, right: 80,
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      fontFamily: T.mono, fontSize: 18, color: T.fgFaint,
      letterSpacing: '0.08em',
      borderBottom: `1px solid ${T.borderDim}`,
      paddingBottom: 14,
      opacity,
    }}>
      <span>{tag}</span>
      {right ? <span style={{ color: T.fgMuted, fontSize: 16 }}>{right}</span> : <span></span>}
    </div>
  );
}

// Title line styled like deck `.title`
function FrameTitle({ children, opacity = 1, y = 0, size = 64 }) {
  return (
    <div style={{
      position: 'absolute',
      top: 130, left: 80, right: 80,
      fontFamily: T.sans, fontSize: size, fontWeight: 600,
      color: T.fg, letterSpacing: '-0.01em',
      lineHeight: 1.2,
      opacity,
      transform: `translateY(${y}px)`,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, { T, FrameHeader, FrameTitle });
