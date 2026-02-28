/**
 * Абстракція для зберігання черги.
 * Використовує Supabase якщо налаштовано, інакше — localStorage.
 */

import { supabase as supabaseClient } from './supabase';

const STORAGE_KEY = 'queue_entries';

function getSupabase() {
  return supabaseClient;
}

function getLocalEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId() {
  return crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// --- API

/** Отримати записи для головної (3 дати, один поверх, по created_at desc) */
export async function fetchEntriesForQueuePage(dates, floor) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .in('queue_date', dates)
      .eq('floor', floor)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  }

  const all = getLocalEntries();
  const filtered = all.filter(
    (e) => e.floor === floor && dates.includes(e.queue_date)
  );
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { data: filtered, error: null };
}

/** Отримати записи для адмінки (1 дата, 1 поверх, по number asc) */
export async function fetchEntriesForAdminPage(date, floor) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_date', date)
      .eq('floor', floor)
      .order('number', { ascending: true });
    return { data: data || [], error };
  }

  const all = getLocalEntries();
  const filtered = all.filter(
    (e) => e.floor === floor && e.queue_date === date
  );
  filtered.sort((a, b) => a.number - b.number);
  return { data: filtered, error: null };
}

/** Отримати number для дати/поверху (для розрахунку nextNumber) */
export async function fetchNumbersForDate(date, floor) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('number')
      .eq('queue_date', date)
      .eq('floor', floor);
    return { data: data || [], error };
  }

  const all = getLocalEntries();
  const filtered = all.filter(
    (e) => e.floor === floor && e.queue_date === date
  );
  return { data: filtered.map((e) => ({ number: e.number })), error: null };
}

/** Додати запис */
export async function insertEntry(entry) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { error } = await supabase.from('queue_entries').insert(entry);
    return { error };
  }

  const all = getLocalEntries();
  const newEntry = {
    ...entry,
    id: entry.id || generateId(),
    created_at: entry.created_at || new Date().toISOString(),
  };
  all.push(newEntry);
  setLocalEntries(all);
  return { error: null };
}

/** Оновити статус (з перевіркою session_id — тільки свої записи) */
export async function updateStatusWithSession(id, status, sessionId) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { error } = await supabase
      .from('queue_entries')
      .update({ status })
      .eq('id', id)
      .eq('session_id', sessionId);
    return { error };
  }

  const all = getLocalEntries();
  const idx = all.findIndex((e) => e.id === id && e.session_id === sessionId);
  if (idx === -1) return { error: { message: 'Запис не знайдено' } };
  all[idx].status = status;
  setLocalEntries(all);
  return { error: null };
}

/** Оновити статус (без перевірки — адмінка) */
export async function updateStatus(id, status) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { error } = await supabase
      .from('queue_entries')
      .update({ status })
      .eq('id', id);
    return { error };
  }

  const all = getLocalEntries();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return { error: { message: 'Запис не знайдено' } };
  all[idx].status = status;
  setLocalEntries(all);
  return { error: null };
}

/** Видалити запис */
export async function deleteEntry(id) {
  const supabase = getSupabase();
  if (supabase != null) {
    const { error } = await supabase.from('queue_entries').delete().eq('id', id);
    return { error };
  }

  const all = getLocalEntries().filter((e) => e.id !== id);
  setLocalEntries(all);
  return { error: null };
}
