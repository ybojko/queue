-- Схема бази даних для черги прання
-- Виконай цей SQL у Supabase Dashboard: SQL Editor

-- Таблиця записів у черзі
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL DEFAULT 1,
  telegram_tag TEXT NOT NULL,
  room TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  floor INTEGER NOT NULL CHECK (floor IN (4, 6)),
  queue_date DATE NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_queue_date_floor ON queue_entries(queue_date, floor);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status);

-- Дозволити всі операції через anon key (публічний доступ для простоти)
-- У реальному проєкті краще налаштувати RLS policies
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;

-- Політика: дозволити читати всім
CREATE POLICY "Allow public read" ON queue_entries
  FOR SELECT USING (true);

-- Політика: дозволити вставляти всім (для додавання в чергу)
CREATE POLICY "Allow public insert" ON queue_entries
  FOR INSERT WITH CHECK (true);

-- Політика: дозволити оновлювати всім (для зміни статусу)
CREATE POLICY "Allow public update" ON queue_entries
  FOR UPDATE USING (true);

-- Політика: дозволити видаляти всім (для адмінки)
CREATE POLICY "Allow public delete" ON queue_entries
  FOR DELETE USING (true);
