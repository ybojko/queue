import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { uk } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { getOrCreateSessionId } from '../lib/session';
import './QueuePage.css';

const FLOORS = [4, 6];
const STATUS_LABELS = {
  waiting: 'Очікую',
  in_progress: 'В процесі',
  finished: 'Закінчив',
};

export default function QueuePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedFloor, setSelectedFloor] = useState(4);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ telegram_tag: '', room: '' });

  const sessionId = getOrCreateSessionId();
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  async function fetchEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_date', dateStr)
      .eq('floor', selectedFloor)
      .order('number', { ascending: true });

    if (error) {
      console.error('Помилка завантаження:', error);
      setEntries([]);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchEntries();
  }, [dateStr, selectedFloor]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!formData.telegram_tag.trim() || !formData.room.trim()) return;

    const nextNumber =
      entries.length > 0 ? Math.max(...entries.map((e) => e.number)) + 1 : 1;

    const { error } = await supabase.from('queue_entries').insert({
      telegram_tag: formData.telegram_tag.trim(),
      room: formData.room.trim(),
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
      fetchEntries();
    }
  }

  async function handleUpdateStatus(entry, newStatus) {
    const { error } = await supabase
      .from('queue_entries')
      .update({ status: newStatus })
      .eq('id', entry.id)
      .eq('session_id', sessionId);

    if (error) {
      alert('Помилка: ' + error.message);
    } else {
      fetchEntries();
    }
  }

  return (
    <div className="queue-page">
      <header className="queue-header">
        <h1>Черга прання</h1>
      </header>

      <section className="calendar-section">
        <h2>Календар</h2>
        <div className="date-nav">
          <button
            className="nav-btn"
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
          >
            ← Попередній
          </button>
          <span className="current-date">
            {format(selectedDate, 'd MMMM yyyy', { locale: uk })}
            {isToday(selectedDate) && ' (сьогодні)'}
          </span>
          <button
            className="nav-btn"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
          >
            Наступний →
          </button>
        </div>
      </section>

      <section className="add-section">
        <h2>Додати себе в чергу</h2>
        <form onSubmit={handleAdd} className="add-form">
          <input
            type="text"
            placeholder="Телеграм тег (без @)"
            value={formData.telegram_tag}
            onChange={(e) =>
              setFormData((f) => ({ ...f, telegram_tag: e.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="Кімната"
            value={formData.room}
            onChange={(e) => setFormData((f) => ({ ...f, room: e.target.value }))}
            required
          />
          <button type="submit">Додати</button>
        </form>
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
                      Немає записів на цей день
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const isMine = entry.session_id === sessionId;
                    return (
                      <tr
                        key={entry.id}
                        className={isMine ? 'my-entry' : ''}
                      >
                        <td>{entry.number}</td>
                        <td>@{entry.telegram_tag}</td>
                        <td>{entry.room}</td>
                        <td>
                          {isMine ? (
                            <select
                              value={entry.status}
                              onChange={(e) =>
                                handleUpdateStatus(entry, e.target.value)
                              }
                              className={`status-select status-${entry.status}`}
                            >
                              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`status-badge status-${entry.status}`}
                            >
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
        )}
      </section>
    </div>
  );
}
