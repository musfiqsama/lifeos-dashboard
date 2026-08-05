import { BarChart3, CalendarCheck2, CheckSquare, GraduationCap, Moon, Sparkles, Sun } from 'lucide-react';
import LogoMark from '../components/LogoMark.jsx';

export default function Home({ setPage, api }) {
  const preferences = api.data.uiPreferences?.[0] || {};
  const resolvedDark = preferences.theme === 'dark' || (preferences.theme === 'system' && globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const updateTheme = () => api.setData((previous) => ({
    ...previous,
    uiPreferences: [{ ...preferences, id: 'ui-preferences', theme: resolvedDark ? 'light' : 'dark' }],
  }));

  return (
    <main className="landingPage">
      <nav className="landingNav">
        <div className="landingBrand">
          <LogoMark className="landingLogo" />
          <div>
            <h1>LifeOS</h1>
            <p>Academic productivity, beautifully organized.</p>
          </div>
        </div>
        <div className="landingNavActions">
          <button className="landingThemeBtn" type="button" onClick={updateTheme} aria-label={`Switch to ${resolvedDark ? 'light' : 'dark'} theme`}>
            {resolvedDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="landingNavBtn" type="button" onClick={() => setPage('dashboard')}>Open workspace</button>
        </div>
      </nav>

      <section className="landingHero">
        <div className="heroBadge"><Sparkles size={14} /> LifeOS 2.0 · Student command center</div>
        <h2>Bring your whole university life into focus.</h2>
        <p>Academics, attendance, planning, study sessions, notes and analytics—one calm workspace designed to help you move forward every day.</p>
        <div className="landingButtons">
          <button className="primaryLanding" type="button" onClick={() => setPage('dashboard')}>Enter LifeOS</button>
          <button className="secondaryLanding" type="button" onClick={() => setPage('academic')}>Explore academics</button>
        </div>

        <div className="landingFeatureStrip" aria-label="LifeOS highlights">
          <div><GraduationCap /><strong>Academic</strong><span>CGPA, semesters and targets</span></div>
          <div><CalendarCheck2 /><strong>Attendance</strong><span>Course health and warnings</span></div>
          <div><CheckSquare /><strong>Planning</strong><span>Tasks, goals and exams</span></div>
          <div><BarChart3 /><strong>Insights</strong><span>Transparent progress analytics</span></div>
        </div>
      </section>

      <footer className="landingFooter">Designed for focused students · Made by Sama</footer>
    </main>
  );
}
