import { useRef } from 'react';
import Header from '../components/Header.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import { Field } from '../components/Crud.jsx';
import { createBackupPayload, parseBackupPayload, starterState } from '../data/storage.js';
import { todayLocalISO } from '../utils/date.js';

export default function Backup({ api }) {
  const inputRef = useRef(null);
  const itemCount = Object.values(api.data).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
  const preferences = api.data.uiPreferences?.[0] || {};

  const updatePreferences = (patch) => {
    api.setData((previous) => {
      const current = previous.uiPreferences?.[0] || {};
      return {
        ...previous,
        uiPreferences: [{ ...current, ...patch, id: 'ui-preferences' }],
      };
    });
  };

  const exportData = () => {
    try {
      const payload = createBackupPayload(api.data);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lifeos-backup-${todayLocalISO()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      api.activity?.('Backup exported');
      api.notify('Your LifeOS backup was downloaded.', 'success', 'Backup ready');
    } catch (error) {
      api.notify(error instanceof Error ? error.message : 'Backup export failed.', 'error', 'Export failed');
    }
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Backup file is larger than the 5 MB safety limit.');
      const text = await file.text();
      const next = parseBackupPayload(JSON.parse(text));
      api.replaceAll(next);
      api.notify('Backup imported successfully.', 'success', 'LifeOS restored');
    } catch (error) {
      api.notify(error instanceof Error ? error.message : 'Invalid backup file.', 'error', 'Import failed');
    } finally {
      event.target.value = '';
    }
  };

  const resetAll = async () => {
    const accepted = await api.confirm({
      title: 'Reset all LifeOS data?',
      message: 'This removes every locally saved course, task, goal, habit, note, resource, log, exam and activity. Export a backup first if you may need the data later.',
      confirmLabel: 'Reset everything',
      danger: true,
    });
    if (!accepted) return;
    api.replaceAll(starterState);
    api.notify('All local LifeOS data was reset.', 'success', 'Clean start ready');
  };

  return (
    <>
      <Header title="Settings & Data" subtitle="Personalize your workspace, manage appearance and keep your local data portable." />
      <section className="statsGrid three">
        <StatCard label="Total Records" value={itemCount} note="saved locally" />
        <StatCard label="Appearance" value={String(preferences.theme || 'system').replace(/^./, (value) => value.toUpperCase())} note={`${preferences.density || 'comfortable'} density`} tone="purple" />
        <StatCard label="Backup Type" value="JSON" note="validated portable file" tone="green" />
      </section>

      <section className="twoCol settingsLayout">
        <Card>
          <div className="cardHead"><div><h3>Profile details</h3><p>Used in your workspace identity and printable reports.</p></div></div>
          <div className="formGrid">
            <Field label="Display name"><input value={preferences.displayName || ''} onChange={(event) => updatePreferences({ displayName: event.target.value })} placeholder="Your name" /></Field>
            <Field label="Student ID"><input value={preferences.studentId || ''} onChange={(event) => updatePreferences({ studentId: event.target.value })} placeholder="e.g. 23524202000" /></Field>
            <Field label="University" full><input value={preferences.university || ''} onChange={(event) => updatePreferences({ university: event.target.value })} placeholder="University name" /></Field>
            <Field label="Department"><input value={preferences.department || ''} onChange={(event) => updatePreferences({ department: event.target.value })} placeholder="Department" /></Field>
            <Field label="Week starts on">
              <select value={preferences.weekStartsOn || 'Saturday'} onChange={(event) => updatePreferences({ weekStartsOn: event.target.value })}>
                <option>Saturday</option><option>Sunday</option><option>Monday</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <div className="cardHead"><div><h3>Appearance</h3><p>Choose a theme and spacing that feels comfortable.</p></div></div>
          <div className="formGrid">
            <Field label="Theme">
              <select value={preferences.theme || 'system'} onChange={(event) => updatePreferences({ theme: event.target.value })}>
                <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
              </select>
            </Field>
            <Field label="Density">
              <select value={preferences.density || 'comfortable'} onChange={(event) => updatePreferences({ density: event.target.value })}>
                <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
              </select>
            </Field>
            <Field label="Interface language">
              <select value={preferences.language || 'en'} onChange={(event) => updatePreferences({ language: event.target.value })}>
                <option value="en">English</option><option value="bn">বাংলা foundation</option>
              </select>
            </Field>
            <Field label="Date format">
              <select value={preferences.dateFormat || 'DD/MM/YYYY'} onChange={(event) => updatePreferences({ dateFormat: event.target.value })}>
                <option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option>
              </select>
            </Field>
            <label className="settingToggle fieldFull">
              <input type="checkbox" checked={Boolean(preferences.reduceMotion)} onChange={(event) => updatePreferences({ reduceMotion: event.target.checked })} />
              <span><strong>Reduce motion</strong><small>Minimize transitions and animated movement.</small></span>
            </label>
          </div>
        </Card>
      </section>

      <section className="twoCol">
        <Card>
          <h3>Export data</h3>
          <p>Download a versioned JSON backup of your academics, tasks, goals, habits, notes, resources and productivity data.</p>
          <button className="primaryBtn" type="button" onClick={exportData}>Export Backup</button>
        </Card>
        <Card>
          <h3>Import or reset</h3>
          <p>Restore a current or legacy LifeOS backup. Invalid or oversized files are rejected before your data changes.</p>
          <div className="timerButtons">
            <button className="ghostBtn" type="button" onClick={() => inputRef.current?.click()}>Import Backup</button>
            <button className="dangerBtn" type="button" onClick={resetAll}>Reset All</button>
          </div>
          <input ref={inputRef} className="hiddenInput" type="file" accept="application/json,.json" onChange={importData} />
        </Card>
      </section>
    </>
  );
}
