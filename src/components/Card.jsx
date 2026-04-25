export function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function StatCard({ label, value, note, tone = 'blue' }) {
  return (
    <div className={`statCard ${tone}`}>
      <p>{label}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="emptyState">
      <div className="emptyIcon">＋</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
