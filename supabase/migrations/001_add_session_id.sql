-- Додати колонку session_id для прив'язки записів до сесії користувача
-- Виконай у Supabase SQL Editor якщо таблиця вже створена

ALTER TABLE queue_entries 
ADD COLUMN IF NOT EXISTS session_id TEXT;
