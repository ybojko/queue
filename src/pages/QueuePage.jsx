import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday, isTomorrow, isBefore, startOfDay } from 'date-fns';
import {
  fetchEntriesForQueuePage,
  fetchNumbersForDate,
  insertEntry,
  updateStatusWithSession,
} from '../lib/queueApi';
import { getOrCreateSessionId } from '../lib/session';
import { validateTelegramTag, validateRoom } from '../lib/validation';
import './QueuePage.css';

const FLOORS = [4, 6];
const STATUS_LABELS = {
  waiting: 'Очікую',
  in_progress: 'В процесі',
  finished: 'Закінчив',
  skipped: 'Забив Хуй',
};

/** Можна записуватись тільки на сьогодні, а на завтра — лише після 22:00 */
function canSignUpForDate(date) {
  const now = new Date();
  const target = startOfDay(date);

  if (isBefore(target, startOfDay(now))) return { allowed: false, reason: 'past' };
  if (isToday(date)) return { allowed: true };
  if (isTomorrow(date)) {
    const hours = now.getHours();
    const mins = now.getMinutes();
    const nowMins = hours * 60 + mins;
    const cutoffMins = 22 * 60;
    return nowMins >= cutoffMins
      ? { allowed: true }
      : { allowed: false, reason: 'tomorrow_locked' };
  }
  return { allowed: false, reason: 'future' };
}

function QueueDaySection({ title, entries, sessionId, onUpdateStatus }) {
  return (
    <div className="queue-day-section">
      <h3 className="queue-day-title">{title}</h3>
      <div className="table-wrapper">
        <table className="queue-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Телеграм тег</th>
              <th>Кімната</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  Немає записів
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isMine = entry.session_id === sessionId;
                return (
                  <tr key={entry.id} className={isMine ? 'my-entry' : ''}>
                    <td>{entry.number}</td>
                    <td>@{entry.telegram_tag}</td>
                    <td>{entry.room}</td>
                    <td>
                      {isMine ? (
                        <select
                          value={entry.status}
                          onChange={(e) => onUpdateStatus(entry, e.target.value)}
                          className={`status-select status-${entry.status}`}
                        >
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`status-badge status-${entry.status}`}>
                          {STATUS_LABELS[entry.status]}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Групує записи по датах: сьогодні, вчора, позавчора. У кожній групі — найновіші вгорі */
function groupEntriesByDate(entries, today, yesterday, dayBefore) {
  const toStr = (d) => format(d, 'yyyy-MM-dd');
  const todayStr = toStr(today);
  const yesterdayStr = toStr(yesterday);
  const dayBeforeStr = toStr(dayBefore);

  const byDate = { [todayStr]: [], [yesterdayStr]: [], [dayBeforeStr]: [] };
  for (const e of entries) {
    if (byDate[e.queue_date]) byDate[e.queue_date].push(e);
  }
  for (const key of Object.keys(byDate)) {
    byDate[key].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return { today: byDate[todayStr], yesterday: byDate[yesterdayStr], dayBefore: byDate[dayBeforeStr] };
}

export default function QueuePage() {
  const [selectedFloor, setSelectedFloor] = useState(4);
  const [entriesByDate, setEntriesByDate] = useState({ today: [], yesterday: [], dayBefore: [] });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ telegram_tag: '', room: '' });
  const [formError, setFormError] = useState(null);
  const [addTargetDate, setAddTargetDate] = useState(new Date()); // сьогодні або завтра

  const sessionId = getOrCreateSessionId();
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const dayBefore = subDays(today, 2);

  const canAddToday = canSignUpForDate(today).allowed;
  const canAddTomorrow = canSignUpForDate(addDays(today, 1)).allowed;
  const targetDateForAdd = canAddToday && canAddTomorrow ? addTargetDate : today;
  const signUpStatus = format(targetDateForAdd, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? { allowed: canAddToday } : { allowed: canAddTomorrow };

  async function fetchEntries() {
    setLoading(true);
    const dateStrs = [format(today, 'yyyy-MM-dd'), format(yesterday, 'yyyy-MM-dd'), format(dayBefore, 'yyyy-MM-dd')];

    const { data, error } = await fetchEntriesForQueuePage(dateStrs, selectedFloor);

    if (error) {
      console.error('Помилка завантаження:', error);
      setEntriesByDate({ today: [], yesterday: [], dayBefore: [] });
    } else {
      setEntriesByDate(groupEntriesByDate(data || [], today, yesterday, dayBefore));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEntries();
  }, [selectedFloor]);

  async function handleAdd(e) {
    e.preventDefault();
    setFormError(null);
    if (!signUpStatus.allowed) return;

    const tagResult = validateTelegramTag(formData.telegram_tag);
    const roomResult = validateRoom(formData.room);

    if (!tagResult.valid || !roomResult.valid) {
      setFormError(tagResult.error || roomResult.error);
      return;
    }

    const dateStr = format(targetDateForAdd, 'yyyy-MM-dd');
    const { data: numbersData } = await fetchNumbersForDate(dateStr, selectedFloor);
    const relevantEntries = numbersData || [];
    const nextNumber = relevantEntries.length > 0 ? Math.max(...relevantEntries.map((e) => e.number)) + 1 : 1;

    const { error } = await insertEntry({
      telegram_tag: tagResult.value,
      room: roomResult.value,
      status: 'waiting',
      floor: selectedFloor,
      queue_date: dateStr,
      number: nextNumber,
      session_id: sessionId,
    });

    if (error) {
      alert('Помилка: ' + error.message);
    } else {
      setFormData({ telegram_tag: '', room: '' });
      setFormError(null);
      fetchEntries();
    }
  }

  async function handleUpdateStatus(entry, newStatus) {
    const { error } = await updateStatusWithSession(entry.id, newStatus, sessionId);

    if (error) {
      alert('Помилка: ' + error.message);
    } else {
      fetchEntries();
    }
  }

  return (
    <div className="queue-page">
      <header className="queue-header">
        <h1>
          <span className="title-icon">🧺</span> Черга прання
        </h1>
      </header>

      <section className="add-section">
        <h2>Додати себе в чергу</h2>
        {signUpStatus.allowed ? (
          <form onSubmit={handleAdd} className="add-form">
            {canAddToday && canAddTomorrow && (
              <div className="add-date-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${format(targetDateForAdd, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? 'active' : ''}`}
                  onClick={() => setAddTargetDate(today)}
                >
                  Сьогодні
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${format(targetDateForAdd, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd') ? 'active' : ''}`}
                  onClick={() => setAddTargetDate(addDays(today, 1))}
                >
                  Завтра
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="Телеграм тег (з @ або без)"
              value={formData.telegram_tag}
              onChange={(e) => {
                setFormData((f) => ({ ...f, telegram_tag: e.target.value }));
                setFormError(null);
              }}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Кімната (1–1050)"
              value={formData.room}
              onChange={(e) => {
                setFormData((f) => ({ ...f, room: e.target.value }));
                setFormError(null);
              }}
            />
            {formError && <p className="form-error">{formError}</p>}
            <button type="submit">Додати</button>
          </form>
        ) : (
          <p className="add-disabled">
            {signUpStatus.reason === 'past' &&
              'Запис на минулі дати заборонено.'}
            {signUpStatus.reason === 'tomorrow_locked' &&
              'Запис на завтра відкривається о 22:00.'}
            {signUpStatus.reason === 'future' &&
              'Можна записуватись лише на сьогодні та завтра (після 22:00).'}
          </p>
        )}
      </section>

      <section className="floor-section">
        <h2>Поверх</h2>
        <div className="floor-buttons">
          {FLOORS.map((floor) => (
            <button
              key={floor}
              className={`floor-btn ${selectedFloor === floor ? 'active' : ''}`}
              onClick={() => setSelectedFloor(floor)}
            >
              {floor} поверх
            </button>
          ))}
        </div>
      </section>

      <section className="table-section">
        <h2>Черга ({selectedFloor} поверх)</h2>
        {loading ? (
          <p className="loading">Завантаження...</p>
        ) : (
          <div className="queue-sections">
            <QueueDaySection
              title="Сьогодні"
              entries={entriesByDate.today}
              sessionId={sessionId}
              onUpdateStatus={handleUpdateStatus}
            />
            <QueueDaySection
              title="Вчора"
              entries={entriesByDate.yesterday}
              sessionId={sessionId}
              onUpdateStatus={handleUpdateStatus}
            />
            <QueueDaySection
              title="Позавчора"
              entries={entriesByDate.dayBefore}
              sessionId={sessionId}
              onUpdateStatus={handleUpdateStatus}
            />
          </div>
        )}
      </section>
    </div>
  );
}
