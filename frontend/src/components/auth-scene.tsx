export function AuthScene() {
  return (
    <aside className="auth-scene" aria-hidden="true">
      <svg className="auth-workflow" viewBox="0 0 700 600" fill="none">
        <path className="auth-workflow-track" d="M160 110C270 110 230 65 350 65S440 135 520 135S620 190 590 240S430 220 365 230S245 280 180 280" />
        <path className="auth-workflow-flow" d="M160 110C270 110 230 65 350 65S440 135 520 135S620 190 590 240S430 220 365 230S245 280 180 280" />
        <circle className="auth-workflow-node" cx="295" cy="70" r="5" />
        <circle className="auth-workflow-node" cx="465" cy="121" r="5" />
      </svg>
      <div className="auth-team-layer" />
      <span className="auth-motif auth-note-yellow" />
      <span className="auth-motif auth-note-purple" />
      <span className="auth-motif auth-note-cyan" />
      <span className="auth-motif auth-calendar" />
      <span className="auth-motif auth-check" />
      <span className="auth-motif auth-flag" />
    </aside>
  );
}
