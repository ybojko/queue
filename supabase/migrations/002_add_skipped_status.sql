-- Додати статус "Забив Хуй" (skipped)
-- Виконай у Supabase SQL Editor якщо таблиця вже створена

ALTER TABLE queue_entries
DROP CONSTRAINT IF EXISTS queue_entries_status_check;

ALTER TABLE queue_entries
ADD CONSTRAINT queue_entries_status_check
CHECK (status IN ('waiting', 'in_progress', 'finished', 'skipped'));
