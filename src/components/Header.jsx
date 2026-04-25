export default function Header({ title, subtitle }) {
  return (
    <div className="pageHeader">
      <div>
        <p className="eyebrow">LifeOS Student Dashboard</p>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}
