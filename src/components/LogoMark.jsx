export default function LogoMark({ className = '' }) {
  return (
    <div className={`logoMark ${className}`} aria-label="LifeOS logo">
      <svg viewBox="0 0 64 64" role="img">
        <path className="logoStem" d="M32 50V25" />
        <path className="logoLeaf logoLeafLeft" d="M31 33C19 34 12 27 11 15c12 1 20 7 20 18Z" />
        <path className="logoLeaf logoLeafRight" d="M34 29c2-12 10-19 22-19-1 13-8 21-22 19Z" />
        <path className="logoRing" d="M17 49c7 6 22 6 30 0" />
      </svg>
    </div>
  );
}
