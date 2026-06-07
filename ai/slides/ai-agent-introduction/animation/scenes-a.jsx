// Scenes 1–6 of the digest animation
// Each scene component reads localTime via useSprite() and renders an
// absolutely-positioned scene that fills the 1920×1080 stage.

// ── Scene 01: Title ─────────────────────────────────────────────────────────
function Scene01_Title() {
  const { localTime } = useSprite();

  const brandOp = animate({ from: 0, to: 1, start: 0, end: 0.6, ease: Easing.easeOutCubic })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.5, end: 1.6, ease: Easing.easeOutCubic })(localTime);
  const titleY = animate({ from: 36, to: 0, start: 0.5, end: 1.6, ease: Easing.easeOutCubic })(localTime);
  const accentReveal = animate({ from: 0, to: 1, start: 1.4, end: 2.4, ease: Easing.easeOutCubic })(localTime);
  const metaOp = animate({ from: 0, to: 1, start: 1.8, end: 2.6 })(localTime);
  const lineW = animate({ from: 0, to: 320, start: 1.0, end: 2.0, ease: Easing.easeOutCubic })(localTime);
  const exitOp = 1 - animate({ from: 0, to: 1, start: 4.5, end: 5.0, ease: Easing.easeInCubic })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: exitOp }}>
      {/* Brand strip top-left */}
      <div style={{
        position: 'absolute', top: 80, left: 120,
        fontFamily: T.mono, fontSize: 22, color: T.cyan,
        letterSpacing: '0.18em', opacity: brandOp,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <span style={{ display: 'inline-block', width: 12, height: 12, background: T.cyan }}></span>
        <span>p1uscode</span>
        <span style={{ color: T.fgFaint }}>/</span>
        <span style={{ color: T.fgDim }}>ai agent introduction</span>
      </div>

      {/* Top-right meta */}
      <div style={{
        position: 'absolute', top: 80, right: 120,
        fontFamily: T.mono, fontSize: 18, color: T.fgFaint,
        letterSpacing: '0.16em', opacity: brandOp,
      }}>
        DIGEST · 80 sec
      </div>

      {/* Centered title */}
      <div style={{
        position: 'absolute', top: '38%', left: '50%',
        transform: `translate(-50%, calc(-50% + ${titleY}px))`,
        opacity: titleOp, textAlign: 'center',
        fontFamily: T.sans, fontSize: 132, fontWeight: 700, color: T.fg,
        letterSpacing: '-0.015em', lineHeight: 1.12, whiteSpace: 'nowrap',
      }}>
        <div>LLM、AIエージェントの</div>
        <div style={{ marginTop: 8 }}>
          <span style={{
            color: T.cyan,
            backgroundImage: `linear-gradient(90deg, ${T.cyan} 0%, ${T.cyan} 100%)`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${accentReveal * 100}% 100%`,
            backgroundPosition: '0 0',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: accentReveal > 0.02 ? 'transparent' : T.fg,
            WebkitTextFillColor: accentReveal > 0.02 ? 'transparent' : T.fg,
            position: 'relative',
          }}>仕組み</span>を理解する
        </div>
      </div>

      {/* Decorative line */}
      <div style={{
        position: 'absolute', top: '64%', left: '50%',
        transform: 'translate(-50%, 0)',
        width: lineW, height: 2, background: T.cyan,
      }}></div>

      {/* Bottom meta strip */}
      <div style={{
        position: 'absolute', bottom: 100, left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: T.mono, fontSize: 22, color: T.fgFaint,
        letterSpacing: '0.14em', opacity: metaOp,
        display: 'flex', gap: 28, alignItems: 'center',
      }}>
        <span>2026 / 05</span>
        <span style={{ color: T.fgMuted }}>·</span>
        <span>p1us2er0</span>
        <span style={{ color: T.fgMuted }}>·</span>
        <span style={{ color: T.cyan }}>10 PARTS / 89 SLIDES</span>
      </div>
    </div>
  );
}

// ── Scene 02: Agenda (10 parts) ─────────────────────────────────────────────
const AGENDA = [
  ['PART 1', 'LLMは単体で何ができるのか?'],
  ['PART 2', 'LLM API'],
  ['PART 3', 'AIの歴史'],
  ['PART 4', '状態管理'],
  ['PART 5', 'トークンとコンテキスト'],
  ['PART 6', 'ツール'],
  ['PART 7', 'AIエージェント'],
  ['PART 8', 'AIエコシステム'],
  ['PART 9', 'エンジニアリングの3層'],
  ['PART 10', 'ローカルAIスタック'],
];

function Scene02_Agenda() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);
  const exit = animate({ from: 0, to: 1, start: duration - 0.5, end: duration, ease: Easing.easeInCubic })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// AGENDA" right="10 PARTS" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={56}>
        10のパートで、<span style={{ color: T.cyan }}>LLM・AIエージェント</span>を理解する
      </FrameTitle>

      <div style={{
        position: 'absolute', top: 280, left: 80, right: 80, bottom: 100,
        display: 'grid', gridTemplateColumns: '1fr 2px 1fr', gap: '0 80px',
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {AGENDA.slice(0, 5).map(([n, t], i) => {
            const start = 0.6 + i * 0.12;
            const op = animate({ from: 0, to: 1, start, end: start + 0.4, ease: Easing.easeOutCubic })(localTime);
            const x = animate({ from: -30, to: 0, start, end: start + 0.4, ease: Easing.easeOutCubic })(localTime);
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 28,
                borderBottom: i < 4 ? `1px solid ${T.borderDim}` : 'none',
                opacity: op, transform: `translateX(${x}px)`,
              }}>
                <span style={{
                  fontFamily: T.mono, fontSize: 22, color: T.cyan,
                  letterSpacing: '0.14em', minWidth: 110,
                }}>{n}</span>
                <span style={{ fontFamily: T.sans, fontSize: 38, color: T.fg }}>{t}</span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{
          background: T.cyanDim, opacity: animate({ from: 0, to: 0.85, start: 0.5, end: 1.2 })(localTime),
        }}></div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {AGENDA.slice(5).map(([n, t], i) => {
            const start = 0.6 + (i + 5) * 0.12;
            const op = animate({ from: 0, to: 1, start, end: start + 0.4, ease: Easing.easeOutCubic })(localTime);
            const x = animate({ from: 30, to: 0, start, end: start + 0.4, ease: Easing.easeOutCubic })(localTime);
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 28,
                borderBottom: i < 4 ? `1px solid ${T.borderDim}` : 'none',
                opacity: op, transform: `translateX(${x}px)`,
              }}>
                <span style={{
                  fontFamily: T.mono, fontSize: 22, color: T.cyan,
                  letterSpacing: '0.14em', minWidth: 110,
                }}>{n}</span>
                <span style={{ fontFamily: T.sans, fontSize: 38, color: T.fg }}>{t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Scene 03: The Big Question ──────────────────────────────────────────────
function Scene03_Question() {
  const { localTime, duration } = useSprite();
  const kickerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const qOp = animate({ from: 0, to: 1, start: 0.3, end: 1.0, ease: Easing.easeOutCubic })(localTime);
  const qY = animate({ from: 20, to: 0, start: 0.3, end: 1.0, ease: Easing.easeOutCubic })(localTime);
  const subOp = animate({ from: 0, to: 1, start: 1.4, end: 2.0 })(localTime);
  const cursorBlink = Math.floor(localTime * 2) % 2 === 0 ? 1 : 0;
  const exit = animate({ from: 0, to: 1, start: duration - 0.5, end: duration })(localTime);

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: 1 - exit,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: T.mono, fontSize: 24, color: T.cyan,
        letterSpacing: '0.24em', textTransform: 'uppercase',
        opacity: kickerOp, marginBottom: 56,
      }}>
        ─ 質問 ─
      </div>
      <div style={{
        fontFamily: T.sans, fontSize: 132, fontWeight: 700, color: T.fg,
        letterSpacing: '-0.015em', opacity: qOp,
        transform: `translateY(${qY}px)`, textAlign: 'center',
      }}>
        LLMは「<span style={{ color: T.cyan }}>今</span>」を<br />知っているか?
        <span style={{
          display: 'inline-block', width: 6, height: 96, background: T.cyan,
          marginLeft: 16, verticalAlign: 'middle', opacity: cursorBlink,
        }}></span>
      </div>
      <div style={{
        fontFamily: T.sans, fontSize: 38, color: T.fgDim,
        opacity: subOp, marginTop: 64, letterSpacing: '0.02em',
      }}>
        今何時か。今日の天気は。今の為替レートは。
      </div>
    </div>
  );
}

// ── Scene 04: Six Questions Table ───────────────────────────────────────────
const SIX_Q = [
  ['Q1', '今の日時は?', '✗', 'わからない', 'no'],
  ['Q2', '今日の東京の天気は?', '✗', 'わからない', 'no'],
  ['Q3', 'gitリポジトリのファイルは?', '✗', 'わからない', 'no'],
  ['Q4', '現在の政策金利は?', '△', '学習カットオフ次第', 'mid'],
  ['Q5', '3847 × 2915 は?', '△', '解けるが、非効率', 'mid'],
  ['Q6', '富士山の高さは?', '◯', 'わかる', 'ok'],
];

function Scene04_SixQuestions() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);
  const exit = animate({ from: 0, to: 1, start: duration - 0.5, end: duration })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// LLM単体でわかる?" right="6 questions" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={56}>
        6つの質問で、<span style={{ color: T.cyan }}>境界線</span>を引く
      </FrameTitle>

      <div style={{
        position: 'absolute', top: 260, left: 80, right: 80, bottom: 80,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '100px 1fr 500px',
          gap: 24, padding: '20px 16px',
          fontFamily: T.mono, fontSize: 18, color: T.fgFaint,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          borderBottom: `2px solid ${T.cyanDim}`,
          opacity: animate({ from: 0, to: 1, start: 0.5, end: 0.9 })(localTime),
        }}>
          <span>#</span>
          <span>質問</span>
          <span>LLM単体で?</span>
        </div>

        {/* Rows */}
        {SIX_Q.map(([id, q, mark, label, kind], i) => {
          const rowStart = 1.0 + i * 0.4;
          const rowOp = animate({ from: 0, to: 1, start: rowStart, end: rowStart + 0.3 })(localTime);
          const rowX = animate({ from: -20, to: 0, start: rowStart, end: rowStart + 0.3, ease: Easing.easeOutCubic })(localTime);
          const markStart = rowStart + 0.15;
          const markScale = animate({ from: 0.4, to: 1, start: markStart, end: markStart + 0.3, ease: Easing.easeOutBack })(localTime);
          const markOp = animate({ from: 0, to: 1, start: markStart, end: markStart + 0.3 })(localTime);

          const color = kind === 'no' ? T.red : kind === 'mid' ? T.orange : T.cyan;
          const bg = kind === 'ok' ? 'rgba(130, 230, 210, 0.06)' : 'transparent';

          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '100px 1fr 500px',
              gap: 24, padding: '22px 16px',
              fontFamily: T.sans, fontSize: 34, color: T.fg,
              borderBottom: i < 5 ? `1px solid ${T.borderDim}` : 'none',
              background: bg,
              opacity: rowOp, transform: `translateX(${rowX}px)`,
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 24, color: T.fgFaint }}>{id}</span>
              <span>{q}</span>
              <span style={{
                color, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 16,
                opacity: markOp,
                transform: `scale(${markScale})`, transformOrigin: 'left center',
              }}>
                <span style={{ fontSize: 40, fontFamily: T.mono }}>{mark}</span>
                <span style={{ fontSize: 28 }}>{label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Scene 05: LLM only does {facts + language} ──────────────────────────────
function Scene05_LLMLimit() {
  const { localTime, duration } = useSprite();
  const kickerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const line1Op = animate({ from: 0, to: 1, start: 0.3, end: 1.0 })(localTime);
  const line1Y = animate({ from: 20, to: 0, start: 0.3, end: 1.0, ease: Easing.easeOutCubic })(localTime);

  // Two chip pills appear with stagger
  const chip1Op = animate({ from: 0, to: 1, start: 1.0, end: 1.4, ease: Easing.easeOutBack })(localTime);
  const chip1S = animate({ from: 0.7, to: 1, start: 1.0, end: 1.4, ease: Easing.easeOutBack })(localTime);
  const chip2Op = animate({ from: 0, to: 1, start: 1.25, end: 1.65, ease: Easing.easeOutBack })(localTime);
  const chip2S = animate({ from: 0.7, to: 1, start: 1.25, end: 1.65, ease: Easing.easeOutBack })(localTime);
  const onlyOp = animate({ from: 0, to: 1, start: 1.7, end: 2.1 })(localTime);
  const subOp = animate({ from: 0, to: 1, start: 2.4, end: 3.0 })(localTime);

  const exit = animate({ from: 0, to: 1, start: duration - 0.5, end: duration })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: T.mono, fontSize: 22, color: T.cyan, letterSpacing: '0.24em',
        opacity: kickerOp, marginBottom: 48,
      }}>
        ─ つまり ─
      </div>
      <div style={{
        fontFamily: T.sans, fontSize: 56, color: T.fg, fontWeight: 500,
        opacity: line1Op, transform: `translateY(${line1Y}px)`,
        marginBottom: 56, letterSpacing: '-0.005em',
      }}>
        LLM単体でできるのは
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 48 }}>
        <Chip text="学習時の事実" op={chip1Op} s={chip1S} />
        <span style={{
          fontFamily: T.sans, fontSize: 56, color: T.cyan, fontWeight: 600,
          opacity: chip1Op,
        }}>+</span>
        <Chip text="言語運用" op={chip2Op} s={chip2S} />
      </div>

      <div style={{
        fontFamily: T.sans, fontSize: 64, fontWeight: 700, color: T.fg,
        opacity: onlyOp,
      }}>
        <span style={{ color: T.cyan }}>だけ</span>
      </div>

      <div style={{
        position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.sans, fontSize: 28, color: T.fgDim, opacity: subOp,
        textAlign: 'center', lineHeight: 1.6,
      }}>
        今この瞬間の情報 · ローカル環境 · 速度・コスト・確実性が要る計算<br />
        <span style={{ color: T.cyan }}>──── 別の仕組みで補うしかない。</span>
      </div>
    </div>
  );
}

function Chip({ text, op, s }) {
  return (
    <div style={{
      padding: '20px 40px',
      border: `2px solid ${T.cyan}`,
      borderRadius: 8,
      background: 'rgba(130, 230, 210, 0.05)',
      fontFamily: T.sans, fontSize: 48, fontWeight: 600, color: T.fg,
      opacity: op, transform: `scale(${s})`,
    }}>
      {text}
    </div>
  );
}

// ── Scene 06: Stateless API + state = messages — TWO PATTERNS ─────────────
// Pattern A (✗): agent sends ONLY the current message → LLM is confused
// Pattern B (◯): agent sends FULL history → LLM understands correctly
function Scene06_Stateless() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);
  const exit = animate({ from: 0, to: 1, start: duration - 0.4, end: duration })(localTime);

  // ── Context strip timing (T=1 — establishes conversation) ────────────────
  const ctxStart    = 0.9;   // T=1 conversation appears
  const t2QStart    = 1.6;   // T=2 question banner

  // ── Pattern A timing (BAD) ────────────────────────────────────────────────
  const A_labelStart  = 2.2;
  const A_agentStart  = 2.5;   // agent box: only the new question
  const A_postStart   = 3.2;   // POST arrow
  const A_llmStart    = 3.8;   // LLM box appears
  const A_replyStart  = 4.2;   // LLM confused reply
  const A_stampStart  = 5.0;   // ✗ stamp

  // ── Pattern B timing (GOOD) ───────────────────────────────────────────────
  const B_labelStart  = 5.7;
  const B_agentStart  = 6.0;   // agent box: full history
  const B_postStart   = 6.9;   // POST arrow
  const B_llmStart    = 7.5;   // LLM box appears
  const B_replyStart  = 7.9;   // LLM correct reply
  const B_stampStart  = 8.7;   // ◯ stamp

  // Conclusion strip
  const conclOp = animate({ from: 0, to: 1, start: 9.0, end: 9.5 })(localTime);

  // Common helpers
  const op = (s, dur = 0.4) => animate({ from: 0, to: 1, start: s, end: s + dur, ease: Easing.easeOutCubic })(localTime);
  const tY = (s, from = 14, dur = 0.4) =>
    animate({ from, to: 0, start: s, end: s + dur, ease: Easing.easeOutCubic })(localTime);

  // Layout constants for the two-row visualization
  // Two stacked panels; each panel has [agent | post-arrow | llm] columns
  const COL_AGENT = '1fr', COL_POST = '180px', COL_LLM = '1fr';

  // Helper to build one panel (agent, arrow, llm)
  const Panel = ({ kind, agent, llm, badge, t }) => {
    const isBad = kind === 'bad';
    const badgeColor = isBad ? T.red : T.cyan;
    const badgeBg = isBad ? 'rgba(220, 110, 90, 0.08)' : 'rgba(130, 230, 210, 0.06)';

    return (
      <div style={{
        position: 'relative',
        display: 'grid', gridTemplateColumns: `${COL_AGENT} ${COL_POST} ${COL_LLM}`,
        gap: 0, alignItems: 'stretch',
      }}>
        {/* Pattern label badge (top-left, overlapping panel) */}
        <div style={{
          position: 'absolute', top: -18, left: 18,
          fontFamily: T.mono, fontSize: 16, color: badgeColor,
          letterSpacing: '0.2em', padding: '4px 14px',
          background: T.bg, border: `1px solid ${badgeColor}`, borderRadius: 4,
          opacity: op(t.label), zIndex: 2,
        }}>{badge}</div>

        {/* Agent box (left) */}
        <div style={{
          border: `2px solid ${T.cyanDim}`, borderRadius: 8, padding: '20px 22px',
          background: T.cardBg2, opacity: op(t.agent),
          transform: `translateY(${tY(t.agent)}px)`,
        }}>
          <div style={{ fontFamily: T.mono, color: T.cyan, fontSize: 15, letterSpacing: '0.2em' }}>
            AGENT → POST messages
          </div>
          {agent}
        </div>

        {/* Middle column: POST arrow */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              fontFamily: T.mono, fontSize: 14, color: badgeColor,
              letterSpacing: '0.2em', opacity: op(t.post), marginBottom: 8,
            }}>POST</div>
            {/* Arrow shaft */}
            <div style={{
              position: 'relative', height: 3, width: '70%',
              background: 'transparent',
            }}>
              <div style={{
                height: 3,
                width: `${animate({ from: 0, to: 100, start: t.post, end: t.post + 0.5, ease: Easing.easeOutCubic })(localTime)}%`,
                background: badgeColor,
              }}></div>
              {/* Arrowhead */}
              <div style={{
                position: 'absolute', right: -2, top: -5,
                width: 0, height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderLeft: `12px solid ${badgeColor}`,
                opacity: op(t.post + 0.3),
              }}></div>
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 12, color: T.fgFaint,
              marginTop: 10, opacity: op(t.post + 0.3),
            }}>LLM state: ∅</div>
          </div>
        </div>

        {/* LLM box (right) */}
        <div style={{
          border: `2px dashed ${T.borderStrong}`, borderRadius: 8, padding: '20px 22px',
          background: T.cardBg2, opacity: op(t.llm),
          transform: `scale(${animate({ from: 0.96, to: 1, start: t.llm, end: t.llm + 0.4, ease: Easing.easeOutBack })(localTime)})`,
        }}>
          <div style={{ fontFamily: T.mono, color: badgeColor, fontSize: 15, letterSpacing: '0.2em' }}>
            LLM SIDE — 受信した文字列だけ読む
          </div>
          {llm}
        </div>

        {/* Big stamp ✗ / ◯ floating to the right */}
        <div style={{
          position: 'absolute', top: '50%', right: -10,
          transform: `translate(0, -50%) scale(${animate({ from: 0.4, to: 1, start: t.stamp, end: t.stamp + 0.45, ease: Easing.easeOutBack })(localTime)})`,
          opacity: op(t.stamp),
          fontFamily: T.sans, fontSize: 96, fontWeight: 700,
          color: badgeColor, lineHeight: 1, zIndex: 3,
          textShadow: `0 0 28px ${badgeColor}`,
        }}>{isBad ? '✗' : '◯'}</div>
      </div>
    );
  };

  // ── Pattern A: only current message ───────────────────────────────────────
  const A_agent = (
    <div style={{
      marginTop: 12, padding: '12px 16px',
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6,
      fontFamily: T.mono, fontSize: 17, color: T.fgDim, lineHeight: 1.5,
    }}>
      <div style={{ color: T.fgFaint, fontSize: 13, marginBottom: 4 }}>// 履歴を入れずに送る</div>
      <div style={{ color: T.fgDim }}>[ system,</div>
      <div style={{ color: T.red }}>  user: "じゃあ世界一は?" ]</div>
      <div style={{
        color: T.red, fontSize: 13, marginTop: 6,
        opacity: op(A_agentStart + 0.5),
      }}>↳ 過去のやりとりは含まれていない</div>
    </div>
  );

  const A_llm = (
    <div style={{
      marginTop: 12, padding: '12px 16px',
      background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: 6,
      fontFamily: T.mono, fontSize: 17, color: T.fgDim, lineHeight: 1.5,
      minHeight: 110,
    }}>
      <div style={{ color: T.fgFaint, fontSize: 13, marginBottom: 4, opacity: op(A_replyStart - 0.2) }}>
        // 「世界一」だけ来た。何の話?
      </div>
      <div style={{
        color: T.red, fontWeight: 500,
        opacity: op(A_replyStart),
      }}>
        assistant: "何の <span style={{ background: T.red, color: T.bg, padding: '0 6px', borderRadius: 3 }}>『世界一』</span> でしょうか?"
      </div>
      <div style={{
        color: T.red, fontSize: 13, marginTop: 6,
        opacity: op(A_replyStart + 0.5),
      }}>↳ 山の話という文脈を知らない → 困惑</div>
    </div>
  );

  // ── Pattern B: full history ───────────────────────────────────────────────
  const B_agent = (
    <div style={{
      marginTop: 12, padding: '12px 16px',
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 6,
      fontFamily: T.mono, fontSize: 16, color: T.fgDim, lineHeight: 1.5,
    }}>
      <div style={{ color: T.fgFaint, fontSize: 13, marginBottom: 4 }}>// 履歴を全部再送する</div>
      <div style={{ color: T.fgDim }}>[ system,</div>
      <div style={{
        color: T.fgMuted,
        opacity: op(B_agentStart + 0.2),
      }}>  user: "富士山の高さは?",</div>
      <div style={{
        color: T.fgMuted,
        opacity: op(B_agentStart + 0.4),
      }}>  assistant: "3,776m",</div>
      <div style={{
        color: T.cyan,
        opacity: op(B_agentStart + 0.6),
      }}>  user: "じゃあ世界一は?" ]</div>
      <div style={{
        color: T.cyan, fontSize: 13, marginTop: 6,
        opacity: op(B_agentStart + 0.8),
      }}>↳ 文脈は全部この配列の中に</div>
    </div>
  );

  const B_llm = (
    <div style={{
      marginTop: 12, padding: '12px 16px',
      background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: 6,
      fontFamily: T.mono, fontSize: 17, color: T.fgDim, lineHeight: 1.5,
      minHeight: 110,
    }}>
      <div style={{ color: T.fgFaint, fontSize: 13, marginBottom: 4, opacity: op(B_replyStart - 0.2) }}>
        // 配列を読めば、山の話だとわかる
      </div>
      <div style={{
        color: T.cyan, fontWeight: 500,
        opacity: op(B_replyStart),
      }}>
        assistant: "<span style={{ background: T.cyanDim, color: T.bg, padding: '0 6px', borderRadius: 3 }}>エベレスト</span> です。<br />
        &nbsp;&nbsp;標高は 8,849 m です。"
      </div>
      <div style={{
        color: T.cyan, fontSize: 13, marginTop: 6,
        opacity: op(B_replyStart + 0.5),
      }}>↳ 文脈を理解して回答</div>
    </div>
  );

  // Context strip (T=1) reveal
  const ctxOp = op(ctxStart, 0.5);
  const ctxY  = animate({ from: 12, to: 0, start: ctxStart, end: ctxStart + 0.5, ease: Easing.easeOutCubic })(localTime);
  const t2QOp = op(t2QStart, 0.4);
  const t2QY  = animate({ from: 10, to: 0, start: t2QStart, end: t2QStart + 0.4, ease: Easing.easeOutCubic })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// LLM API のハマりポイント" right="stateless" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={42}>
        LLM API は<span style={{ color: T.red }}>完全にステートレス</span> ── <span style={{ color: T.cyan }}>state = messages 配列</span>
      </FrameTitle>

      {/* T=1 context strip: establishes what was discussed before */}
      <div style={{
        position: 'absolute', top: 220, left: 80, right: 80,
        padding: '12px 22px', borderRadius: 6,
        background: 'rgba(255,255,255,0.02)', border: `1px dashed ${T.borderStrong}`,
        display: 'flex', alignItems: 'center', gap: 24,
        fontFamily: T.mono, fontSize: 18,
        opacity: ctxOp, transform: `translateY(${ctxY}px)`,
      }}>
        <span style={{ color: T.fgFaint, letterSpacing: '0.18em', fontSize: 14 }}>T = 1 · 前回までの会話</span>
        <span style={{ color: T.fgMuted }}>│</span>
        <span style={{ color: T.fgDim }}>user: 「富士山の高さは?」</span>
        <span style={{ color: T.fgMuted }}>→</span>
        <span style={{ color: T.fgDim }}>assistant: 「3,776m」</span>
        <span style={{ flex: 1 }}></span>
        <span style={{ color: T.cyan, fontSize: 14, letterSpacing: '0.14em',
          opacity: t2QOp, transform: `translateY(${t2QY}px)` }}>
          T = 2 · 新しい質問 →&nbsp;&nbsp;<span style={{ fontSize: 18, color: T.fg, fontWeight: 600 }}>「じゃあ世界一は?」</span>
        </span>
      </div>

      {/* The two stacked panels */}
      <div style={{
        position: 'absolute', top: 310, left: 80, right: 80, bottom: 100,
        display: 'grid', gridTemplateRows: '1fr 1fr', gap: 30,
      }}>
        <Panel
          kind="bad"
          badge="✗ パターン A · 履歴を送らない"
          t={{ label: A_labelStart, agent: A_agentStart, post: A_postStart, llm: A_llmStart, reply: A_replyStart, stamp: A_stampStart }}
          agent={A_agent}
          llm={A_llm}
        />
        <Panel
          kind="good"
          badge="◯ パターン B · 履歴を全部再送"
          t={{ label: B_labelStart, agent: B_agentStart, post: B_postStart, llm: B_llmStart, reply: B_replyStart, stamp: B_stampStart }}
          agent={B_agent}
          llm={B_llm}
        />
      </div>

      {/* Bottom conclusion strip */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%',
        transform: `translate(-50%, 0)`,
        fontFamily: T.mono, fontSize: 19, color: T.cyan,
        letterSpacing: '0.14em', opacity: conclOp,
        padding: '10px 28px',
        border: `1px solid ${T.cyanDim}`,
        background: 'rgba(130, 230, 210, 0.05)',
      }}>
        会話が続いて見えるのは、エージェントが <span style={{ color: T.fg }}>毎回 messages を全部再送している</span> から
      </div>
    </div>
  );
}

Object.assign(window, {
  Scene01_Title, Scene02_Agenda, Scene03_Question,
  Scene04_SixQuestions, Scene05_LLMLimit, Scene06_Stateless,
});
