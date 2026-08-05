import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import LogoMark from './LogoMark.jsx';
import { navigationLabel, navigationSections } from './navigation.js';

function updatePreferences(api, patch) {
  api.setData((previous) => {
    const current = previous.uiPreferences?.[0] || {};
    return {
      ...previous,
      uiPreferences: [{ ...current, ...patch, id: 'ui-preferences' }],
    };
  });
}

export default function Sidebar({ page, setPage, api }) {
  const preferences = api.data.uiPreferences?.[0] || {};
  const collapsed = Boolean(preferences.sidebarCollapsed);
  const language = preferences.language || 'en';
  const resolvedDark = preferences.theme === 'dark' || (preferences.theme === 'system' && globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebarCollapsed' : ''}`} aria-label="Primary navigation">
      <div className="brand">
        <LogoMark />
        <div className="brandCopy">
          <h1>LifeOS</h1>
          <p>Student workspace</p>
        </div>
        <button
          className="sidebarCollapseBtn"
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => updatePreferences(api, { sidebarCollapsed: !collapsed })}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="navList">
        {navigationSections.map((section) => (
          <section className="navSection" key={section.id}>
            <p className="navSectionLabel">{navigationLabel(section, language)}</p>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={collapsed ? navigationLabel(item, language) : undefined}
                  onClick={() => setPage(item.id)}
                  className={`navItem ${page === item.id ? 'active' : ''}`}
                  aria-current={page === item.id ? 'page' : undefined}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>{navigationLabel(item, language)}</span>
                </button>
              );
            })}
          </section>
        ))}
      </nav>

      <div className="sidebarFooter">
        <button
          type="button"
          className="sidebarThemeButton"
          onClick={() => updatePreferences(api, { theme: resolvedDark ? 'light' : 'dark' })}
          aria-label={`Switch to ${resolvedDark ? 'light' : 'dark'} theme`}
        >
          {resolvedDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{language === 'bn' ? (resolvedDark ? 'লাইট থিম' : 'ডার্ক থিম') : (resolvedDark ? 'Light theme' : 'Dark theme')}</span>
        </button>
        <div className="sidebarProfile">
          <div className="profileAvatar">{String(preferences.displayName || 'S').trim().charAt(0).toUpperCase()}</div>
          <div>
            <strong>{preferences.displayName || 'Student'}</strong>
            <span>{preferences.department || 'LifeOS workspace'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
