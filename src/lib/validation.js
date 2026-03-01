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
 * Валідує номер кімнати в гуртожитку (поверхи 2-10).
 * Поверхи 2-9: X01-X06, X09-X24, X29-X35 (X = поверх)
 * Поверх 10: 1001-1006, 1009-1017
 */
export function validateRoom(input) {
  const raw = String(input ?? '').trim();
  const num = parseInt(raw, 10);

  if (raw === '' || isNaN(num))
    return { valid: false, value: raw, error: 'Введіть номер кімнати' };

  // Визначаємо дійсні діапазони для всіх поверхів
  const validRanges = [];

  // Поверхи 2-9
  for (let floor = 2; floor <= 9; floor++) {
    const base = floor * 100;
    validRanges.push({ min: base + 1, max: base + 6 });
    validRanges.push({ min: base + 9, max: base + 24 });
    validRanges.push({ min: base + 29, max: base + 35 });
  }

  // Поверх 10
  validRanges.push({ min: 1001, max: 1006 });
  validRanges.push({ min: 1009, max: 1017 });

  // Перевіряємо, чи номер входить в один з дійсних діапазонів
  const isValid = validRanges.some((range) => num >= range.min && num <= range.max);

  if (!isValid) {
    return { valid: false, value: raw, error: 'Потрібен дійсний номер кімнати' };
  }

  return { valid: true, value: String(num), error: null };
}
