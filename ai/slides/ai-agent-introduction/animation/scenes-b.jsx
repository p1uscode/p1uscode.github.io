// Scenes 7–12 of the digest animation

// ── Scene 07: Tool calling — LLM decides, Agent executes ────────────────────
function Scene07_ToolCalling() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  // Stage: LLM box on left, Agent box on right, tool exec at bottom
  const llmBoxOp = animate({ from: 0, to: 1, start: 0.6, end: 1.0 })(localTime);
  const agentBoxOp = animate({ from: 0, to: 1, start: 0.6, end: 1.0 })(localTime);

  // LLM emits JSON tool call
  const jsonOp = animate({ from: 0, to: 1, start: 1.2, end: 1.8 })(localTime);
  const arrowL2A = animate({ from: 0, to: 1, start: 1.8, end: 2.4, ease: Easing.easeInOutCubic })(localTime);

  // Agent executes
  const execOp = animate({ from: 0, to: 1, start: 2.5, end: 3.0, ease: Easing.easeOutBack })(localTime);
  const execS = animate({ from: 0.7, to: 1, start: 2.5, end: 3.0, ease: Easing.easeOutBack })(localTime);

  // Result returns
  const arrowA2L = animate({ from: 0, to: 1, start: 3.3, end: 3.9, ease: Easing.easeInOutCubic })(localTime);
  const resultOp = animate({ from: 0, to: 1, start: 3.9, end: 4.3 })(localTime);

  // Big takeaway text
  const takeawayOp = animate({ from: 0, to: 1, start: 4.6, end: 5.2 })(localTime);
  const takeawayY = animate({ from: 20, to: 0, start: 4.6, end: 5.2, ease: Easing.easeOutCubic })(localTime);

  const exit = animate({ from: 0, to: 1, start: duration - 0.4, end: duration })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// tool calling の核心" right="LLM decides · Agent executes" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={52}>
        外の世界を触るには、<span style={{ color: T.cyan }}>tools</span> を渡す
      </FrameTitle>

      <div style={{
        position: 'absolute', top: 280, left: 80, right: 80, bottom: 280,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80,
      }}>
        {/* LLM Box */}
        <div style={{
          border: `2px solid ${T.cyanDim}`, borderRadius: 12, padding: '28px 32px',
          background: T.cardBg2, opacity: llmBoxOp, position: 'relative',
        }}>
          <div style={{ fontFamily: T.mono, fontSize: 20, color: T.cyan, letterSpacing: '0.2em' }}>LLM</div>
          <div style={{ fontFamily: T.sans, fontSize: 30, color: T.fg, fontWeight: 600, marginTop: 8 }}>
            決める <span style={{ color: T.fgFaint, fontSize: 22, fontWeight: 400 }}>(JSON を返すだけ)</span>
          </div>
          <div style={{
            marginTop: 24, padding: '20px 24px',
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
            fontFamily: T.mono, fontSize: 22, lineHeight: 1.5,
            opacity: jsonOp,
          }}>
            <div style={{ color: T.fgFaint }}>{`{`}</div>
            <div style={{ color: T.fgDim, paddingLeft: 24 }}>
              <span style={{ color: T.cyan }}>"name"</span>: <span style={{ color: T.orange }}>"weather"</span>,
            </div>
            <div style={{ color: T.fgDim, paddingLeft: 24 }}>
              <span style={{ color: T.cyan }}>"args"</span>: {`{`} <span style={{ color: T.orange }}>"city"</span>: <span style={{ color: T.orange }}>"Tokyo"</span> {`}`}
            </div>
            <div style={{ color: T.fgFaint }}>{`}`}</div>
          </div>
          <div style={{
            position: 'absolute', bottom: 18, left: 32, right: 32,
            fontFamily: T.mono, fontSize: 14, color: T.fgMuted, letterSpacing: '0.1em',
          }}>
            ✗ Web · ファイル · 計算には触れない
          </div>
        </div>

        {/* Agent Box */}
        <div style={{
          border: `2px solid ${T.cyanDim}`, borderRadius: 12, padding: '28px 32px',
          background: T.cardBg2, opacity: agentBoxOp, position: 'relative',
        }}>
          <div style={{ fontFamily: T.mono, fontSize: 20, color: T.cyan, letterSpacing: '0.2em' }}>AGENT</div>
          <div style={{ fontFamily: T.sans, fontSize: 30, color: T.fg, fontWeight: 600, marginTop: 8 }}>
            叩く <span style={{ color: T.fgFaint, fontSize: 22, fontWeight: 400 }}>(実際の関数を呼ぶ)</span>
          </div>

          <div style={{
            marginTop: 24, padding: '20px 24px',
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
            fontFamily: T.mono, fontSize: 22, lineHeight: 1.5,
            opacity: execOp, transform: `scale(${execS})`, transformOrigin: 'top left',
          }}>
            <div style={{ color: T.fgFaint }}>$ exec weather(city=Tokyo)</div>
            <div style={{ color: T.cyan, marginTop: 6, opacity: resultOp }}>→ "晴れ / 22℃ / 風速3m"</div>
          </div>

          <div style={{
            position: 'absolute', bottom: 18, left: 32, right: 32,
            fontFamily: T.mono, fontSize: 14, color: T.fgMuted, letterSpacing: '0.1em',
          }}>
            ◯ 権限 · リトライ · エラーハンドリングはここ
          </div>
        </div>
      </div>

      {/* Arrows between boxes */}
      <div style={{
        position: 'absolute', top: 460, left: '50%', transform: 'translateX(-50%)',
        width: 160, height: 4, pointerEvents: 'none',
      }}>
        {/* Top arrow: LLM → Agent (tool_call) */}
        <div style={{
          position: 'absolute', top: -40, left: 0, right: 0,
          fontFamily: T.mono, fontSize: 16, color: T.cyan,
          letterSpacing: '0.16em', textAlign: 'center', opacity: arrowL2A,
        }}>tool_call →</div>
        <div style={{
          position: 'absolute', top: -16, left: 0,
          width: `${arrowL2A * 100}%`, height: 3, background: T.cyan,
        }}></div>

        {/* Bottom arrow: Agent → LLM (result) */}
        <div style={{
          position: 'absolute', top: 30, right: 0,
          width: `${arrowA2L * 100}%`, height: 3, background: T.orange,
          transform: 'translateX(0)', right: 0, marginLeft: 'auto',
        }}></div>
        <div style={{
          position: 'absolute', top: 50, left: 0, right: 0,
          fontFamily: T.mono, fontSize: 16, color: T.orange,
          letterSpacing: '0.16em', textAlign: 'center', opacity: arrowA2L,
        }}>← tool result</div>
      </div>

      {/* Big takeaway */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%',
        transform: `translate(-50%, ${takeawayY}px)`,
        fontFamily: T.sans, fontSize: 56, fontWeight: 700, color: T.fg,
        opacity: takeawayOp, textAlign: 'center', letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
      }}>
        決めるのは <span style={{ color: T.cyan }}>LLM</span>、
        叩くのは <span style={{ color: T.cyan }}>エージェント</span>
      </div>
    </div>
  );
}

// ── Scene 08: Agent Loop ────────────────────────────────────────────────────
function Scene08_AgentLoop() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  // Node positions on the canvas (relative inside box)
  // We'll layout 4 nodes in a horizontal row + a back-loop arc
  // Cycle period: trace one full loop in ~3s, run 2 cycles
  // 0.5 -> 1.0: build nodes
  // 1.0 -> 8.0: 2 loops total

  const nodes = [
    { id: 'user', label: 'USER', sub: 'メッセージ投入', x: 80, y: 220, color: T.cyan },
    { id: 'llm', label: 'LLM', sub: '次の一手を決める', x: 540, y: 220, color: T.cyan },
    { id: 'check', label: 'finish_reason?', sub: 'stop or tool_calls', x: 980, y: 220, color: T.orange, isRhombus: true },
    { id: 'tool', label: 'TOOLS', sub: 'エージェントが実行', x: 1440, y: 220, color: T.cyan },
  ];

  const buildStart = 0.6;
  const cycleDur = 2.5;
  const cycle1Start = 1.4;
  const cycle2Start = cycle1Start + cycleDur;
  const cycle3Start = cycle2Start + cycleDur;   // stop branch begins here

  // dot position along the loop path
  const cyclePoses = [];
  for (let c = 0; c < 3; c++) {
    const s = cycle1Start + c * cycleDur;
    cyclePoses.push({ start: s, end: s + cycleDur });
  }

  // Animated dot. Cycles 0 & 1: full tool loop. Cycle 2: bypasses tool, lands on FINAL.
  function dotPos(c) {
    const { start, end } = cyclePoses[c];
    let t = (localTime - start) / (end - start);
    if (t < 0) return null;
    // Cycle 2 (stop) holds at FINAL forever once it arrives; tool cycles disappear after their loop.
    if (c === 2) t = Math.min(t, 1.0);
    else if (t > 1.0) return null;
    // segments (fractions):
    // 0.0-0.18 user->llm
    // 0.18-0.32 llm->check
    // 0.32-0.50 check->tool (cycle 1) OR check->stop label (cycle 2)
    // 0.50-0.80 tool->llm (arc back, cycle 1 only)
    // 0.80-1.0 hold
    const userX = nodes[0].x + 100, llmX = nodes[1].x + 100, checkX = nodes[2].x + 100, toolX = nodes[3].x + 100;
    const y0 = 280; // baseline y for dot
    if (c < 2) {
      // Tool loop — first iteration starts at USER; subsequent iterations start at LLM (with tool result)
      const firstSeg = c === 0;
      if (firstSeg && t < 0.16) {
        const u = t / 0.16;
        return { x: userX + (llmX - userX) * u, y: y0, kind: 'msg' };
      } else if (t < 0.32) {
        const u = firstSeg ? (t - 0.16) / 0.16 : t / 0.32;
        return { x: llmX + (checkX - llmX) * u, y: y0, kind: 'msg' };
      } else if (t < 0.50) {
        const u = (t - 0.32) / 0.18;
        return { x: checkX + (toolX - checkX) * u, y: y0, kind: 'call' };
      } else if (t < 0.85) {
        // arc back from tool to llm
        const u = (t - 0.50) / 0.35;
        const ax = toolX + (llmX - toolX) * u;
        const ay = y0 + Math.sin(u * Math.PI) * -200;
        return { x: ax, y: ay, kind: 'result' };
      } else {
        return { x: llmX, y: y0, kind: 'result' };
      }
    } else {
      // cycle 2 (stop) — LLM → check → down to FINAL → arc back to USER (結果返却)
      const finalX = checkX;     // FINAL stamp center x (aligned with check)
      const finalY = y0 + 180;   // FINAL stamp center y (below check)
      if (t < 0.15) {
        // LLM → check (horizontal)
        const u = t / 0.15;
        return { x: llmX + (checkX - llmX) * u, y: y0, kind: 'msg' };
      } else if (t < 0.35) {
        // check → FINAL (vertical, going down)
        const u = (t - 0.15) / 0.20;
        const ueased = Easing.easeInOutCubic(u);
        return { x: checkX, y: y0 + (finalY - y0) * ueased, kind: 'final' };
      } else if (t < 0.50) {
        // Brief hold at FINAL (response is being wrapped up)
        return { x: finalX, y: finalY, kind: 'final' };
      } else if (t < 0.85) {
        // FINAL → USER (long arc returning BELOW the row, not crossing labels/nodes)
        const u = (t - 0.50) / 0.35;
        const ueased = Easing.easeInOutCubic(u);
        const rx = finalX + (userX - finalX) * ueased;
        // Arc dips DOWN below FINAL/USER baseline before rising back up to USER
        const ry = finalY + (y0 - finalY) * ueased + Math.sin(ueased * Math.PI) * 160;
        return { x: rx, y: ry, kind: 'response' };
      } else {
        // Hold at USER — result delivered
        return { x: userX, y: y0, kind: 'response' };
      }
    }
  }

  const cycleActive = localTime < cycle1Start ? -1 :
                      localTime < cycle2Start ? 0 :
                      localTime < cycle3Start ? 1 : 2;
  const pos = cycleActive >= 0 ? dotPos(cycleActive) : null;

  // Stop indicator appears on cycle 3 (the stop branch)
  const stopOp = animate({ from: 0, to: 1, start: cycle3Start + 0.5, end: cycle3Start + 1.0 })(localTime);

  // Cycle counter
  const cycleLabel = localTime < cycle1Start ? '' :
                     localTime < cycle2Start ? '— iteration 1 / tool_calls' :
                     localTime < cycle3Start ? '— iteration 2 / tool_calls' :
                     '— iteration 3 / stop → return';

  const exit = animate({ from: 0, to: 1, start: duration - 0.4, end: duration })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// エージェントループの骨格" right={cycleLabel} opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={52}>
        エージェントは <span style={{ color: T.cyan }}>単純な while ループ</span>
      </FrameTitle>

      {/* Loop canvas */}
      <div style={{
        position: 'absolute', top: 270, left: 80, right: 80, height: 660,
        background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 10,
        opacity: animate({ from: 0, to: 1, start: 0.4, end: 0.9 })(localTime),
      }}>
        {/* Nodes */}
        {nodes.map((n, i) => {
          const s = animate({ from: 0.8, to: 1, start: buildStart + i * 0.1, end: buildStart + i * 0.1 + 0.4, ease: Easing.easeOutBack })(localTime);
          const op = animate({ from: 0, to: 1, start: buildStart + i * 0.1, end: buildStart + i * 0.1 + 0.4 })(localTime);
          return n.isRhombus ? (
            <div key={n.id} style={{
              position: 'absolute', left: n.x, top: n.y, width: 200, height: 120,
              opacity: op, transform: `scale(${s})`,
            }}>
              <div style={{
                width: '100%', height: '100%',
                transform: 'rotate(45deg)', transformOrigin: 'center',
                border: `2px solid ${T.orange}`, background: T.cardBg,
                position: 'absolute', inset: 0,
              }}></div>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.mono, color: T.orange, fontSize: 18, fontWeight: 600, letterSpacing: '0.1em',
              }}>
                <div>{n.label}</div>
                <div style={{ fontSize: 12, color: T.fgFaint, letterSpacing: '0.08em', marginTop: 4 }}>{n.sub}</div>
              </div>
            </div>
          ) : (
            <div key={n.id} style={{
              position: 'absolute', left: n.x, top: n.y, width: 200, height: 120,
              border: `2px solid ${n.color}`, borderRadius: 8,
              background: T.cardBg,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: op, transform: `scale(${s})`,
            }}>
              <div style={{ fontFamily: T.mono, color: n.color, fontSize: 20, letterSpacing: '0.18em', fontWeight: 600 }}>{n.label}</div>
              <div style={{ fontFamily: T.sans, color: T.fgDim, fontSize: 16, marginTop: 6 }}>{n.sub}</div>
            </div>
          );
        })}

        {/* Static connecting lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {/* user → llm */}
          <line x1={280} y1={280} x2={540} y2={280} stroke={T.borderStrong} strokeWidth="2" markerEnd="url(#aLoopArrow)" />
          {/* llm → check */}
          <line x1={740} y1={280} x2={980} y2={280} stroke={T.borderStrong} strokeWidth="2" markerEnd="url(#aLoopArrow)" />
          {/* check → tool */}
          <line x1={1180} y1={280} x2={1440} y2={280} stroke={T.borderStrong} strokeWidth="2" markerEnd="url(#aLoopArrow)" />
          {/* tool → llm arc */}
          <path d="M 1540 240 Q 1100 60 660 240" fill="none" stroke={T.cyanDim} strokeWidth="2" strokeDasharray="6 5" markerEnd="url(#aLoopArrow)" />
          {/* check → stop (down) */}
          <line x1={1080} y1={340} x2={1080} y2={420} stroke={T.borderStrong} strokeWidth="2" markerEnd="url(#aLoopArrow)" strokeOpacity={stopOp} />
          {/* FINAL → USER return arc (response delivery) */}
          {(() => {
            const t = cycleActive === 2 ? (localTime - cyclePoses[2].start) / (cyclePoses[2].end - cyclePoses[2].start) : 0;
            const ret = animate({ from: 0, to: 1, start: 0.40, end: 0.65, ease: Easing.easeOutCubic })(t);
            const fade = cycleActive === 2 ? ret : 0;
            return (
              <path d="M 1080 460 Q 620 720 180 280"
                    fill="none" stroke={T.cyan} strokeWidth="2.5" strokeDasharray="8 6"
                    markerEnd="url(#aLoopArrowCyan)"
                    strokeOpacity={fade} />
            );
          })()}

          <defs>
            <marker id="aLoopArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={T.borderStrong} />
            </marker>
            <marker id="aLoopArrowCyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={T.cyan} />
            </marker>
          </defs>
        </svg>

        {/* Edge labels */}
        <div style={{
          position: 'absolute', top: 240, left: 760,
          fontFamily: T.mono, fontSize: 14, color: T.fgFaint, letterSpacing: '0.1em',
          opacity: animate({ from: 0, to: 1, start: 1.0, end: 1.4 })(localTime),
        }}>messages</div>
        <div style={{
          position: 'absolute', top: 240, left: 1230,
          fontFamily: T.mono, fontSize: 14, color: T.cyan, letterSpacing: '0.1em',
          opacity: animate({ from: 0, to: 1, start: 1.0, end: 1.4 })(localTime),
        }}>tool_calls</div>
        <div style={{
          position: 'absolute', top: 30, left: 980,
          fontFamily: T.mono, fontSize: 14, color: T.cyanDim, letterSpacing: '0.1em',
          opacity: animate({ from: 0, to: 1, start: 1.0, end: 1.4 })(localTime),
        }}>↩ tool result → loop back</div>

        {/* Response delivery label — below the row, on the return arc */}
        <div style={{
          position: 'absolute', top: 580, left: '50%', transform: 'translateX(-50%)',
          fontFamily: T.mono, fontSize: 15, color: T.cyan, letterSpacing: '0.16em',
          opacity: cycleActive === 2
            ? animate({ from: 0, to: 1, start: 0.45, end: 0.65 })((localTime - cyclePoses[2].start) / (cyclePoses[2].end - cyclePoses[2].start))
            : 0,
          background: T.cardBg2, padding: '4px 12px', borderRadius: 3,
          border: `1px solid ${T.cyanDim}`, whiteSpace: 'nowrap',
        }}>結果 → ユーザに返却</div>

        {/* STOP indicator */}
        <div style={{
          position: 'absolute', top: 430, left: 980, width: 200,
          textAlign: 'center', opacity: stopOp,
        }}>
          <div style={{
            display: 'inline-block', padding: '12px 24px',
            border: `2px solid ${T.red}`, borderRadius: 8, background: T.cardBg,
            fontFamily: T.mono, fontSize: 22, color: T.red, fontWeight: 600, letterSpacing: '0.2em',
          }}>FINAL</div>
        </div>

        {/* Animated dot */}
        {pos && (() => {
          const isFinal = pos.kind === 'final';
          const isResponse = pos.kind === 'response';
          const cycle2T = cycleActive === 2 ? (localTime - cyclePoses[2].start) / (cyclePoses[2].end - cyclePoses[2].start) : 0;
          const isLanded = cycleActive === 2 && cycle2T > 0.35 && cycle2T < 0.50;
          const isDelivered = cycleActive === 2 && cycle2T >= 0.85;
          // Subtle pulse after landing on FINAL OR delivered to USER
          const pulse = (isLanded || isDelivered) ? (Math.sin((localTime - cyclePoses[2].start) * 6) * 0.5 + 0.5) : 0;
          const dotSize = 24 + ((isLanded || isDelivered) ? pulse * 6 : 0);
          const dotColor = pos.kind === 'call' ? T.cyan
                         : pos.kind === 'result' ? T.orange
                         : pos.kind === 'response' ? T.cyan
                         : isFinal ? T.red : T.cyan;
          return (
            <div style={{
              position: 'absolute', left: pos.x - dotSize / 2, top: pos.y - dotSize / 2,
              width: dotSize, height: dotSize, borderRadius: dotSize / 2,
              background: dotColor,
              boxShadow: `0 0 ${(isLanded || isDelivered) ? 28 + pulse * 12 : 16}px ${dotColor}`,
              zIndex: 5,
            }}></div>
          );
        })()}
      </div>

      {/* Bottom code-style summary */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.mono, fontSize: 22, color: T.fgDim, letterSpacing: '0.04em',
        padding: '14px 28px', border: `1px solid ${T.borderDim}`, background: T.cardBg2,
        opacity: animate({ from: 0, to: 1, start: 1.2, end: 1.8 })(localTime),
      }}>
        while (true) {`{`} response = llm(messages); if (stop) break; tool_results = exec(response.tool_calls); messages.push(...) {`}`}
      </div>
    </div>
  );
}

// ── Scene 09: 80/20 split ───────────────────────────────────────────────────
function Scene09_8020() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  // Bar fades in at 50/50, then LLM swells dominant, then flips to 80/20 (det wins)
  const barOp = animate({ from: 0, to: 1, start: 0.6, end: 1.2, ease: Easing.easeOutCubic })(localTime);

  // detFrac trajectory:
  //   0.0–1.2  : holds 0.5 (initial split)
  //   1.2–2.2  : 0.5 → 0.25 (LLM swells, becomes dominant)
  //   2.2–2.7  : hold at 0.25
  //   2.7–3.7  : 0.25 → 0.80 (FLIP — det reclaims majority)
  const detFrac = localTime < 1.2 ? 0.5 :
    interpolate(
      [1.2, 2.2, 2.7, 3.7],
      [0.5, 0.25, 0.25, 0.80],
      Easing.easeInOutCubic
    )(localTime);
  const llmFrac = 1 - detFrac;

  // Numbers tick live with the split
  const det = Math.round(detFrac * 100);
  const llm = 100 - det;

  // Bullet list under each
  const bulletsOp1 = animate({ from: 0, to: 1, start: 3.9, end: 4.4 })(localTime);
  const bulletsOp2 = animate({ from: 0, to: 1, start: 4.1, end: 4.6 })(localTime);

  // Closing tagline
  const tagOp = animate({ from: 0, to: 1, start: 4.6, end: 5.1 })(localTime);

  const exit = animate({ from: 0, to: 1, start: duration - 0.4, end: duration })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// エージェントの内訳" right="80 / 20" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={56}>
        エージェントの <span style={{ color: T.cyan }}>80%</span> は、普通のコード
      </FrameTitle>

      {/* Bar */}
      <div style={{
        position: 'absolute', top: 360, left: 120, right: 120, height: 140,
        border: `1px solid ${T.border}`, borderRadius: 4,
        background: T.cardBg2, overflow: 'hidden', display: 'flex',
        opacity: barOp,
      }}>
        {/* Deterministic segment */}
        <div style={{
          width: `${detFrac * 100}%`, background: T.cardBg,
          borderRight: `2px solid ${T.cyan}`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 36px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: T.mono, color: T.cyan, fontSize: 18, letterSpacing: '0.18em' }}>DETERMINISTIC</div>
            <div style={{ fontFamily: T.sans, fontSize: 64, fontWeight: 700, color: T.fg, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {det}<span style={{ fontSize: 36, color: T.fgFaint }}>%</span>
            </div>
          </div>
        </div>
        {/* LLM segment */}
        <div style={{
          width: `${llmFrac * 100}%`,
          background: T.cyan,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 36px',
          overflow: 'hidden',
        }}>
          <div style={{ whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: T.mono, color: T.bg, fontSize: 18, letterSpacing: '0.18em' }}>LLM</div>
            <div style={{ fontFamily: T.sans, fontSize: 64, fontWeight: 700, color: T.bg, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {llm}<span style={{ fontSize: 36 }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bullets row — deterministic side, 2 rows to avoid overlap with LLM column */}
      <div style={{
        position: 'absolute', top: 540, left: 120, width: 'calc(80% - 100px)',
        display: 'flex', flexDirection: 'column', gap: 14,
        opacity: bulletsOp1,
        fontFamily: T.sans, fontSize: 24, color: T.fgDim,
      }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {['ルーティング', 'バリデーション', '権限チェック', 'リトライ', 'バックオフ', 'ループ制御'].map(t => (
            <span key={t} style={{
              padding: '8px 18px', border: `1px solid ${T.border}`,
              borderRadius: 4, background: T.cardBg2,
            }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {['スキーマ検証', 'ロギング'].map(t => (
            <span key={t} style={{
              padding: '8px 18px', border: `1px solid ${T.border}`,
              borderRadius: 4, background: T.cardBg2,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 540, right: 120, width: '17%',
        opacity: bulletsOp2,
        fontFamily: T.sans, fontSize: 22, color: T.bg,
      }}>
        <div style={{
          padding: '8px 18px', background: T.cyan, borderRadius: 4, color: T.bg,
          fontWeight: 600, display: 'inline-block', marginBottom: 8,
        }}>曖昧性処理</div>
        <div style={{
          padding: '8px 18px', background: T.cyan, borderRadius: 4, color: T.bg,
          fontWeight: 600, display: 'inline-block', marginBottom: 8, marginLeft: 8,
        }}>意図理解</div>
        <div style={{
          padding: '8px 18px', background: T.cyan, borderRadius: 4, color: T.bg,
          fontWeight: 600, display: 'inline-block',
        }}>生成</div>
      </div>

      {/* Tagline */}
      <div style={{
        position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.sans, fontSize: 32, color: T.fgDim,
        opacity: tagOp, textAlign: 'center',
      }}>
        → AIエージェント開発は、その大半が <span style={{ color: T.cyan }}>従来のソフトウェア工学</span>。
      </div>
    </div>
  );
}

// ── Scene 10: 7 Elements of an Agent ────────────────────────────────────────
const SEVEN = [
  { name: '人',         en: 'human',     deg: -90 },
  { name: 'エージェント', en: 'agent',     deg: -38 },
  { name: 'LLM',        en: 'llm',       deg: 14 },
  { name: 'ツール',      en: 'tools',     deg: 66 },
  { name: 'プレイブック', en: 'playbook',  deg: 118 },
  { name: 'メモリ',      en: 'memory',    deg: 170 },
  { name: 'ガード',      en: 'guard',     deg: 222 },
];

function Scene10_SevenElements() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  const cx = 960, cy = 620, r = 270;

  const exit = animate({ from: 0, to: 1, start: duration - 0.4, end: duration })(localTime);

  // Center ring pulse
  const pulse = (Math.sin(localTime * 1.5) * 0.5 + 0.5);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// 7つの要素 — エージェントの登場人物" right="7 elements" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={52}>
        エージェントは <span style={{ color: T.cyan }}>7つの要素</span> が <span style={{ color: T.cyan }}>ループ</span> して動く
      </FrameTitle>

      {/* Centered orbit visualization */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Orbit ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.borderStrong} strokeDasharray="4 6" strokeWidth="1.5"
                opacity={animate({ from: 0, to: 0.7, start: 0.6, end: 1.2 })(localTime)} />
        {/* Inner pulse */}
        <circle cx={cx} cy={cy} r={36 + pulse * 6} fill="none" stroke={T.cyan} strokeWidth="2"
                opacity={animate({ from: 0, to: 1, start: 1.4, end: 2.0 })(localTime) * (1 - pulse * 0.4)} />
        <circle cx={cx} cy={cy} r={28} fill={T.cyan}
                opacity={animate({ from: 0, to: 1, start: 1.0, end: 1.5 })(localTime)} />

        {/* Spokes & nodes */}
        {SEVEN.map((s, i) => {
          const start = 0.8 + i * 0.18;
          const op = animate({ from: 0, to: 1, start, end: start + 0.4, ease: Easing.easeOutCubic })(localTime);
          const scl = animate({ from: 0.5, to: 1, start, end: start + 0.4, ease: Easing.easeOutBack })(localTime);
          const rad = s.deg * Math.PI / 180;
          const x = cx + Math.cos(rad) * r;
          const y = cy + Math.sin(rad) * r;
          const isLLM = s.en === 'llm';
          const isHuman = s.en === 'human';
          const color = (isLLM || isHuman) ? T.cyan : T.fg;
          return (
            <g key={s.en} opacity={op} transform={`translate(${x},${y}) scale(${scl})`}>
              {/* Spoke line */}
              <line x1={(cx - x) * 0.85} y1={(cy - y) * 0.85} x2={(cx - x) * 0.15} y2={(cy - y) * 0.15}
                    stroke={T.borderStrong} strokeWidth="1" strokeDasharray="3 4" />
              {/* Node circle */}
              <circle cx={0} cy={0} r="72" fill={T.cardBg} stroke={color} strokeWidth="2" />
              <text x={0} y={-6} fontFamily={T.sans} fontSize="28" fontWeight="600"
                    fill={color} textAnchor="middle" dominantBaseline="middle">{s.name}</text>
              <text x={0} y={26} fontFamily={T.mono} fontSize="14" letterSpacing="0.18em"
                    fill={T.fgFaint} textAnchor="middle">{s.en}</text>
            </g>
          );
        })}

        {/* Center label */}
        <text x={cx} y={cy + 70} fontFamily={T.mono} fontSize="18" letterSpacing="0.2em"
              fill={T.cyan} textAnchor="middle"
              opacity={animate({ from: 0, to: 1, start: 2.0, end: 2.4 })(localTime)}>LOOP</text>
      </svg>

      {/* Caption strip at bottom */}
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.sans, fontSize: 24, color: T.fgDim, letterSpacing: '0.02em',
        textAlign: 'center', opacity: animate({ from: 0, to: 1, start: 2.6, end: 3.2 })(localTime),
      }}>
        最も重要なのは <span style={{ color: T.cyan, fontWeight: 600 }}>人</span> ── 出力を検証し、
        文脈を渡し、範囲を決め、軌道修正する。
      </div>
    </div>
  );
}

// ── Scene 11: 3 Engineering Layers ──────────────────────────────────────────
function Scene11_ThreeLayers() {
  const { localTime, duration } = useSprite();
  const headerOp = animate({ from: 0, to: 1, start: 0, end: 0.4 })(localTime);
  const titleOp = animate({ from: 0, to: 1, start: 0.2, end: 0.8 })(localTime);

  // Layers reveal outside-in: Harness → Context → Prompt → LLM core
  const lay = (s) => ({
    op: animate({ from: 0, to: 1, start: s, end: s + 0.4 })(localTime),
    sc: animate({ from: 0.85, to: 1, start: s, end: s + 0.5, ease: Easing.easeOutCubic })(localTime),
  });
  const L1 = lay(0.6); // Harness (outer)
  const L2 = lay(1.1); // Context
  const L3 = lay(1.6); // Prompt
  const Lc = lay(2.1); // LLM core

  const cx = 960, cy = 555;
  const exit = animate({ from: 0, to: 1, start: duration - 0.4, end: duration })(localTime);

  // Tagline
  const tagOp = animate({ from: 0, to: 1, start: 3.0, end: 3.6 })(localTime);

  const layerBox = (size, color, op, sc) => ({
    position: 'absolute',
    left: cx - size / 2, top: cy - size / 2,
    width: size, height: size,
    border: `2px solid ${color}`, borderRadius: 12,
    background: T.cardBg2,
    opacity: op, transform: `scale(${sc})`,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - exit }}>
      <FrameHeader tag="// エンジニアリングの3層" right="prompt · context · harness" opacity={headerOp} />
      <FrameTitle opacity={titleOp} size={52}>
        AIエージェントの品質は <span style={{ color: T.cyan }}>3層</span> の掛け算
      </FrameTitle>

      {/* Concentric boxes */}
      <div style={layerBox(620, T.cyanDim, L1.op, L1.sc)}>
        <div style={{
          fontFamily: T.mono, fontSize: 20, color: T.cyan, letterSpacing: '0.22em',
          position: 'absolute', top: 20, left: 28,
        }}>HARNESS</div>
        <div style={{
          fontFamily: T.sans, fontSize: 16, color: T.fgDim, position: 'absolute', top: 50, left: 28,
        }}>maxIterations · retry · fallback · validate · cost</div>
      </div>

      <div style={layerBox(470, T.cyan, L2.op, L2.sc)}>
        <div style={{
          fontFamily: T.mono, fontSize: 20, color: T.cyan, letterSpacing: '0.22em',
          position: 'absolute', top: 20, left: 28,
        }}>CONTEXT</div>
        <div style={{
          fontFamily: T.sans, fontSize: 16, color: T.fgDim, position: 'absolute', top: 50, left: 28,
        }}>messages · RAG · summary · token budget</div>
      </div>

      <div style={layerBox(320, T.cyan, L3.op, L3.sc)} >
        <div style={{
          fontFamily: T.mono, fontSize: 20, color: T.cyan, letterSpacing: '0.22em',
          position: 'absolute', top: 20, left: 28,
        }}>PROMPT</div>
        <div style={{
          fontFamily: T.sans, fontSize: 16, color: T.fgDim, position: 'absolute', top: 50, left: 28,
        }}>system · tool desc · few-shot</div>
      </div>

      {/* LLM core */}
      <div style={{
        position: 'absolute', left: cx - 70, top: cy - 70, width: 140, height: 140,
        borderRadius: 70, background: T.cyan,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: Lc.op, transform: `scale(${Lc.sc})`,
        boxShadow: `0 0 60px ${T.cyan}`,
      }}>
        <span style={{
          fontFamily: T.sans, fontSize: 36, fontWeight: 700, color: T.bg, letterSpacing: '0.02em',
        }}>LLM</span>
      </div>

      {/* Tagline — placed OUTSIDE/below the Harness box (Harness bottom y=865) */}
      <div style={{
        position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.sans, fontSize: 26, color: T.fgDim,
        opacity: tagOp, textAlign: 'center', letterSpacing: '0.01em', maxWidth: 1300,
        padding: '14px 32px',
        background: T.cardBg2,
        border: `1px solid ${T.borderDim}`,
        borderRadius: 6,
      }}>
        3層は <span style={{ color: T.cyan }}>独立</span> だが <span style={{ color: T.cyan }}>補完的</span> ── 不具合が起きたら、まず層を切り分ける。
      </div>
    </div>
  );
}

// ── Scene 12: Closing ───────────────────────────────────────────────────────
function Scene12_Closing() {
  const { localTime, duration } = useSprite();

  // line 1
  const l1Op = animate({ from: 0, to: 1, start: 0.4, end: 1.2, ease: Easing.easeOutCubic })(localTime);
  const l1Y = animate({ from: 30, to: 0, start: 0.4, end: 1.2, ease: Easing.easeOutCubic })(localTime);
  // accent reveal
  const accentReveal = animate({ from: 0, to: 1, start: 1.4, end: 2.4, ease: Easing.easeOutCubic })(localTime);
  // line 2
  const l2Op = animate({ from: 0, to: 1, start: 2.6, end: 3.4, ease: Easing.easeOutCubic })(localTime);
  const l2Y = animate({ from: 30, to: 0, start: 2.6, end: 3.4, ease: Easing.easeOutCubic })(localTime);
  // accent 2
  const accent2 = animate({ from: 0, to: 1, start: 3.4, end: 4.2, ease: Easing.easeOutCubic })(localTime);
  // bottom line
  const sigOp = animate({ from: 0, to: 1, start: 4.6, end: 5.4 })(localTime);

  return (
    <div style={{ position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: T.sans, fontSize: 72, fontWeight: 500, color: T.fg, lineHeight: 1.4,
        opacity: l1Op, transform: `translateY(${l1Y}px)`, letterSpacing: '-0.005em',
      }}>
        AIエージェントは、
      </div>
      <div style={{
        fontFamily: T.sans, fontSize: 96, fontWeight: 700, color: T.fg, lineHeight: 1.3,
        opacity: l1Op, transform: `translateY(${l1Y}px)`, letterSpacing: '-0.01em',
        marginTop: 8, marginBottom: 56, whiteSpace: 'nowrap',
      }}>
        <span style={{
          backgroundImage: `linear-gradient(90deg, ${T.cyan} 0%, ${T.cyan} 100%)`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${accentReveal * 100}% 100%`,
          backgroundPosition: '0 100%',
          paddingBottom: 8,
          paddingLeft: 12, paddingRight: 12,
        }}>かなり単純な部品の組み合わせ</span><br />でできている。
      </div>

      <div style={{
        height: 1, width: 140, background: T.cyanDim,
        opacity: animate({ from: 0, to: 1, start: 2.2, end: 2.6 })(localTime),
        marginBottom: 56,
      }}></div>

      <div style={{
        fontFamily: T.sans, fontSize: 64, fontWeight: 600, color: T.fg, lineHeight: 1.3,
        opacity: l2Op, transform: `translateY(${l2Y}px)`,
      }}>
        仕組みがわかれば、<br />
        AIプロダクトの<span style={{
          color: T.cyan,
          opacity: 0.4 + accent2 * 0.6,
        }}>見方が変わる</span>。
      </div>

      <div style={{
        position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.mono, fontSize: 22, color: T.fgFaint, letterSpacing: '0.18em',
        opacity: sigOp,
        display: 'flex', gap: 24, alignItems: 'center',
      }}>
        <span>p1uscode</span>
        <span style={{ color: T.fgMuted }}>·</span>
        <span style={{ color: T.cyan }}>FIN</span>
        <span style={{ color: T.fgMuted }}>·</span>
        <span>p1us2er0 / 2026.05</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  Scene07_ToolCalling, Scene08_AgentLoop, Scene09_8020,
  Scene10_SevenElements, Scene11_ThreeLayers, Scene12_Closing,
});
