import LogoMark from '../components/LogoMark';
export default function Home({ setPage }) {
  return (
    <main className="landingPage">
      <nav className="landingNav">
        <div className="landingBrand">
          <LogoMark className="landingLogo" />
          <div>
            <h1>LifeOS</h1>
            <p>Student Dashboard</p>
          </div>
        </div>
        <button className="landingNavBtn" onClick={() => setPage('dashboard')}>Open Dashboard</button>
      </nav>

      <section className="landingHero">
        <h2>Organize your student life in one clean workspace.</h2>
        <div className="landingButtons">
          <button className="primaryLanding" onClick={() => setPage('dashboard')}>Start Planning</button>
          <button className="secondaryLanding" onClick={() => setPage('academic')}>Open Academic</button>
        </div>

      </section>

      <footer className="landingFooter">Made by Sama</footer>
    </main>
  );
}
