// Main digest app — composes all 12 scenes into a single Stage timeline

const SCENES = [
  { start: 0,   end: 5.0,  Comp: Scene01_Title },
  { start: 5.0, end: 10.5, Comp: Scene02_Agenda },
  { start: 10.5, end: 14.5, Comp: Scene03_Question },
  { start: 14.5, end: 23.5, Comp: Scene04_SixQuestions },
  { start: 23.5, end: 28.5, Comp: Scene05_LLMLimit },
  { start: 28.5, end: 38.5, Comp: Scene06_Stateless },
  { start: 38.5, end: 45.5, Comp: Scene07_ToolCalling },
  { start: 45.5, end: 56.5, Comp: Scene08_AgentLoop },
  { start: 56.5, end: 63.0, Comp: Scene09_8020 },
  { start: 63.0, end: 69.0, Comp: Scene10_SevenElements },
  { start: 69.0, end: 75.0, Comp: Scene11_ThreeLayers },
  { start: 75.0, end: 83.0, Comp: Scene12_Closing },
];

const TOTAL_DURATION = 83;

// Scene-progress overlay — small bar at the top of the canvas
function SceneProgressOverlay() {
  const time = useTime();
  const currentScene = SCENES.findIndex(s => time >= s.start && time < s.end);
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 4,
      display: 'flex', gap: 2, pointerEvents: 'none', zIndex: 10,
    }}>
      {SCENES.map((s, i) => {
        const dur = s.end - s.start;
        const localProg = i < currentScene ? 1
          : i > currentScene ? 0
          : clamp((time - s.start) / dur, 0, 1);
        return (
          <div key={i} style={{
            flex: dur, height: 4,
            background: 'rgba(255,255,255,0.06)', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              width: `${localProg * 100}%`,
              background: 'oklch(0.78 0.14 180)',
            }}></div>
          </div>
        );
      })}
    </div>
  );
}

// Timestamp data-screen-label updater
function TimestampTagger() {
  const time = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-anim-root]');
    if (!root) return;
    const sec = Math.floor(time);
    const sceneIdx = SCENES.findIndex(s => time >= s.start && time < s.end);
    const sceneName = sceneIdx >= 0 ? `S${String(sceneIdx + 1).padStart(2, '0')}` : '—';
    root.setAttribute('data-screen-label', `${sceneName} · t=${sec}s`);
  }, [Math.floor(time)]);
  return null;
}

function App() {
  return (
    <div data-anim-root style={{ position: 'absolute', inset: 0 }}>
      <Stage width={1920} height={1080} duration={TOTAL_DURATION}
             background={T.bg} persistKey="digest-anim">
        <TimestampTagger />
        <SceneProgressOverlay />
        {SCENES.map((s, i) => (
          <Sprite key={i} start={s.start} end={s.end}>
            <s.Comp />
          </Sprite>
        ))}
      </Stage>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
