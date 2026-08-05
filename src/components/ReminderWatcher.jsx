import { useEffect, useRef } from 'react';
import { buildReminderCandidates, defaultNotificationSettings, dueReminderCandidates, upsertReminderHistory } from '../utils/reminders.js';

export default function ReminderWatcher({ api }) {
  const processing = useRef(false);
  const apiRef = useRef(api);

  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  useEffect(() => {
    let releaseTimer = null;
    const check = () => {
      const currentApi = apiRef.current;
      if (!currentApi || processing.current) return;
      const settings = currentApi.data.notificationSettings?.[0] || defaultNotificationSettings;
      if (!settings.inAppEnabled && !settings.browserEnabled) return;
      const now = new Date();
      const candidates = buildReminderCandidates(currentApi.data, now, settings);
      const due = dueReminderCandidates(candidates, currentApi.data.reminderHistory || [], now, settings).slice(0, 3);
      if (!due.length) return;
      processing.current = true;
      let history = currentApi.data.reminderHistory || [];
      for (const reminder of due) {
        if (settings.inAppEnabled) currentApi.notify(`${reminder.title} · ${reminder.date}${reminder.startTime ? ` at ${reminder.startTime}` : ''}`, 'info', 'Upcoming reminder');
        if (settings.browserEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(reminder.title, { body: `${reminder.type} · ${reminder.date}${reminder.startTime ? ` at ${reminder.startTime}` : ''}`, tag: reminder.key });
          } catch {
            // Browser notifications are optional; the in-app reminder still works.
          }
        }
        history = upsertReminderHistory(history, reminder.key, { notifiedAt: now.toISOString(), snoozedUntil: '', dismissedAt: '' });
      }
      currentApi.update('reminderHistory', history.slice(-250));
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => { processing.current = false; }, 1000);
    };

    check();
    const interval = window.setInterval(check, 30000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(releaseTimer);
      processing.current = false;
    };
  }, []);

  return null;
}
