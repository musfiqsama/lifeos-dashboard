import { Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import LogoMark from './LogoMark.jsx';
import { navigationLabel, navigationSections, primaryMobileItems } from './navigation.js';

function updatePreferences(api, patch) {
  api.setData((previous) => {
    const current = previous.uiPreferences?.[0] || {};
    return {
      ...previous,
      uiPreferences: [{ ...current, ...patch, id: 'ui-preferences' }],
    };
  });
}

export default function MobileNavigation({ page, setPage, api }) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef(null);
  const preferences = api.data.uiPreferences?.[0] || {};
  const language = preferences.language || 'en';
  const resolvedDark = preferences.theme === 'dark' || (preferences.theme === 'system' && globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setOpen(false);
  }, [page]);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const sheet = sheetRef.current;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => [...(sheet?.querySelectorAll(selector) || [])];
    window.requestAnimationFrame(() => focusables()[0]?.focus());
    document.body.classList.add('mobileNavOpen');

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('mobileNavOpen');
      previousFocus?.focus?.();
    };
  }, [open]);

  return (
    <>
      <nav className="mobileBottomNav" aria-label="Mobile navigation">
        {primaryMobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              className={page === item.id ? 'active' : ''}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{navigationLabel(item, language).replace(' Mode', '')}</span>
            </button>
          );
        })}
        <button type="button" className={open ? 'active' : ''} onClick={() => setOpen(true)} aria-expanded={open}>
          <Menu size={20} aria-hidden="true" />
          <span>{language === 'bn' ? 'আরও' : 'More'}</span>
        </button>
      </nav>

      {open ? (
        <div className="mobileNavBackdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section ref={sheetRef} className="mobileNavSheet" role="dialog" aria-modal="true" aria-label="All LifeOS sections">
            <div className="mobileNavHeader">
              <div className="landingBrand">
                <LogoMark />
                <div><h2>LifeOS</h2><p>Navigate your workspace</p></div>
              </div>
              <button type="button" className="iconBtn" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20} /></button>
            </div>
            <div className="mobileNavGroups">
              {navigationSections.map((section) => (
                <section key={section.id}>
                  <p className="navSectionLabel">{navigationLabel(section, language)}</p>
                  <div className="mobileNavGrid">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button type="button" key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
                          <Icon size={19} />
                          <span>{navigationLabel(item, language)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <button
              type="button"
              className="mobileThemeToggle"
              onClick={() => updatePreferences(api, { theme: resolvedDark ? 'light' : 'dark' })}
            >
              {resolvedDark ? <Sun size={19} /> : <Moon size={19} />}
              {language === 'bn' ? `${resolvedDark ? 'লাইট' : 'ডার্ক'} থিমে যান` : `Switch to ${resolvedDark ? 'light' : 'dark'} theme`}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
