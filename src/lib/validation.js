/**
 * Нормалізує й валідує телеграм тег.
 * Приймає з @ або без. Повертає { valid, value, error }.
 * Telegram: 5-32 символи, тільки a-z, 0-9, підкреслення.
 */
export function validateTelegramTag(input) {
  const raw = String(input ?? '').trim();
  const value = raw.startsWith('@') ? raw.slice(1) : raw;

  if (!value) return { valid: false, value: '', error: 'Введіть телеграм тег' };

  if (value.length < 5)
    return { valid: false, value, error: 'Тег має бути від 5 символів' };
  if (value.length > 32)
    return { valid: false, value, error: 'Тег має бути до 32 символів' };

  if (!/^[a-zA-Z0-9_]+$/.test(value))
    return { valid: false, value, error: 'Тільки латинські літери, цифри та _' };

  return { valid: true, value: value.toLowerCase(), error: null };
}

/**
 * Валідує номер кімнати: 1–1050.
 */
export function validateRoom(input) {
  const raw = String(input ?? '').trim();
  const num = parseInt(raw, 10);

  if (raw === '' || isNaN(num))
    return { valid: false, value: raw, error: 'Введіть номер кімнати' };
  if (num < 1 || num > 1050)
    return { valid: false, value: raw, error: 'Номер кімнати: від 1 до 1050' };

  return { valid: true, value: String(num), error: null };
}
