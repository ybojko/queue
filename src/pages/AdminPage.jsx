import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import './AdminPage.css';

const FLOORS = [4, 6];
const STATUS_OPTIONS = [
  { value: 'waiting', label: 'Очікую' },
  { value: 'in_progress', label: 'В процесі' },
  { value: 'finished', label: 'Закінчив' },
];

export default function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedFloor, setSelectedFloor] = useState(4);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    telegram_tag: '',
    room: '',
    status: 'waiting',
  });
  const [editingId, setEditingId] = useState(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchEntries();
  }, [dateStr, selectedFloor]);

  async function fetchEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_date', dateStr)
      .eq('floor', selectedFloor)
      .order('number', { ascending: true });

    if (error) {
      console.error('Помилка:', error);
      setEntries([]);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!formData.telegram_tag.trim() || !formData.room.trim()) return;

    const nextNumber =
      entries.length > 0 ? Math.max(...entries.map((e) => e.number)) + 1 : 1;

    const { error } = await supabase.from('queue_entries').insert({
      telegram_tag: formData.telegram_tag.trim(),
      room: formData.room.trim(),
      status: formData.status,
      floor: selectedFloor,
      queue_date: dateStr,
      number: nextNumber,
    });

    if (error) {
      alert('Помилка: ' + error.message);
    } else {
      setFormData({ telegram_tag: '', room: '', status: 'waiting' });
      fetchEntries();
    }
  }

  async function handleUpdateStatus(entry, newStatus) {
    const { error } = await supabase
      .from('queue_entries')
      .update({ status: newStatus })
      .eq('id', entry.id);

    if (error) {
      alert('Помилка: ' + error.message);
    } else {
      setEditingId(null);
      fetchEntries();
    }
  }

  async function handleDelete(id) {
    if (!confirm('Видалити запис?')) return;

    const { error } = await supabase.from('queue_entries').delete().eq('id', id);

    if (error) {
      alert('Помилка: ' + error.message);
    } else {
      fetchEntries();
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Адмін-панель</h1>
        <a href="/" className="back-link">
          ← На головну
        </a>
      </header>

      <section className="filters-section">
        <div className="filter-row">
          <label>
            <span>Дата</span>
            <div className="date-nav">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => subDays(d, 1))}
              >
                ←
              </button>
              <span>{format(selectedDate, 'd MMM yyyy', { locale: uk })}</span>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
              >
                →
              </button>
            </div>
          </label>
          <label>
            <span>Поверх</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
            >
              {FLOORS.map((f) => (
                <option key={f} value={f}>
                  {f} поверх
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="add-section">
        <h2>Додати в чергу</h2>
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
            onChange={(e) =>
              setFormData((f) => ({ ...f, room: e.target.value }))
            }
            required
          />
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((f) => ({ ...f, status: e.target.value }))
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit">Додати</button>
        </form>
      </section>

      <section className="entries-section">
        <h2>Записи</h2>
        {loading ? (
          <p className="loading">Завантаження...</p>
        ) : (
          <div className="entries-table-wrapper">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Телеграм</th>
                  <th>Кімната</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.number}</td>
                    <td>@{entry.telegram_tag}</td>
                    <td>{entry.room}</td>
                    <td>
                      {editingId === entry.id ? (
                        <select
                          autoFocus
                          value={entry.status}
                          onChange={(e) =>
                            handleUpdateStatus(entry, e.target.value)
                          }
                          onBlur={() => setEditingId(null)}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="status-link"
                          onClick={() => setEditingId(entry.id)}
                        >
                          {STATUS_OPTIONS.find((o) => o.value === entry.status)
                            ?.label}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Видалити
                      </button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      Немає записів
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
