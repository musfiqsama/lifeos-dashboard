import { useEffect, useMemo, useRef } from 'react';
import Header from '../components/Header.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import { evaluateAchievements } from '../utils/analytics.js';
import { uid } from '../data/storage.js';

export default function Achievements({ api }) {
  const records = api.data.achievementRecords || [];
  const badges = useMemo(() => evaluateAchievements(api.data, records), [api.data, records]);
  const pendingUnlocks = badges.filter((badge) => badge.unlocked && !records.some((item) => item.achievementId === badge.id));
  const pendingKey = pendingUnlocks.map((item) => item.id).join('|');
  const processedUnlocks = useRef('');

  useEffect(() => {
    if (!pendingUnlocks.length || processedUnlocks.current === pendingKey) return;
    processedUnlocks.current = pendingKey;
    const unlockedAt = new Date().toISOString();
    api.update('achievementRecords', [...records, ...pendingUnlocks.map((badge) => ({ id: uid(), achievementId: badge.id, unlockedAt }))]);
    api.notify(`${pendingUnlocks.length} achievement${pendingUnlocks.length === 1 ? '' : 's'} unlocked.`, 'success', 'Achievement update');
  // pendingKey deliberately represents only newly unlocked badge ids.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  const hydrated = evaluateAchievements(api.data, api.data.achievementRecords || []);
  const unlocked = hydrated.filter((item) => item.unlocked);
  const locked = hydrated.filter((item) => !item.unlocked);
  const next = [...locked].sort((a, b) => b.progress - a.progress)[0];
  const latest = [...unlocked].filter((item) => item.unlockedAt).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))[0];

  return (
    <>
      <Header title="Achievement System 2.0" subtitle="Rules-based badges with visible requirements, progress and unlock history." />
      <section className="statsGrid four">
        <StatCard label="Unlocked" value={`${unlocked.length}/${hydrated.length}`} note="achievement collection" />
        <StatCard label="Completion" value={`${Math.round((unlocked.length / hydrated.length) * 100)}%`} note="overall badge progress" tone="green" />
        <StatCard label="Latest Unlock" value={latest?.title || 'None'} note={latest?.unlockedAt ? new Date(latest.unlockedAt).toLocaleDateString() : 'Keep building progress'} tone="purple" />
        <StatCard label="Next Badge" value={next ? `${next.progress}%` : 'Done'} note={next?.title || 'All achievements unlocked'} tone="orange" />
      </section>

      {next ? <Card className="nextAchievement"><div><p className="eyebrow">Recommended next badge</p><h3>{next.title}</h3><p>{next.description}</p></div><div className="achievementProgress"><div><i style={{ width: `${next.progress}%` }}/></div><strong>{next.current} / {next.target} {next.unit}</strong></div></Card> : null}

      <Card>
        <div className="badgeGrid achievementGridV2">
          {hydrated.map((badge) => <article className={`badgeCard ${badge.unlocked ? 'unlocked' : ''}`} key={badge.id}>
            <div className="badgeIcon">{badge.unlocked ? '✓' : '○'}</div>
            <div className="badgeStatus"><span>{badge.unlocked ? 'Unlocked' : 'Locked'}</span>{badge.unlockedAt ? <small>{new Date(badge.unlockedAt).toLocaleDateString()}</small> : null}</div>
            <h4>{badge.title}</h4>
            <p>{badge.description}</p>
            <div className="achievementProgress"><div><i style={{ width: `${badge.progress}%` }}/></div><strong>{badge.current} / {badge.target} {badge.unit}</strong></div>
          </article>)}
        </div>
      </Card>
    </>
  );
}
