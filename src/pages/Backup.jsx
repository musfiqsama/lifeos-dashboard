import { useRef } from 'react';
import Header from '../components/Header.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import { starterState } from '../data/storage.js';

export default function Backup({ api }) {
  const inputRef = useRef(null);
  const itemCount = Object.values(api.data).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(api.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    api.activity?.('Backup exported');
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      api.replaceAll(parsed);
      alert('Backup imported successfully.');
    } catch {
      alert('Invalid backup file.');
    }
    e.target.value = '';
  };

  const resetAll = () => {
    if (confirm('Reset all LifeOS data? This cannot be undone.')) api.replaceAll(starterState);
  };

  return (
    <>
      <Header title="Backup & Restore" subtitle="Export your LifeOS data, import it later or reset everything safely." />
      <section className="statsGrid three">
        <StatCard label="Total Records" value={itemCount} note="saved locally" />
        <StatCard label="Storage" value="Local" note="browser localStorage" tone="green" />
        <StatCard label="Backup Type" value="JSON" note="portable data file" tone="purple" />
      </section>
      <section className="twoCol">
        <Card>
          <h3>Export Data</h3>
          <p>Download a JSON backup of academics, tasks, goals, habits, notes and Phase 2 data.</p>
          <button className="primaryBtn" onClick={exportData}>Export Backup</button>
        </Card>
        <Card>
          <h3>Import / Reset</h3>
          <p>Restore from a previous LifeOS backup or clear all local data.</p>
          <div className="timerButtons">
            <button className="ghostBtn" onClick={() => inputRef.current?.click()}>Import Backup</button>
            <button className="dangerBtn" onClick={resetAll}>Reset All</button>
          </div>
          <input ref={inputRef} className="hiddenInput" type="file" accept="application/json" onChange={importData} />
        </Card>
      </section>
    </>
  );
}
